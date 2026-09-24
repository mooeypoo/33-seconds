import explosion1 from '../../../assets/effects/explosion_small_1.png';
import explosion2 from '../../../assets/effects/explosion_small_2.png';
import explosion3 from '../../../assets/effects/explosion_small_3.png';
import explosion4 from '../../../assets/effects/explosion_small_4.png';
import explosion5 from '../../../assets/effects/explosion_small_5.png';
import explosion6 from '../../../assets/effects/explosion_small_6.png';
import bulletAimed from '../../../assets/projectiles/bullet_aimed.png';
import bulletPlayer from '../../../assets/projectiles/bullet_player.png';
import bulletStray from '../../../assets/projectiles/bullet_stray.png';
import raiderEyeCenter from '../../../assets/ships/raider_eye_center.png';
import raiderEyeLeft from '../../../assets/ships/raider_eye_left.png';
import raiderEyeRight from '../../../assets/ships/raider_eye_right.png';
import viperBankLeft from '../../../assets/ships/viper_bank_left.png';
import viperBankRight from '../../../assets/ships/viper_bank_right.png';
import viperFlicker from '../../../assets/ships/viper_flicker.png';
import viperNeutral from '../../../assets/ships/viper_neutral.png';

/** The Viper in world units: its 64 x 64 file at two art pixels per unit (docs/art/ART-SCALE.md). */
export const SHIP_SHOWN_UNITS = 32;

/** The Raider in world units: its 48 x 48 file at two art pixels per unit. */
export const RAIDER_SHOWN_UNITS = 24;

export const VIPER_NEUTRAL = 'viper-neutral';
export const VIPER_BANK_LEFT = 'viper-bank-left';
export const VIPER_BANK_RIGHT = 'viper-bank-right';
export const VIPER_FLICKER = 'viper-flicker';

export const EXPLOSION_FRAMES = [
  'explosion-small-1',
  'explosion-small-2',
  'explosion-small-3',
  'explosion-small-4',
  'explosion-small-5',
  'explosion-small-6',
] as const;

export const EXPLOSION_ANIM = 'explosion-small';

/** Six frames across about 0.7 s. A burst, not a strobe (PRD 15). */
export const EXPLOSION_FRAME_RATE = 8;

export const RAIDER_EYE_CENTER = 'raider-eye-center';
export const RAIDER_EYE_LEFT = 'raider-eye-left';
export const RAIDER_EYE_RIGHT = 'raider-eye-right';

/** Center, left, center, right. Passing through center keeps the sweep from jumping across the hull. */
export const RAIDER_EYE_FRAMES = [RAIDER_EYE_CENTER, RAIDER_EYE_LEFT, RAIDER_EYE_CENTER, RAIDER_EYE_RIGHT] as const;

export const RAIDER_EYE_ANIM = 'raider-eye-sweep';

/** Two pictures a second, so the eye is a tell and not a flash (PRD 15). */
export const RAIDER_EYE_FRAME_RATE = 2;

export const BULLET_PLAYER = 'bullet-player';
export const BULLET_AIMED = 'bullet-aimed';
export const BULLET_STRAY = 'bullet-stray';

/**
 * Phaser's file loader turns images into blob URLs, and the CSP allows `img-src 'self' data:` only.
 * A same-origin `Image` stays on `'self'`.
 */
export function loadSpriteImages(): Promise<readonly { key: string; image: HTMLImageElement }[]> {
  return Promise.all(
    SPRITE_FILES.map(
      ({ key, url }) =>
        new Promise<{ key: string; image: HTMLImageElement }>((resolve, reject) => {
          const image = new Image();
          image.onload = () => {
            resolve({ key, image });
          };
          image.onerror = () => {
            reject(new Error(`sprite failed to load: ${key}`));
          };
          image.src = url;
        }),
    ),
  );
}

export const SPRITE_FILES: readonly { key: string; url: string }[] = [
  { key: VIPER_NEUTRAL, url: viperNeutral },
  { key: VIPER_BANK_LEFT, url: viperBankLeft },
  { key: VIPER_BANK_RIGHT, url: viperBankRight },
  { key: VIPER_FLICKER, url: viperFlicker },
  { key: RAIDER_EYE_CENTER, url: raiderEyeCenter },
  { key: RAIDER_EYE_LEFT, url: raiderEyeLeft },
  { key: RAIDER_EYE_RIGHT, url: raiderEyeRight },
  { key: BULLET_PLAYER, url: bulletPlayer },
  { key: BULLET_AIMED, url: bulletAimed },
  { key: BULLET_STRAY, url: bulletStray },
  { key: EXPLOSION_FRAMES[0], url: explosion1 },
  { key: EXPLOSION_FRAMES[1], url: explosion2 },
  { key: EXPLOSION_FRAMES[2], url: explosion3 },
  { key: EXPLOSION_FRAMES[3], url: explosion4 },
  { key: EXPLOSION_FRAMES[4], url: explosion5 },
  { key: EXPLOSION_FRAMES[5], url: explosion6 },
];
