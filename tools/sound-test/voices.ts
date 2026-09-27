/**
 * The Voices panel of the sound test (EXPERIMENTAL, PRD 14.3). Plays each speaker's chatter through
 * the game's own adapter, radio, and master, so a voice sounds here exactly as it does in a run.
 * Every press is a fresh stream, cut at the chosen length with the same fade a run uses.
 */
import type { BanterSpeaker } from '../../src/application/banter/lines';
import type { Voice } from '../../src/application/audio/voices';
import type { ZzfxAudio } from '../../src/infrastructure/audio/ZzfxAudio';
import { cryptoSeed } from '../../src/infrastructure/random/cryptoSeed';

/** Silence between speakers in "Play everyone", so each voice stands alone. */
const TURN_GAP_MS = 500;

export interface VoicePanel {
  /** Audio is on: the buttons may play. */
  enable(): void;
}

export function createVoicePanel(
  audio: ZzfxAudio,
  voices: ReadonlyMap<BanterSpeaker, Voice>,
  elements: {
    readonly list: HTMLUListElement;
    readonly everyone: HTMLButtonElement;
    readonly stop: HTMLButtonElement;
    readonly radioToggle: HTMLInputElement;
    readonly seconds: HTMLInputElement;
    readonly secondsValue: HTMLSpanElement;
    readonly status: HTMLElement;
  },
): VoicePanel {
  const playButtons: HTMLButtonElement[] = [];
  // A dev page, not gameplay: a plain timer is fine for the status line and the turn order.
  let timer: ReturnType<typeof setTimeout> | undefined;

  const talkSeconds = (): number => Number(elements.seconds.value);
  elements.seconds.addEventListener('input', () => {
    elements.secondsValue.textContent = `${talkSeconds().toFixed(1)} s`;
  });
  elements.radioToggle.addEventListener('change', () => {
    audio.setRadio(elements.radioToggle.checked);
  });

  function stop(): void {
    clearTimeout(timer);
    audio.hush();
    elements.status.textContent = '';
  }

  function speak(speaker: BanterSpeaker, then: () => void = () => {}): void {
    const voice = voices.get(speaker);
    if (!voice) return;
    stop();
    const seconds = talkSeconds();
    audio.speak(voice, seconds, cryptoSeed());
    elements.status.textContent = `Talking: ${speaker}`;
    timer = setTimeout(() => {
      elements.status.textContent = '';
      then();
    }, seconds * 1000);
  }

  function playFrom(speakers: readonly BanterSpeaker[], index: number): void {
    const speaker = speakers[index];
    if (!speaker) return;
    speak(speaker, () => {
      timer = setTimeout(() => {
        playFrom(speakers, index + 1);
      }, TURN_GAP_MS);
    });
  }

  for (const [speaker, voice] of voices) {
    const item = document.createElement('li');
    const play = document.createElement('button');
    play.type = 'button';
    play.textContent = `Play ${speaker}`;
    play.disabled = true;
    play.addEventListener('click', () => {
      speak(speaker);
    });
    playButtons.push(play);

    const detail = document.createElement('code');
    const [fewest, most] = voice.syllablesPerPhrase;
    detail.textContent =
      `${String(voice.pitchHz)} Hz ±${String(voice.pitchRangeSemitones)} st, phrase end ${voice.phraseEndSemitones > 0 ? '+' : ''}${String(voice.phraseEndSemitones)} st, ` +
      `${String(fewest)}–${String(most)} syllables, gaps ${String(voice.syllableGapSeconds)} / ${String(voice.phraseGapSeconds)} s` +
      (voice.syllableNames.length > 0 ? `, says: ${voice.syllableNames.join(' ')}` : '');
    item.append(play, detail);
    elements.list.append(item);
  }

  elements.everyone.addEventListener('click', () => {
    playFrom([...voices.keys()], 0);
  });
  elements.stop.addEventListener('click', stop);

  return {
    enable(): void {
      elements.everyone.disabled = false;
      elements.stop.disabled = false;
      for (const button of playButtons) button.disabled = false;
    },
  };
}
