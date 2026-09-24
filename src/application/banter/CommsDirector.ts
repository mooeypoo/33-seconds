import type { DomainEvent } from '../../domain/shared/events';
import { createRandomStream, type RandomStream } from '../../domain/shared/random';
import type { GameView } from '../../domain/views';
import { Banter, banterSeed, type BanterContext, type CommsLine } from './Banter';
import { BanterCues, type Cue, type CueSnapshot } from './cues';
import { BANTER_LINES } from './lines';
import { ScenePlayer } from './recoveringScene';

/**
 * Everything that decides what the comms strip says (ADR-0002 D4): the line pools, the Recovering
 * scene, cues noticed from the fight, and the "who are you talking to" remark. The session tells
 * it about frames that ran; it never reads the clock itself, so pause freezes it (PRD 12.2).
 *
 * It has its own random stream, derived from the run seed, so picking a joke never changes the
 * fight (ADR-0001 D3).
 */
/** How many past lines the log keeps (PRD 12.2). */
export const COMMS_LOG_LINES = 20;

export class CommsDirector {
  private banter: Banter;
  private readonly scene = new ScenePlayer();
  private random: RandomStream;
  private readonly cues = new BanterCues();
  private sixRemarkOwed = false;
  private sixWasPresent = false;
  /** Lines shown since the last jump, oldest first (PRD 12.2). */
  private readonly history: CommsLine[] = [];

  constructor(runSeed: number) {
    this.random = createRandomStream(banterSeed(runSeed));
    this.banter = new Banter(this.random, BANTER_LINES);
  }

  /** The one line on the strip, or null. The Recovering line takes the strip while it plays. */
  get line(): CommsLine | null {
    return this.scene.active ? this.scene.line : this.banter.line;
  }

  /** This cycle's lines, oldest first, at most `COMMS_LOG_LINES`. Empties at each jump (PRD 12.2). */
  get log(): readonly CommsLine[] {
    return this.history;
  }

  /** A new run: fresh pools, no scene, no owed remarks. */
  reset(runSeed: number): void {
    this.random = createRandomStream(banterSeed(runSeed));
    this.banter = new Banter(this.random, BANTER_LINES);
    this.scene.stop();
    this.sixRemarkOwed = false;
    this.sixWasPresent = false;
    this.cues.reset();
    this.history.length = 0;
  }

  /**
   * Apply and Continue end Recovering (PRD 5.1): the scene stops if it is still speaking, and any
   * line waiting under it goes too. That line was about the hand just closed (advice on a card),
   * so letting it surface in the next cycle would talk about cards that are no longer there.
   */
  endRecovering(): void {
    this.scene.stop();
    this.banter.silence();
  }

  /**
   * Notes one running frame. Returns true when the session should tell its listeners: the strip
   * changed, or Recovering began.
   */
  noteFrame(events: readonly DomainEvent[], view: GameView, deltaSeconds: number): boolean {
    const before = commsKey(this.line);
    const ships = view.fleet.ships;
    // ASSUMPTION: Dualla's "ready" count is healthy civilian hulls. There is no separate FTL checklist yet.
    const context: BanterContext = {
      secondsRemaining: view.cycle.secondsRemaining,
      hull: view.viper.hp,
      spoolPercent: Math.round(view.cycle.spoolProgress * 100),
      readyShips: ships.filter((ship) => ship.healthy).length,
      shipTotal: ships.length,
      offeredCardIds: view.upgradeOffer?.cardIds ?? [],
    };

    // The jump is a clean break: nothing from the fight carries into the pick screen or its log.
    const jumped = events.some((event) => event.type === 'CyclePhaseChanged' && event.phase === 'jumping');
    if (jumped) {
      this.banter.silence();
      this.history.length = 0;
    }
    const enteredRecovering = events.some((event) => event.type === 'CyclePhaseChanged' && event.phase === 'recovering');
    if (enteredRecovering) this.scene.start(view.recoveryBand, this.random);

    // Between cycles the Recovering line is the only one (PRD 12.3): no fight cues, no card or reroll lines.
    const betweenCycles = view.cycle.phase === 'jumping' || view.cycle.phase === 'recovering';
    if (!betweenCycles) {
      this.banter.observe(events, context);
      this.playCues(events, view, context, deltaSeconds);
    }
    this.banter.advance(deltaSeconds);
    this.scene.advance(deltaSeconds);
    // The arriving line is in next frame's events. Let it speak before anyone asks about Six.
    if (!betweenCycles) this.maybeMentionSix(view, context);
    const line = this.line;
    const changed = commsKey(line) !== before;
    if (changed && line !== null) {
      this.history.push(line);
      if (this.history.length > COMMS_LOG_LINES) this.history.shift();
    }
    return enteredRecovering || jumped || changed;
  }

  /**
   * Derived lines. Only the one still on the strip is accepted, so a louder line in the same
   * frame does not eat a quieter moment.
   */
  private playCues(events: readonly DomainEvent[], view: GameView, context: BanterContext, deltaSeconds: number): void {
    let spoken: Cue | null = null;
    for (const cue of this.cues.note(events, cueSnapshot(view), deltaSeconds)) {
      const heard =
        cue.shipPercent === undefined
          ? this.banter.mention(cue.trigger, context)
          : this.banter.mention(cue.trigger, { ...context, shipPercent: cue.shipPercent });
      if (heard) spoken = cue;
    }
    if (spoken) this.cues.accept(spoken);
  }

  /**
   * Someone asks who the pilot is talking to, once each time Six appears. Flavor, so it waits
   * for a quiet strip and stays silent at 1 hull.
   */
  private maybeMentionSix(view: GameView, context: BanterContext): void {
    const present = view.imaginarySix !== null;
    if (present && !this.sixWasPresent) this.sixRemarkOwed = true;
    if (!present) this.sixRemarkOwed = false;
    this.sixWasPresent = present;
    if (!this.sixRemarkOwed || this.banter.line !== null) return;
    if (this.banter.mention('ImaginarySixActive', context)) this.sixRemarkOwed = false;
  }
}

function cueSnapshot(view: GameView): CueSnapshot {
  const ship = view.resurrectionShip;
  return {
    phase: view.cycle.phase,
    secondsRemaining: view.cycle.secondsRemaining,
    hull: view.viper.hp,
    viperX: view.viper.x,
    viperY: view.viper.y,
    shots: view.projectiles.map((shot) => ({
      id: shot.id,
      x: shot.x,
      y: shot.y,
      previousX: shot.previousX,
      previousY: shot.previousY,
      owner: shot.owner,
    })),
    shipHp: ship !== null && !ship.destroyed ? ship.hp : null,
    shipHpMax: ship?.hpMax ?? null,
  };
}

function commsKey(line: CommsLine | null): string {
  if (line === null) return '';
  return `${line.speakerName}|${line.partnerName ?? ''}|${line.text}`;
}
