/**
 * Dev-only sound test (ADR-0002 3.5). Plays every id in sounds.json through the game's own adapter
 * and director, so a pasted array sounds here exactly as it will in a run. Not part of the build:
 * only `npm run dev` serves it, at /tools/sound-test/.
 */
import soundsRaw from '../../src/content/sounds.json';
import { AudioDirector } from '../../src/application/audio/AudioDirector';
import { parseSoundBank } from '../../src/application/audio/soundBank';
import { SOUND_IDS, type SoundId } from '../../src/application/audio/soundIds';
import { ZzfxAudio } from '../../src/infrastructure/audio/ZzfxAudio';
import voicesRaw from '../../src/content/voices.json';
import { parseVoiceBank } from '../../src/application/audio/voices';
import { createVoicePanel } from './voices';

const { bank, problems } = parseSoundBank(soundsRaw);
const notes = new Map<string, string>();
for (const entry of (soundsRaw as { sounds: { id: string; note?: string }[] }).sounds) {
  if (entry.note) notes.set(entry.id, entry.note);
}

const voiceBank = parseVoiceBank(voicesRaw);
const audio = new ZzfxAudio(bank, voiceBank.radio);
const director = new AudioDirector(audio);
let muted = false;
let volume = 0.7;
director.setLevel(muted, volume);

function element<K extends keyof HTMLElementTagNameMap>(id: string, tag: K): HTMLElementTagNameMap[K] {
  const found = document.getElementById(id);
  if (!(found instanceof HTMLElement) || found.tagName.toLowerCase() !== tag) throw new Error(`#${id} is missing`);
  return found as HTMLElementTagNameMap[K];
}

const unlockButton = element('unlock', 'button');
const mixButton = element('mix', 'button');
const muteButton = element('mute', 'button');
const volumeInput = element('volume', 'input');
const volumeValue = element('volume-value', 'span');
const problemList = element('problems', 'ul');
const soundList = element('sounds', 'ul');

for (const problem of problems) {
  const item = document.createElement('li');
  item.textContent = `sounds.json: ${problem} (npm run check:content fails on this)`;
  problemList.append(item);
}

const voiceProblemList = element('voice-problems', 'ul');
for (const problem of voiceBank.problems) {
  const item = document.createElement('li');
  item.textContent = `voices.json: ${problem} (npm run check:content fails on this)`;
  voiceProblemList.append(item);
}
const voicePanel = createVoicePanel(audio, voiceBank.voices, {
  list: element('voices', 'ul'),
  everyone: element('voices-everyone', 'button'),
  stop: element('voices-stop', 'button'),
  radioToggle: element('voices-radio', 'input'),
  seconds: element('voices-seconds', 'input'),
  secondsValue: element('voices-seconds-value', 'span'),
  status: element('voices-status', 'span'),
});

const playButtons: HTMLButtonElement[] = [];
for (const id of SOUND_IDS) {
  const item = document.createElement('li');
  const play = document.createElement('button');
  play.type = 'button';
  play.textContent = `Play ${id}`;
  play.disabled = true;
  // The single-play buttons skip the repeat limit on purpose: you want to hear it every click.
  play.addEventListener('click', () => audio.play(id, 1));
  playButtons.push(play);

  const detail = document.createElement('div');
  const parameters = bank.get(id);
  const code = document.createElement('code');
  code.textContent = parameters
    ? `[${parameters.map((value) => (value === undefined ? '' : String(value))).join(',')}]`
    : 'missing or rejected: silent in the game';
  detail.append(code);
  const note = notes.get(id);
  if (note) {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = ` ${note}`;
    detail.append(tag);
  }
  item.append(play, detail);
  soundList.append(item);
}

unlockButton.addEventListener('click', () => {
  director.unlock();
  unlockButton.disabled = true;
  unlockButton.textContent = 'Audio on';
  mixButton.disabled = false;
  for (const button of playButtons) button.disabled = false;
  voicePanel.enable();
});

muteButton.addEventListener('click', () => {
  muted = !muted;
  muteButton.textContent = muted ? 'Muted' : 'Sound on';
  muteButton.setAttribute('aria-pressed', String(muted));
  director.setLevel(muted, volume);
});

volumeInput.addEventListener('input', () => {
  volume = Number(volumeInput.value) / 100;
  volumeValue.textContent = `${volumeInput.value}%`;
  director.setLevel(muted, volume);
});

/**
 * Four seconds of a busy fight, looped: a kill chain faster than the repeat gap, a heavy, shield
 * hits in a burst, the fleet taking a round, a return, and both spool calls. Times in seconds.
 */
const MIX_SECONDS = 4;
const MIX: readonly (readonly [number, SoundId])[] = [
  [0.0, 'raider_destroyed'],
  [0.03, 'raider_destroyed'],
  [0.06, 'raider_destroyed'],
  [0.09, 'raider_destroyed'],
  [0.12, 'raider_destroyed'],
  [0.6, 'missile_launch'],
  [0.9, 'heavy_destroyed'],
  [1.2, 'shield_hit'],
  [1.26, 'shield_hit'],
  [1.32, 'shield_hit'],
  [1.38, 'shield_hit'],
  [1.6, 'fleet_hit'],
  [2.0, 'raider_returned'],
  [2.3, 'viper_hit'],
  [2.6, 'raider_destroyed'],
  [2.8, 'raider_destroyed'],
  [3.0, 'raider_destroyed'],
  [3.2, 'spool_5s'],
  [3.6, 'spool_2s'],
];

let mixing = false;
let mixClock = 0;
let lastFrame = 0;

function mixFrame(now: number): void {
  if (!mixing) return;
  const delta = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  const from = mixClock;
  mixClock = (mixClock + delta) % MIX_SECONDS;
  const wrapped = mixClock < from;
  director.noteFrame([], { phase: 'building', secondsRemaining: 20 }, delta);
  for (const [at, id] of MIX) {
    const due = wrapped ? at >= from || at < mixClock : at >= from && at < mixClock;
    if (due) director.cue(id);
  }
  requestAnimationFrame(mixFrame);
}

mixButton.addEventListener('click', () => {
  mixing = !mixing;
  mixButton.textContent = mixing ? 'Stop fight mix' : 'Play fight mix';
  if (mixing) {
    mixClock = 0;
    lastFrame = performance.now();
    requestAnimationFrame(mixFrame);
  }
});
