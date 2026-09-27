import explosion1 from '../../../assets/effects/explosion_small_1.png';
import explosion2 from '../../../assets/effects/explosion_small_2.png';
import explosion3 from '../../../assets/effects/explosion_small_3.png';
import explosion4 from '../../../assets/effects/explosion_small_4.png';
import explosion5 from '../../../assets/effects/explosion_small_5.png';
import explosion6 from '../../../assets/effects/explosion_small_6.png';
import explosionLarge1 from '../../../assets/effects/explosion_large_1.png';
import explosionLarge2 from '../../../assets/effects/explosion_large_2.png';
import explosionLarge3 from '../../../assets/effects/explosion_large_3.png';
import explosionLarge4 from '../../../assets/effects/explosion_large_4.png';
import explosionLarge5 from '../../../assets/effects/explosion_large_5.png';
import explosionLarge6 from '../../../assets/effects/explosion_large_6.png';
import explosionLarge7 from '../../../assets/effects/explosion_large_7.png';
import bulletAimed from '../../../assets/projectiles/bullet_aimed.png';
import bulletPlayer from '../../../assets/projectiles/bullet_player.png';
import bulletPlayerBig from '../../../assets/projectiles/bullet_player_big.png';
import bulletStray from '../../../assets/projectiles/bullet_stray.png';
import missile1 from '../../../assets/projectiles/missile_1.png';
import missile2 from '../../../assets/projectiles/missile_2.png';
import civilian1 from '../../../assets/ships/civilian_1.png';
import civilian1Damaged from '../../../assets/ships/civilian_1_damaged.png';
import civilian2 from '../../../assets/ships/civilian_2.png';
import civilian2Damaged from '../../../assets/ships/civilian_2_damaged.png';
import civilian3 from '../../../assets/ships/civilian_3.png';
import civilian3Damaged from '../../../assets/ships/civilian_3_damaged.png';
import galacticaFleet from '../../../assets/ships/galactica_fleet.png';
import galacticaFleetDamaged from '../../../assets/ships/galactica_fleet_damaged.png';
import imaginarySix from '../../../assets/ships/imaginary_six.png';
import pilotEject from '../../../assets/ships/pilot_eject.png';
import raiderEyeCenter from '../../../assets/ships/raider_eye_center.png';
import raiderEyeLeft from '../../../assets/ships/raider_eye_left.png';
import raiderEyeRight from '../../../assets/ships/raider_eye_right.png';
import raiderHeavy from '../../../assets/ships/raider_heavy.png';
import raiderHeavyDamaged from '../../../assets/ships/raider_heavy_damaged.png';
import raptor from '../../../assets/ships/raptor.png';
import resurrectionShipOpen from '../../../assets/ships/resurrection_ship_open.png';
import resurrectionShipSealed from '../../../assets/ships/resurrection_ship_sealed.png';
import resurrectionShipWreck from '../../../assets/ships/resurrection_ship_wreck.png';
import viperBankLeft from '../../../assets/ships/viper_bank_left.png';
import viperBankRight from '../../../assets/ships/viper_bank_right.png';
import viperFlicker from '../../../assets/ships/viper_flicker.png';
import viperNeutral from '../../../assets/ships/viper_neutral.png';

/** The Viper in world units: its 64 x 64 file at two art pixels per unit (docs/art/ART-SCALE.md). */
export const SHIP_SHOWN_UNITS = 32;

/** The Raider in world units: its 48 x 48 file at two art pixels per unit. */
export const RAIDER_SHOWN_UNITS = 24;

/** The heavy Raider in world units: its 72 x 72 file at two art pixels per unit. */
export const RAIDER_HEAVY_SHOWN_UNITS = 36;

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

/** Six small frames across about 0.7 s, seven large ones across about 0.9 s. A burst, not a strobe (PRD 15). */
export const EXPLOSION_FRAME_RATE = 8;

/** The large burst in world units: its 96 x 96 file at two art pixels per unit. */
export const EXPLOSION_LARGE_SHOWN_UNITS = 48;

// ASSUMPTION: seven frames because seven were drawn; the art list asked for eight. Add the eighth
// here if it lands.
export const EXPLOSION_LARGE_FRAMES = [
  'explosion-large-1',
  'explosion-large-2',
  'explosion-large-3',
  'explosion-large-4',
  'explosion-large-5',
  'explosion-large-6',
  'explosion-large-7',
] as const;

export const EXPLOSION_LARGE_ANIM = 'explosion-large';

/** The widest, brightest cell, held when reduced effects is on. */
export const EXPLOSION_LARGE_STILL = EXPLOSION_LARGE_FRAMES[2];

export const RAIDER_EYE_CENTER = 'raider-eye-center';
export const RAIDER_EYE_LEFT = 'raider-eye-left';
export const RAIDER_EYE_RIGHT = 'raider-eye-right';

/** Center, left, center, right. Passing through center keeps the sweep from jumping across the hull. */
export const RAIDER_EYE_FRAMES = [RAIDER_EYE_CENTER, RAIDER_EYE_LEFT, RAIDER_EYE_CENTER, RAIDER_EYE_RIGHT] as const;

export const RAIDER_EYE_ANIM = 'raider-eye-sweep';

/** The heavy Raider is one still picture, and a broken one from half its hull (PRD 8.5). No eye sweep. */
export const RAIDER_HEAVY = 'raider-heavy';
export const RAIDER_HEAVY_DAMAGED = 'raider-heavy-damaged';

/** The resurrection ship in world units: its 96 x 64 file at two art pixels per unit. */
export const RESURRECTION_SHIP_SHOWN = { width: 48, height: 32 } as const;

/** Bays shut (and under the shield), bays open, and the dead factory (PRD 5.2). */
export const RESURRECTION_SHIP_SEALED = 'resurrection-ship-sealed';
export const RESURRECTION_SHIP_OPEN = 'resurrection-ship-open';
export const RESURRECTION_SHIP_WRECK = 'resurrection-ship-wreck';

/** Two pictures a second, so the eye is a tell and not a flash (PRD 15). */
export const RAIDER_EYE_FRAME_RATE = 2;

export const BULLET_PLAYER = 'bullet-player';
export const BULLET_AIMED = 'bullet-aimed';
export const BULLET_STRAY = 'bullet-stray';
export const BULLET_PLAYER_BIG = 'bullet-player-big';

/** The big shot in world units: its 10 x 16 file at two art pixels per unit. */
export const BULLET_PLAYER_BIG_SHOWN = { width: 5, height: 8 } as const;

export const MISSILE_FRAMES = ['missile-1', 'missile-2'] as const;
export const MISSILE_ANIM = 'missile-flame';

/** Two flame frames, swapped twice a second: a flicker, not a strobe (PRD 15). */
export const MISSILE_FRAME_RATE = 2;

/** A civilian ship in world units: its 32 x 16 file at two art pixels per unit. */
export const CIVILIAN_SHOWN = { width: 16, height: 8 } as const;

/**
 * Each civilian design, whole and dented, so damage is a shape and not only a colour (PRD 7.4). The
 * line cycles through them in order. A new design is two imports and one entry here.
 */
export const CIVILIAN_VARIANTS = [
  { healthy: 'civilian-1', damaged: 'civilian-1-damaged', healthyUrl: civilian1, damagedUrl: civilian1Damaged },
  { healthy: 'civilian-2', damaged: 'civilian-2-damaged', healthyUrl: civilian2, damagedUrl: civilian2Damaged },
  { healthy: 'civilian-3', damaged: 'civilian-3-damaged', healthyUrl: civilian3, damagedUrl: civilian3Damaged },
] as const;

/**
 * Galactica's nose on the line, in world units: its 64 x 76 file at two art pixels per unit. The
 * file's bottom sits past the screen edge, so the rest of the ship reads as off screen.
 */
export const GALACTICA_SHOWN = { width: 32, height: 38 } as const;

/** Where the fleet line crosses the file, measured up from its bottom row (docs/art/SPRITE-FILES.md). */
export const GALACTICA_LINE_FROM_BOTTOM_UNITS = 18;

export const GALACTICA = 'galactica-fleet';
export const GALACTICA_DAMAGED = 'galactica-fleet-damaged';

/** The Raptor escort in world units: its 32 x 16 file at two art pixels per unit. */
export const RAPTOR_SHOWN = { width: 16, height: 8 } as const;
export const RAPTOR = 'raptor';

/** Imaginary Six in world units: her 32 x 48 file at two art pixels per unit. Her glow is in the picture. */
export const IMAGINARY_SIX_SHOWN = { width: 16, height: 24 } as const;
export const IMAGINARY_SIX = 'imaginary-six';

/** The ejected pilot in world units: its 32 x 40 file at two art pixels per unit. */
export const PILOT_EJECT_SHOWN = { width: 16, height: 20 } as const;
export const PILOT_EJECT = 'pilot-eject';

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
  { key: RAIDER_HEAVY, url: raiderHeavy },
  { key: RAIDER_HEAVY_DAMAGED, url: raiderHeavyDamaged },
  { key: RESURRECTION_SHIP_SEALED, url: resurrectionShipSealed },
  { key: RESURRECTION_SHIP_OPEN, url: resurrectionShipOpen },
  { key: RESURRECTION_SHIP_WRECK, url: resurrectionShipWreck },
  { key: BULLET_PLAYER, url: bulletPlayer },
  { key: BULLET_AIMED, url: bulletAimed },
  { key: BULLET_STRAY, url: bulletStray },
  { key: BULLET_PLAYER_BIG, url: bulletPlayerBig },
  { key: MISSILE_FRAMES[0], url: missile1 },
  { key: MISSILE_FRAMES[1], url: missile2 },
  { key: EXPLOSION_FRAMES[0], url: explosion1 },
  { key: EXPLOSION_FRAMES[1], url: explosion2 },
  { key: EXPLOSION_FRAMES[2], url: explosion3 },
  { key: EXPLOSION_FRAMES[3], url: explosion4 },
  { key: EXPLOSION_FRAMES[4], url: explosion5 },
  { key: EXPLOSION_FRAMES[5], url: explosion6 },
  { key: EXPLOSION_LARGE_FRAMES[0], url: explosionLarge1 },
  { key: EXPLOSION_LARGE_FRAMES[1], url: explosionLarge2 },
  { key: EXPLOSION_LARGE_FRAMES[2], url: explosionLarge3 },
  { key: EXPLOSION_LARGE_FRAMES[3], url: explosionLarge4 },
  { key: EXPLOSION_LARGE_FRAMES[4], url: explosionLarge5 },
  { key: EXPLOSION_LARGE_FRAMES[5], url: explosionLarge6 },
  { key: EXPLOSION_LARGE_FRAMES[6], url: explosionLarge7 },
  { key: PILOT_EJECT, url: pilotEject },
  { key: RAPTOR, url: raptor },
  { key: IMAGINARY_SIX, url: imaginarySix },
  { key: GALACTICA, url: galacticaFleet },
  { key: GALACTICA_DAMAGED, url: galacticaFleetDamaged },
  ...CIVILIAN_VARIANTS.flatMap((variant) => [
    { key: variant.healthy, url: variant.healthyUrl },
    { key: variant.damaged, url: variant.damagedUrl },
  ]),
];
