import { MAX_FROST_BLUR } from '../types'

/**
 * Converts a Figma-like 0–100 frost value into a Gaussian blur radius in pixels.
 *
 * A slight perceptual compression (pow 1.2) keeps low values usable, since small
 * blur radii are subjectively strong. frost 100 maps to MAX_FROST_BLUR.
 */
export function frostToBlur(frost: number): number {
  const t = Math.max(0, Math.min(100, frost)) / 100
  return MAX_FROST_BLUR * Math.pow(t, 1.2)
}
