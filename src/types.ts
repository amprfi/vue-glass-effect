export interface GlassParams {
  /** Figma-like refraction control, 0–100. Maps to IOR and virtual thickness. */
  refraction: number
  /** Width of the refractive edge band in CSS pixels. */
  depth: number
  /** Gaussian blur amount for the backdrop/filter source. */
  frost: number
  /** Specular edge highlight opacity multiplier, usually 0–1. */
  lightIntensity: number
  /** Chromatic channel separation, 0–100. */
  dispersion: number
}

export interface GlassCardProps extends Partial<GlassParams> {
  /** Light direction in radians. Defaults to top-left-ish, matching common Figma demos. */
  lightAngle?: number
  /** Use slightly stronger blur/highlight for very light backdrops. */
  overLight?: boolean
  /** Radius used before first measurement, then replaced by computed border-radius. */
  radius?: number | string
}

export interface MeasuredBox {
  width: number
  height: number
  borderRadius: number
}

export const DEFAULT_GLASS_PARAMS: GlassParams = {
  refraction: 50,
  depth: 20,
  frost: 0.3,
  lightIntensity: 0.65,
  dispersion: 0,
}

export const DEFAULT_LIGHT_ANGLE = -Math.PI / 4
