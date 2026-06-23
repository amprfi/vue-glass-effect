import { computed, type ComputedRef, type Ref } from 'vue'

import {
  calculateRefractionProfile,
  createRoundedRectField,
  refractionToMaterialParams,
  type FieldSampler,
} from '../utils/geometry'
import {
  generateDisplacementMap,
  generateInnerLightMaps,
  generateSpecularMap,
} from '../utils/maps'
import { frostToBlur } from '../utils/frost'
import { DEFAULT_LIGHT_ANGLE, DEFAULT_SPLAY, MIN_FROST_OVER_LIGHT } from '../types'
import type { MeasuredBox } from '../types'

export interface GlassDataInput {
  refraction: number
  depth: number
  frost: number
  lightIntensity: number
  dispersion: number
  splay: number
  lightAngle: number
  overLight: boolean
  /** Silhouette field; when omitted a rounded rectangle is derived from the box radius. */
  field?: FieldSampler | null
  /** Rounded-rect radius used when no explicit field is supplied. */
  borderRadius?: number
}

export interface GlassData {
  ready: boolean
  /** RG displacement map (drives refraction + dispersion in the SVG filter). */
  displacementUrl: string
  /** Displacement scale passed to feDisplacementMap. */
  scale: number
  /** Specular rim map (white edge glint). */
  specularUrl: string
  /** Directional inner-shadow map (darkens the light-far edge). */
  shadowUrl: string
  /** Directional inner-highlight map (brightens the light-facing edge). */
  highlightUrl: string
  /** Frost as a CSS blur value string, e.g. "blur(5px)". */
  frostFilter: string
  /** Effective rim opacity (lightIntensity, clamped up under overLight). */
  rimOpacity: number
  dispersion: number
}

const EMPTY: GlassData = {
  ready: false,
  displacementUrl: '',
  scale: 1,
  specularUrl: '',
  shadowUrl: '',
  highlightUrl: '',
  frostFilter: 'blur(0px)',
  rimOpacity: 0,
  dispersion: 0,
}

/**
 * Derives every layer's data for a glass element from its measured box and params.
 * Map generation runs once per (size, params) combination — not per frame — so this
 * is a setup cost, not an animation tax. Returns a stable EMPTY until the box is
 * measured so consumers can defer rendering their layers.
 */
export function useGlassData(
  box: Ref<MeasuredBox>,
  input: ComputedRef<GlassDataInput> | Ref<GlassDataInput>,
): ComputedRef<GlassData> {
  return computed<GlassData>(() => {
    const { width, height } = box.value

    if (width <= 0 || height <= 0) {
      return EMPTY
    }

    const i = input.value
    const w = Math.max(1, Math.round(width))
    const h = Math.max(1, Math.round(height))
    const borderRadius = Math.max(0, Math.round(i.borderRadius ?? 0))

    // A rounded-rect field is used for cards; shaped glass supplies its own field.
    const field: FieldSampler = i.field ?? createRoundedRectField(w, h, borderRadius)

    const maxDepth = Math.max(1, Math.min(w, h) / 2 - 1)
    const depth = Math.max(1, Math.min(i.depth, maxDepth))

    const { ior, glassThickness } = refractionToMaterialParams(i.refraction)
    const profile = calculateRefractionProfile(glassThickness, depth, ior, 128)

    let maxDisplacement = 1
    for (const sample of profile) {
      maxDisplacement = Math.max(maxDisplacement, Math.abs(sample))
    }

    const displacementUrl = generateDisplacementMap({
      width: w,
      height: h,
      borderRadius,
      depth,
      field,
      profile,
      maxDisplacement,
    })

    const specularDepth = Math.min(Math.max(1, depth * 2.5), Math.min(w, h) / 2)
    const specularUrl = generateSpecularMap({
      width: w,
      height: h,
      borderRadius,
      depth: specularDepth,
      field,
      splay: i.splay,
      lightAngle: i.lightAngle,
    })

    const innerLightMaps = generateInnerLightMaps({
      width: w,
      height: h,
      borderRadius,
      depth: Math.min(Math.max(1, depth * 1.6), Math.min(w, h) / 2),
      field,
      splay: i.splay,
      lightAngle: i.lightAngle,
    })

    const frostScale = i.overLight ? Math.max(MIN_FROST_OVER_LIGHT, i.frost) : i.frost

    return {
      ready: true,
      displacementUrl,
      scale: maxDisplacement,
      specularUrl,
      shadowUrl: innerLightMaps.shadowUrl,
      highlightUrl: innerLightMaps.highlightUrl,
      frostFilter: `blur(${frostToBlur(frostScale).toFixed(2)}px)`,
      rimOpacity: i.overLight ? Math.max(0.8, i.lightIntensity) : i.lightIntensity,
      dispersion: Math.max(0, Math.min(100, i.dispersion)),
    }
  })
}

export const GLASS_DEFAULTS = {
  lightAngle: DEFAULT_LIGHT_ANGLE,
  splay: DEFAULT_SPLAY,
}
