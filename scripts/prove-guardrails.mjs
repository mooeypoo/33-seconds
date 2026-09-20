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

const SABOTAGE = [
  {
    what: 'domain imports Phaser',
    file: 'src/domain/game.ts',
    find: "import { Viper, VIPER_HALF_HEIGHT_UNITS, VIPER_RADIUS_UNITS } from './combat/viper';",
    replace: "import Phaser from 'phaser';\nimport { Viper, VIPER_HALF_HEIGHT_UNITS, VIPER_RADIUS_UNITS } from './combat/viper';",
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
    find: '    this.clampIntoWorld();',
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
    find: '  return segmentHitsCircle(startX, startY, endX, endY, stillX, stillY, movingRadius + stillRadius);',
    replace: '  return circlesOverlap(endX, endY, movingRadius, stillX, stillY, stillRadius);',
    mustFail: 'npm run test',
  },
  {
    what: 'hits no longer destroy a Raider',
    file: 'src/domain/swarm/raider.ts',
    find: '    this.hitPoints -= 1;',
    replace: '    // sabotage: the Raider is immortal',
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
    find: '  private autoFire(events: DomainEvent[]): void {\n    if (!this.viper.canFight) return;',
    replace: '  private autoFire(events: DomainEvent[]): void {\n    // sabotage: the gun works from the Raptor',
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
    what: 'the 33-second cycle never jumps',
    file: 'src/domain/cycle/jumpCycle.ts',
    find: '    if (this.combatElapsedTicks >= CYCLE_COMBAT_TICKS) {',
    replace: '    if (this.combatElapsedTicks >= CYCLE_COMBAT_TICKS * 10) {',
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
