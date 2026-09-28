#!/usr/bin/env node
/**
 * Breaks things on purpose, one at a time, and checks that something fails.
 *
 * Two kinds of sabotage:
 *  - guardrail violations, which the boundary check and the domain lint bans must catch;
 *  - behaviour changes, which the engine tests must catch (AGENTS.md: if a test still passes when
 *    you break the code, it protects nothing).
 *
 * Run it by hand after touching the guardrails or the engine tests: `node scripts/prove-guardrails.mjs`.
 * Every file is restored afterwards, including when a command throws.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

/**
 * The content validators alone. Any edit to a balance file also trips the version fingerprint, so
 * a sabotage there must prove the validator, not the reminder.
 */
const CONTENT_WITHOUT_FINGERPRINT = 'npx vitest run --config vitest.content.config.ts tests/content/content.check.ts';

const SABOTAGE = [
  {
    what: 'domain imports Phaser',
    file: 'src/domain/game.ts',
    find: "import { Viper, VIPER_HALF_HEIGHT_UNITS } from './combat/viper';",
    replace: "import Phaser from 'phaser';\nimport { Viper, VIPER_HALF_HEIGHT_UNITS } from './combat/viper';",
    mustFail: 'npm run check:arch',
  },
  {
    what: 'domain calls Math.random',
    file: 'src/domain/combat/viper.ts',
    find: '    const direction = clampIntentDirection(moveX, moveY);',
    replace: '    const direction = clampIntentDirection(moveX + Math.random(), moveY);',
    mustFail: 'npm run lint',
  },
  {
    what: 'domain reads the wall clock',
    file: 'src/domain/game.ts',
    find: '    this.ticks += 1;',
    replace: '    this.ticks += 1;\n    if (Date.now() > 0) this.ticks += 0;',
    mustFail: 'npm run lint',
  },
  {
    what: 'domain uses a timer',
    file: 'src/domain/game.ts',
    find: '    this.ticks += 1;',
    replace: '    this.ticks += 1;\n    setTimeout(() => {}, 1);',
    mustFail: 'npm run lint',
  },
  {
    what: 'presentation reaches into infrastructure',
    file: 'src/presentation/stores/hudStore.ts',
    find: "import { reactive } from 'vue';",
    replace: "import { reactive } from 'vue';\nimport '../../infrastructure/input/autoPause';",
    mustFail: 'npm run check:arch',
  },
  {
    what: 'the Viper is no longer kept inside the play area',
    file: 'src/domain/combat/viper.ts',
    find: '    this.clampIntoWorld(sizeScale);',
    replace: '    // sabotage: no clamp',
    mustFail: 'npm run test',
  },
  {
    what: 'hitting an edge keeps its momentum',
    file: 'src/domain/combat/viper.ts',
    find: '      this.velocityX = 0;',
    replace: '      // sabotage: momentum survives the wall',
    mustFail: 'npm run test',
  },
  {
    what: 'top speed is not respected for odd input',
    file: 'src/domain/shared/intent.ts',
    find: '  if (magnitude <= 1) return { x, y };',
    replace: '  return { x, y };',
    mustFail: 'npm run test',
  },
  {
    what: 'the drag stick loses its dead zone',
    file: 'src/infrastructure/input/PointerStickInput.ts',
    find: '  if (distance <= DEAD_ZONE_PX) return { x: 0, y: 0, strength: 0 };',
    replace: '  // sabotage: every touch steers, however still the thumb is',
    mustFail: 'npm run test',
  },
  {
    what: 'dragging past the ring keeps asking for more speed',
    file: 'src/infrastructure/input/PointerStickInput.ts',
    find: '  const strength = Math.min((distance - DEAD_ZONE_PX) / (MAX_RADIUS_PX - DEAD_ZONE_PX), 1);',
    replace: '  const strength = (distance - DEAD_ZONE_PX) / (MAX_RADIUS_PX - DEAD_ZONE_PX);',
    mustFail: 'npm run test',
  },
  {
    what: 'auto-fire ignores its cooldown',
    file: 'src/domain/game.ts',
    find: '    if (this.fireCooldownSeconds > 0) return;',
    replace: '    // sabotage: shoot every tick',
    mustFail: 'npm run test',
  },
  {
    what: 'a shot that leaps a Raider misses it',
    file: 'src/domain/shared/collision.ts',
    find: '  return movingCircleHitAlong(startX, startY, endX, endY, movingRadius, stillX, stillY, stillRadius) !== null;',
    replace: '  return circlesOverlap(endX, endY, movingRadius, stillX, stillY, stillRadius);',
    mustFail: 'npm run test',
  },
  {
    what: 'hits no longer destroy a Raider',
    file: 'src/domain/swarm/raider.ts',
    find: '    this.hitPoints = Math.max(0, this.hitPoints - damage);',
    replace: '    // sabotage: the Raider is immortal',
    mustFail: 'npm run test',
  },
  {
    what: 'the Raider hitbox shrinks back to a near-miss',
    file: 'src/domain/swarm/raider.ts',
    find: 'export const RAIDER_RADIUS_UNITS = 10;',
    replace: 'export const RAIDER_RADIUS_UNITS = 5;',
    mustFail: 'npm run test',
  },
  {
    what: 'the Raider hitbox grows past its wingtips',
    file: 'src/domain/swarm/raider.ts',
    find: 'export const RAIDER_RADIUS_UNITS = 10;',
    replace: 'export const RAIDER_RADIUS_UNITS = 12;',
    mustFail: 'npm run test',
  },
  {
    what: 'Cylon hits no longer dent the hull',
    file: 'src/domain/combat/viper.ts',
    find: '    this.hull -= 1;',
    replace: '    // sabotage: the hull is decorative',
    mustFail: 'npm run test',
  },
  {
    what: 'an ejected Viper keeps shooting',
    file: 'src/domain/game.ts',
    find: '    if (!this.viperFires || !this.viper.canFight) return;',
    replace: '    if (!this.viperFires) return;',
    mustFail: 'npm run test',
  },
  {
    what: 'a destroyed Raider comes back without downloading',
    file: 'src/domain/swarm/resurrection.ts',
    find: '    this.remainingSeconds -= tickSeconds;',
    replace: '    this.remainingSeconds -= tickSeconds * 100;',
    mustFail: 'npm run test',
  },
  {
    what: 'Returned spawn protection does not apply',
    file: 'src/domain/swarm/raider.ts',
    find: '    return this.protectionRemainingSeconds > 0;',
    replace: '    return false;',
    mustFail: 'npm run test',
  },
  {
    what: 'the Director cap no longer holds',
    file: 'src/domain/swarm/resurrection.ts',
    find: 'export const DIRECTOR_CAP = 2;',
    replace: 'export const DIRECTOR_CAP = 8;',
    mustFail: 'npm run test',
  },
  {
    what: 'every Raider gets an attack token',
    file: 'src/domain/swarm/resurrection.ts',
    find: 'export const ATTACK_TOKENS = 1;',
    replace: 'export const ATTACK_TOKENS = 8;',
    mustFail: 'npm run test',
  },
  {
    what: 'every Raider dives the fleet',
    file: 'src/domain/swarm/resurrection.ts',
    find: 'export const STRAFE_TOKENS = 1;',
    replace: 'export const STRAFE_TOKENS = 8;',
    mustFail: 'npm run test',
  },
  {
    what: 'strays no longer dent the fleet',
    file: 'src/domain/fleet/integrity.ts',
    find: '    this.integrity -= room;',
    replace: '    // sabotage: the fleet is decorative',
    mustFail: 'npm run test',
  },
  {
    what: 'the per-cycle fleet cap no longer holds',
    file: 'src/domain/fleet/integrity.ts',
    find: 'export const FLEET_CYCLE_DAMAGE_CAP = 35;',
    replace: 'export const FLEET_CYCLE_DAMAGE_CAP = 1000;',
    mustFail: 'npm run test',
  },
  {
    what: 'the civilian line is no longer ten hulls',
    file: 'src/domain/fleet/integrity.ts',
    find: 'export const CIVILIAN_SHIP_COUNT = 10;',
    replace: 'export const CIVILIAN_SHIP_COUNT = 2;',
    mustFail: 'npm run test',
  },
  {
    what: 'the 33-second cycle never jumps',
    file: 'src/domain/cycle/jumpCycle.ts',
    find: '    if (this.combatElapsedTicks >= this.combatTicks) {',
    replace: '    if (this.combatElapsedTicks >= this.combatTicks * 10) {',
    mustFail: 'npm run test',
  },
  {
    what: 'Recovering advances without Continue',
    file: 'src/domain/cycle/jumpCycle.ts',
    find: '    if (this.phase === \'recovering\') return null;',
    replace: '    if (this.phase === \'recovering\') return this.continueFromJump();',
    mustFail: 'npm run test',
  },
    {
      what: 'a destroyed resurrection ship still queues downloads',
      file: 'src/domain/swarm/Swarm.ts',
      find: '    if (loopOn && !heavy) {\n      this.queue.push(new Download(raider.identityId, raider.deaths + 1, raider.x, raider.y, downloadSeconds));\n    }',
      replace: '    if (!heavy) {\n      this.queue.push(new Download(raider.identityId, raider.deaths + 1, raider.x, raider.y, downloadSeconds));\n    }',
      mustFail: 'npm run test',
    },
    {
      what: 'the run wins while Raiders are still in the sky',
      file: 'src/domain/game.ts',
      find: '    if (!this.swarm.isClear) return;',
      replace: '    // sabotage: a dead ship is enough, even with a last wave',
      mustFail: 'npm run test',
    },
    {
      what: 'a shielded resurrection ship still takes hits',
      file: 'src/domain/swarm/resurrectionShip.ts',
      find: '    if (this.hull <= 0 || this.shielded) return false;',
      replace: '    if (this.hull <= 0) return false;',
      mustFail: 'npm run test',
    },
    {
      what: 'the resurrection ship stays glued in place',
      file: 'src/domain/game.ts',
      find: '    this.resurrectionShip?.advance(TICK_SECONDS, this.station);',
      replace: '    // sabotage: the ship is a sticker',
      mustFail: 'npm run test',
    },
    {
      what: 'the fleet can die without ending the run',
      file: 'src/domain/game.ts',
      find: '    if (this.fleet.view.integrity > 0) return;',
      replace: '    // sabotage: a zero pool is decorative',
      mustFail: 'npm run test',
    },
    {
      what: 'an empty missile rack still fires',
      file: 'src/domain/combat/viper.ts',
      find: '    if (this.missiles <= 0) return false;',
      replace: '    // sabotage: the rack is a decoration',
      mustFail: 'npm run test',
    },
    {
      what: 'missile lock prefers the farthest hostile',
      file: 'src/domain/combat/targeting.ts',
      find: '    if (distance < bestDistance || (distance === bestDistance && candidate.id < (best?.id ?? Infinity))) {',
      replace: '    if (distance > bestDistance || (distance === bestDistance && candidate.id < (best?.id ?? Infinity))) {',
      mustFail: 'npm run test',
    },
    {
      what: 'raiders keep flying during The Speech',
      file: 'src/domain/swarm/Swarm.ts',
      find: '    if (holding) {\n      for (const raider of this.bodies) raider.holdStation();\n      return;\n    }',
      replace: '    // sabotage: the speech is only a caption',
      mustFail: 'npm run test',
    },
    {
      what: 'The Speech never starts',
      file: 'src/domain/combat/speech.ts',
      find: '    this.remainingSeconds = SPEECH_DURATION_SECONDS;',
      replace: '    // sabotage: tryStart lies',
      mustFail: 'npm run test',
    },
    {
      what: 'a Recovering pick does not stack',
      file: 'src/domain/progression/loadout.ts',
      find: '    this.stacks.set(id, next);',
      replace: '    // sabotage: the table is decorative',
      mustFail: 'npm run test',
    },
    {
      what: 'Ask Baltar Again is free forever',
      file: 'src/domain/progression/loadout.ts',
      find: '    this.offered = drawOffer(rng, this.stacks, this.offered, unavailable);\n    this.rerollAvailable = false;',
      replace: '    this.offered = drawOffer(rng, this.stacks, this.offered, unavailable);\n    this.rerollAvailable = true;',
      mustFail: 'npm run test',
    },
    {
      what: 'the Water Filter still mends after a cycle at the cap, so a tier can become unloseable',
      file: 'src/domain/progression/loadout.ts',
      find: "WATER_FILTER_REPAIR_PER_STACK * this.stacksOf('water-filter') * calm);",
      replace: "WATER_FILTER_REPAIR_PER_STACK * this.stacksOf('water-filter'));",
      mustFail: 'npm run test',
    },
    {
      what: "Gaius' Lab is dealt after the shield would drop anyway",
      file: 'src/domain/progression/loadout.ts',
      find: '(stacks.get(card.id) ?? 0) < maxStacksFor(card.rarity) && !unavailable.includes(card.id),',
      replace: '(stacks.get(card.id) ?? 0) < maxStacksFor(card.rarity),',
      mustFail: 'npm run test',
    },
    {
      what: 'Spoilers does not delay a ghost',
      file: 'src/domain/swarm/resurrection.ts',
      find: '    this.remainingSeconds += seconds;',
      replace: '    // sabotage: a shot on a blip is flavour',
      mustFail: 'npm run test',
    },
    {
      what: 'Flak Enthusiast never intercepts a stray',
      file: 'src/domain/combat/hits.ts',
      find: '    if (chance > 0 && field.scenario.next() < chance) {\n      events.push({ type: \'FlakIntercepted\', x, y: FLEET_LINE_Y_UNITS });\n      continue;\n    }',
      replace: '      // sabotage: Galactica is decorative',
      mustFail: 'npm run test',
    },
    {
      what: 'hangar bays never cycle',
      file: 'src/domain/swarm/resurrectionShip.ts',
      find: '    this.bayElapsedSeconds += tickSeconds;',
      replace: '    // sabotage: the doors are painted on',
      mustFail: 'npm run test',
    },
    {
      what: 'Hangar Door Slam does not add damage',
      file: 'src/domain/progression/loadout.ts',
      find: '    return base * (1 + HANGAR_SLAM_DAMAGE_PER_STACK * this.stacksOf(\'hangar-door-slam\'));',
      replace: '    return base;',
      mustFail: 'npm run test',
    },
    {
      what: 'Raptor Escort never soaks a stray',
      file: 'src/domain/fleet/raptor.ts',
      find: '    return this.isOnStation && Math.abs(this.positionX - x) <= RAPTOR_RADIUS_UNITS;',
      replace: '    return false;',
      mustFail: 'npm run test',
    },
    {
      what: 'Raptor Escort never launches',
      file: 'src/domain/game.ts',
      find: '    const count = this.loadout.raptorCount;\n    this.raptors = [];\n    for (let index = 0; index < count; index++) {\n      this.raptors.push(\n        new Raptor(index, raptorLaunchX(index, count, this.playfield.width), index % 2 === 0 ? 1 : -1, this.playfield.width),\n      );\n    }',
      replace: '    // sabotage: the escort stayed in the barn',
      mustFail: 'npm run test',
    },
    {
      what: 'Imaginary Six never appears',
      file: 'src/domain/game.ts',
      find: '    if (this.loadout.hasImaginarySix) this.six ??= new ImaginarySix(this.playfield.width);\n    else this.six = null;',
      replace: '    // sabotage: she was never there',
      mustFail: 'npm run test',
    },
    {
      what: 'Imaginary Six never fires',
      file: 'src/domain/combat/hits.ts',
      find: '  if (!six?.isPresent) return;',
      replace: '  return;',
      mustFail: 'npm run test',
    },
    {
      what: 'Viper Pilot still repairs like Civilian Run',
      file: 'src/balance/tiers.json',
      find: '"fleetRepairOfMissing": 0.4,',
      replace: '"fleetRepairOfMissing": 0.6,',
      mustFail: 'npm run test',
    },
    {
      what: 'Viper Pilot keeps the Civilian Run damage cap',
      file: 'src/balance/tiers.json',
      find: '"fleetCycleDamageCap": 45,',
      replace: '"fleetCycleDamageCap": 35,',
      mustFail: 'npm run test',
    },
    {
      what: 'a future settings envelope is trusted',
      file: 'src/application/playerSettings.ts',
      find: '  if (record.version !== PLAYER_SETTINGS_VERSION) return { ...DEFAULT_PLAYER_SETTINGS };',
      replace: '  // sabotage: any envelope is current',
      mustFail: 'npm run test',
    },
    {
      what: 'truthy junk mutes the game',
      file: 'src/application/playerSettings.ts',
      find: '    muted: record.muted === true,',
      replace: '    muted: Boolean(record.muted),',
      mustFail: 'npm run test',
    },
    {
      what: 'a critical comms line cannot replace flavor',
      file: 'src/application/banter/Banter.ts',
      find: '    if (rank > shownRank) return true;',
      replace: '    if (rank > shownRank) return false;',
      mustFail: 'npm run test',
    },
    {
      what: 'comms never pauses between lines',
      file: 'src/application/banter/Banter.ts',
      find: '    if (this.elapsedSeconds < this.quietUntilSeconds) return false;',
      replace: '    // sabotage: no gap after a line',
      mustFail: 'npm run test',
    },
    {
      what: 'flavor lines have no budget',
      file: 'src/application/banter/Banter.ts',
      find: '    return !crisis && this.flavorShownThisCycle < FLAVOR_LINES_PER_CYCLE;',
      replace: '    return !crisis;',
      mustFail: 'npm run test',
    },
    {
      what: 'the comms log keeps the last cycle after the jump',
      file: 'src/application/banter/CommsDirector.ts',
      find: '      this.history.length = 0;',
      replace: '      // sabotage: the log survives the jump',
      mustFail: 'npm run test',
    },
    {
      what: 'fight lines keep talking between cycles',
      file: 'src/application/banter/CommsDirector.ts',
      find: "    const betweenCycles = view.cycle.phase === 'jumping' || view.cycle.phase === 'recovering';",
      replace: '    const betweenCycles = false;',
      mustFail: 'npm run test',
    },
    {
      what: 'Abandon run leaves the paused run in place',
      file: 'src/application/GameSession.ts',
      find: '  abandonRun(): void {\n    if (this.phase !== \'paused\') return;',
      replace: '  abandonRun(): void {\n    return;',
      mustFail: 'npm run test',
    },
    {
      what: 'the loop catches up without a limit',
      file: 'src/application/GameSession.ts',
      find: '    const ticksToRun = Math.min(dueTicks, MAX_CATCH_UP_TICKS);',
      replace: '    const ticksToRun = dueTicks;',
      mustFail: 'npm run test',
    },
  {
    what: 'a paused session keeps ticking',
    file: 'src/application/GameSession.ts',
    find: "    if (this.phase !== 'running') return NO_FRAME;",
    replace: '    // sabotage: pause no longer stops the loop',
    mustFail: 'npm run test',
  },
  {
    what: 'pausing leaves held keys in place',
    file: 'src/application/GameSession.ts',
    find: '    // Held keys and a phantom stick must not survive the pause (PRD 13.3).\n    this.input.clear();',
    replace: '    // sabotage: held input survives the pause',
    mustFail: 'npm run test',
  },
  {
    what: 'resuming hands the domain the backlog it built up while paused',
    file: 'src/application/GameSession.ts',
    find: '        this.accumulatorSeconds = 0;',
    replace: '        this.accumulatorSeconds += 5;',
    mustFail: 'npm run test',
  },
  {
    what: 'a banter line runs past the bubble length',
    file: 'src/content/banter/gaeta.json',
    find: '"text": "Spool at {percent} percent. Course is clean."',
    replace: '"text": "Spool at {percent} percent. Course is clean, and I have a great deal more to say about it."',
    mustFail: 'npm run check:content',
  },
  {
    what: 'two banter lines share an id',
    file: 'src/content/banter/gaeta.json',
    find: '"id": "gaeta-ftl-spool-progress-02"',
    replace: '"id": "gaeta-ftl-spool-progress-01"',
    mustFail: 'npm run check:content',
  },
  {
    what: 'a banter line uses a placeholder nobody fills',
    file: 'src/content/banter/gaeta.json',
    find: '"text": "Spool at {percent} percent. Course is clean."',
    replace: '"text": "Spool at {percnt} percent. Course is clean."',
    mustFail: 'npm run check:content',
  },
  {
    what: 'a ship name overflows its console row',
    file: 'src/content/fleet.json',
    find: '"civilianNames": [',
    replace: '"civilianNames": [\n    "A name far too long for one row of the fleet console",',
    mustFail: 'npm run check:content',
  },
  {
    what: 'the balance harness reaches into the session',
    file: 'tools/sim/runSim.ts',
    find: "import { createGame } from '../../src/domain/game';",
    replace: "import { createGame } from '../../src/domain/game';\nimport '../../src/application/GameSession';",
    mustFail: 'npm run check:arch',
  },
  {
    what: 'the Director ignores its floor while downloads are pending',
    file: 'src/domain/swarm/Swarm.ts',
    find: '      if (reserved && this.raiderCount >= floor) return;',
    replace: '      if (reserved) return;',
    mustFail: 'npm run test',
  },
  {
    what: 'the resurrection ship dies without a last wave',
    file: 'src/domain/game.ts',
    find: '      this.maybeSendLastWave(events);',
    replace: '      // sabotage: no last wave',
    mustFail: 'npm run test',
  },
  {
    what: 'a heavy Raider downloads like a Raider',
    file: 'src/domain/swarm/Swarm.ts',
    find: '    if (loopOn && !heavy) {',
    replace: '    if (loopOn) {',
    mustFail: 'npm run test',
  },
  {
    what: 'a hit the Viper survives goes unreported',
    file: 'src/domain/combat/hits.ts',
    find: "    events.push({ type: 'ViperHit', x: view.x, y: view.y, hp: viper.hp });",
    replace: '    // sabotage: silent hits',
    mustFail: 'npm run test',
  },
  {
    what: 'a tier repairs more of the fleet than it lost',
    file: 'src/balance/tiers.json',
    find: '"fleetRepairOfMissing": 0.4,',
    replace: '"fleetRepairOfMissing": 1.4,',
    mustFail: CONTENT_WITHOUT_FINGERPRINT,
  },
  {
    what: 'a card loses its flair',
    file: 'src/content/upgrades.flair.json',
    find: '"id": "accidentally-wide"',
    replace: '"id": "accidentally-wider"',
    mustFail: 'npm run check:content',
  },
  {
    what: 'a heavy kill sounds like a plain one',
    file: 'src/application/audio/AudioDirector.ts',
    find: "      return event.heavy ? 'heavy_destroyed' : 'raider_destroyed';",
    replace: "      return 'raider_destroyed';",
    mustFail: 'npm run test',
  },
  {
    what: 'a kill chain ignores the repeat gap',
    file: 'src/application/audio/AudioDirector.ts',
    find: '    if (last !== undefined && this.clock - last < MIN_REPEAT_SECONDS) return;',
    replace: '    // sabotage: no gap',
    mustFail: 'npm run test',
  },
  {
    what: 'one sound stacks past its voice limit',
    file: 'src/application/audio/AudioDirector.ts',
    find: '    if (this.voices.filter((voice) => voice.id === id).length >= MAX_VOICES_PER_SOUND) return;',
    replace: '    // sabotage: unlimited copies',
    mustFail: 'npm run test',
  },
  {
    what: 'everything at once has no voice cap',
    file: 'src/application/audio/AudioDirector.ts',
    find: '    if (this.voices.length >= MAX_VOICES) return;',
    replace: '    // sabotage: no overall cap',
    mustFail: 'npm run test',
  },
  {
    what: 'sound plays before the first gesture',
    file: 'src/application/audio/AudioDirector.ts',
    find: '    if (!this.unlocked || this.muted || this.held || this.pageHidden) return;',
    replace: '    if (this.muted || this.held || this.pageHidden) return;',
    mustFail: 'npm run test',
  },
  {
    what: 'mute still plays',
    file: 'src/application/audio/AudioDirector.ts',
    find: '    if (!this.unlocked || this.muted || this.held || this.pageHidden) return;',
    replace: '    if (!this.unlocked || this.held || this.pageHidden) return;',
    mustFail: 'npm run test',
  },
  {
    what: 'a hidden tab does not suspend sound',
    file: 'src/application/audio/AudioDirector.ts',
    find: '    const suspended = this.held || this.pageHidden;',
    replace: '    const suspended = this.held;',
    mustFail: 'npm run test',
  },
  {
    what: 'the spool call repeats every frame on its second',
    file: 'src/application/audio/AudioDirector.ts',
    find: '    if (cycle.secondsRemaining === this.lastSpoolSecond) return;',
    replace: '    // sabotage: no memory of the last call',
    mustFail: 'npm run test',
  },
  {
    what: 'pause does not hold sound',
    file: 'src/application/GameSession.ts',
    find: "    this.sound.setHeld(this.phase === 'paused' || (this.phase === 'resuming' && this.pendingUpgradeId === null));",
    replace: "    this.sound.setHeld(this.phase === 'resuming' && this.pendingUpgradeId === null);",
    mustFail: 'npm run test',
  },
  {
    what: 'the 3-2-1 after Apply cuts the Apply sound',
    file: 'src/application/GameSession.ts',
    find: "    this.sound.setHeld(this.phase === 'paused' || (this.phase === 'resuming' && this.pendingUpgradeId === null));",
    replace: "    this.sound.setHeld(this.phase === 'paused' || this.phase === 'resuming');",
    mustFail: 'npm run test',
  },
  {
    what: 'a hand-edited volume out of range is trusted',
    file: 'src/application/playerSettings.ts',
    find: "  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : DEFAULT_VOLUME;",
    replace: "  return typeof value === 'number' ? value : DEFAULT_VOLUME;",
    mustFail: 'npm run test',
  },
  {
    what: 'the sound loader lets a loud array through',
    file: 'src/application/audio/soundBank.ts',
    find: '  if (volume < 0 || volume > SOUND_VOLUME_CAP) {',
    replace: '  if (volume < 0) {',
    mustFail: 'npm run test',
  },
  {
    what: 'a sound is written too loud',
    file: 'src/content/sounds.json',
    find: '"zzfx": [0.35, 0.05, 140,',
    replace: '"zzfx": [1.5, 0.05, 140,',
    mustFail: 'npm run check:content',
  },
  {
    what: 'a sound id is misspelled',
    file: 'src/content/sounds.json',
    find: '{ "id": "jump",',
    replace: '{ "id": "jupm",',
    mustFail: 'npm run check:content',
  },
  {
    what: 'the Simulate win / lose buttons ship in a production build',
    file: 'src/presentation/App.vue',
    find: "const DEV_TOOLS = import.meta.env.DEV || import.meta.env.VITE_SHOW_DEBUG === 'true';",
    replace: 'const DEV_TOOLS = true;',
    mustFail: 'npm run build',
  },
  {
    what: 'a loss gets the win bonus',
    file: 'src/domain/scoring/score.ts',
    find: '  if (facts.won) points += weights.winBonus',
    replace: '  points += weights.winBonus',
    mustFail: 'npm run test',
  },
  {
    what: 'the score can go negative',
    file: 'src/domain/scoring/score.ts',
    find: '  return Math.max(0, Math.round(points));',
    replace: '  return Math.round(points);',
    mustFail: 'npm run test',
  },
  {
    what: 'a jump repair refunds fleet damage in the score',
    file: 'src/domain/scoring/score.ts',
    find: '          this.fleetDamage += event.damage;',
    replace: '          this.fleetDamage = event.damage;',
    mustFail: 'npm run test',
  },
  {
    what: 'a returning Raider is credited as a new one',
    file: 'src/domain/scoring/score.ts',
    find: '          if (!event.heavy) this.identityOf.set(event.id, event.identityId);',
    replace: '          if (!event.heavy) this.identityOf.set(event.id, event.id);',
    mustFail: 'npm run test',
  },
  {
    what: 'a new run keeps the last run\'s tally',
    file: 'src/application/GameSession.ts',
    find: '    this.tally = new RunTally();\n    this.result = null;',
    replace: '    this.result = null;',
    mustFail: 'npm run test',
  },
  {
    what: 'a share link accepts more stacks than the card has',
    file: 'src/application/shareCode.ts',
    find: '    held.push({ id, stacks: whole(stacks, 1, maxStacksFor(cardDefinition(id).rarity)) });',
    replace: '    held.push({ id, stacks: whole(stacks, 1, 99 + maxStacksFor(cardDefinition(id).rarity)) });',
    mustFail: 'npm run test',
  },
  {
    what: 'a share link accepts a repeated key',
    file: 'src/application/shareCode.ts',
    find: '    if (map.has(key)) throw new Rejected();\n',
    replace: '',
    mustFail: 'npm run test',
  },
  {
    what: 'a share link accepts a win with the ship still flying',
    file: 'src/application/shareCode.ts',
    find: "    if (result.outcome === 'won' && result.resurrectionShipPercent !== 100) return null;",
    replace: '',
    mustFail: 'npm run test',
  },
  {
    what: 'a score weight is written as a typo',
    file: 'src/balance/scoring.json',
    find: '"winBonus": 250',
    replace: '"winBonus": "250"',
    mustFail: CONTENT_WITHOUT_FINGERPRINT,
  },
  {
    what: 'a tier number changes without the version reminder noticing',
    file: 'src/balance/tiers.json',
    find: '"fleetCycleDamageCap": 45',
    replace: '"fleetCycleDamageCap": 44',
    mustFail: 'npx vitest run --config vitest.content.config.ts tests/content/fingerprint.check.ts',
  },
  {
    what: 'the share link is not sealed against edits',
    file: 'src/application/linkSeal.ts',
    find: '  if (new DataView(sealed.buffer).getUint32(0) !== checksum(body)) return null;\n',
    replace: '',
    mustFail: 'npm run test',
  },
  {
    what: 'an edit hides in the spare bits of the last base64 character',
    file: 'src/application/linkSeal.ts',
    find: ' || toBase64Url(scrambled) !== text) return null;',
    replace: ') return null;',
    mustFail: 'npm run test',
  },
  {
    what: 'the share link is plain base64, one decode from readable',
    file: 'src/application/linkSeal.ts',
    find: '  return bytes.map((byte) => byte ^ stream.index(256));',
    replace: '  return bytes.map((byte) => byte ^ 0 * stream.index(256));',
    mustFail: 'npm run test',
  },
  {
    what: 'an end-screen line uses a placeholder nothing fills',
    file: 'src/content/endings.json',
    find: '"text": "On the bright side, the paperwork is also gone."',
    replace: '"text": "On the bright side, {pilot}, the paperwork is also gone."',
    mustFail: 'npm run check:content',
  },
];

let unnoticed = 0;

for (const item of SABOTAGE) {
  const original = readFileSync(item.file, 'utf8');
  if (!original.includes(item.find)) {
    console.error(`SKIPPED  ${item.what}: anchor text not found in ${item.file}`);
    unnoticed += 1;
    continue;
  }

  writeFileSync(item.file, original.replace(item.find, item.replace));
  let caught = false;
  try {
    execSync(item.mustFail, { stdio: 'pipe' });
  } catch {
    caught = true;
  } finally {
    writeFileSync(item.file, original);
  }

  if (caught) {
    console.log(`caught   ${item.what}  (${item.mustFail})`);
  } else {
    console.error(`UNNOTICED  ${item.what}  (${item.mustFail} still passed)`);
    unnoticed += 1;
  }
}

if (unnoticed > 0) {
  console.error(`\n${unnoticed} sabotage(s) went unnoticed. A check or a test is not protecting anything.`);
  process.exit(1);
}

console.log(`\nAll ${SABOTAGE.length} sabotages were caught.`);
