export interface GlassParams {
  /** Figma-like refraction control, 0–100. Maps to IOR and virtual thickness. */
  refraction: number
  /** Width of the refractive edge band in CSS pixels. */
  depth: number
  /** Background blur amount, 0–100 (Figma "Frost"). Normalized to pixels internally. */
  frost: number
  /** Specular edge highlight opacity multiplier, usually 0–1 (Figma "Light intensity"). */
  lightIntensity: number
  /** Chromatic channel separation, 0–100 (Figma "Dispersion"). */
  dispersion: number
  /** How far projected light spreads across the surface, 0–100 (Figma "Splay"). */
  splay: number
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
  frost: 50,
  lightIntensity: 0.65,
  dispersion: 0,
  splay: 50,
}

/** Default light direction: top-left, matching Figma's default -45°. */
export const DEFAULT_LIGHT_ANGLE = -Math.PI / 4

/** Default splay when omitted. */
export const DEFAULT_SPLAY = 50

/**
 * Multiplier controlling how far light spreads at maximum splay (100).
 * At splay 100 the light band becomes (1 + this) times the edge depth.
 */
export const SPLAY_SPREAD_FACTOR = 3

/** Upper blur radius (px) that frost 100 maps to. */
export const MAX_FROST_BLUR = 12

/** Minimum frost (on the 0–100 scale) enforced when overLight is active. */
export const MIN_FROST_OVER_LIGHT = 25
