export interface RenderScaleOptions {
  supersample?: number
  /** Largest render dimension (px) to bound generation cost on large elements. */
  maxRender?: number
}

/** Default internal generation multiplier — maps/mask are rendered at this multiple. */
export const DEFAULT_SUPERSAMPLE = 3

/** Cap so very large elements don't generate huge maps. */
export const DEFAULT_MAX_RENDER = 384

/**
 * Resolves the internal render resolution for a glass element.
 *
 * All maps and the silhouette mask are generated at CSS-size × `scale` pixels, then the
 * browser downscales them to the element's real (CSS) size on display — which is what
 * makes edges and rims smooth instead of pixelated. The scale is capped for large
 * elements (which don't need supersampling) and never drops below 1×.
 *
 * Returns the uniform scale plus the render-space width/height. Aspect ratio is
 * preserved (important for the shaped-glass mask).
 */
export function resolveRenderScale(
  cssWidth: number,
  cssHeight: number,
  options: RenderScaleOptions = {},
): { scale: number; width: number; height: number } {
  const supersample = options.supersample ?? DEFAULT_SUPERSAMPLE
  const maxRender = options.maxRender ?? DEFAULT_MAX_RENDER
  const maxDim = Math.max(cssWidth, cssHeight)
  const scale = Math.max(1, Math.min(supersample, maxRender / maxDim))

  return {
    scale,
    width: Math.max(1, Math.round(cssWidth * scale)),
    height: Math.max(1, Math.round(cssHeight * scale)),
  }
}
