/**
 * Art pixels per world unit (docs/art/ART-SCALE.md). The canvas is this many times the world's size
 * and the camera zooms by it, so every presenter keeps working in world units while a 64 x 64 Viper
 * file lands on exactly 32 world units, pixel for pixel. The browser then stretches the canvas to fit.
 */
export const PIXELS_PER_WORLD_UNIT = 2;
