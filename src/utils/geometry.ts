export interface SdfSample {
  /** Signed distance to rounded rectangle boundary. Negative values are inside. */
  dist: number
  /** Outward normal x component at the nearest boundary point. */
  nx: number
  /** Outward normal y component at the nearest boundary point. */
  ny: number
}

export interface RefractionMaterialParams {
  ior: number
  glassThickness: number
}

const SURFACE_SAMPLE_EPSILON = 0.0001

/**
 * Smooth, flattened dome curve used to approximate Figma's refractive glass edge.
 */
export function glassSurfaceProfile(x: number): number {
  const clamped = Math.max(0, Math.min(1, x))
  return Math.pow(1 - Math.pow(1 - clamped, 4), 0.25)
}

/**
 * Converts a Figma-like 0–100 refraction slider into physical-ish values.
 */
export function refractionToMaterialParams(refraction: number): RefractionMaterialParams {
  const t = Math.max(0, Math.min(100, refraction)) / 100

  return {
    ior: 1 + t * 4,
    glassThickness: 10 + t * 190,
  }
}

/**
 * Calculates a one-dimensional refraction profile using Snell's law.
 * The profile is later projected around a rounded rectangle with an SDF normal.
 */
export function calculateRefractionProfile(
  glassThickness: number,
  depth: number,
  ior: number,
  samples = 128,
): Float64Array {
  const safeSamples = Math.max(2, Math.floor(samples))
  const safeDepth = Math.max(1, depth)
  const eta = 1 / Math.max(1, ior)
  const profile = new Float64Array(safeSamples)

  function refract(nx: number, ny: number): [number, number] | null {
    const dot = ny
    const k = 1 - eta * eta * (1 - dot * dot)

    if (k < 0) {
      return null
    }

    const sqrtK = Math.sqrt(k)
    return [-(eta * dot + sqrtK) * nx, eta - (eta * dot + sqrtK) * ny]
  }

  for (let index = 0; index < safeSamples; index += 1) {
    const x = index / safeSamples
    const y = glassSurfaceProfile(x)
    const dx = x < 1 ? SURFACE_SAMPLE_EPSILON : -SURFACE_SAMPLE_EPSILON
    const derivative = (glassSurfaceProfile(x + dx) - y) / dx
    const magnitude = Math.sqrt(derivative * derivative + 1)
    const refracted = refract(-derivative / magnitude, -1 / magnitude)

    if (!refracted || Math.abs(refracted[1]) < Number.EPSILON) {
      profile[index] = 0
      continue
    }

    profile[index] = refracted[0] * ((y * safeDepth + glassThickness) / refracted[1])
  }

  return profile
}

/**
 * Rounded-rectangle signed distance function with outward normal.
 * Coordinates are in the element's local pixel space.
 */
export function roundedRectSdf(px: number, py: number, width: number, height: number, radius: number): SdfSample {
  const safeRadius = Math.max(0, Math.min(radius, Math.min(width, height) / 2))
  const x = px - width / 2
  const y = py - height / 2
  const bx = width / 2 - safeRadius
  const by = height / 2 - safeRadius
  const dx = Math.abs(x) - bx
  const dy = Math.abs(y) - by

  if (dx <= 0 && dy <= 0) {
    if (-dx < -dy) {
      return { dist: dx - safeRadius, nx: x >= 0 ? 1 : -1, ny: 0 }
    }

    return { dist: dy - safeRadius, nx: 0, ny: y >= 0 ? 1 : -1 }
  }

  if (dx > 0 && dy > 0) {
    const cornerDistance = Math.sqrt(dx * dx + dy * dy)
    const inverse = cornerDistance > 0 ? 1 / cornerDistance : 0

    return {
      dist: cornerDistance - safeRadius,
      nx: dx * inverse * Math.sign(x || 1),
      ny: dy * inverse * Math.sign(y || 1),
    }
  }

  if (dx > dy) {
    return { dist: dx - safeRadius, nx: x >= 0 ? 1 : -1, ny: 0 }
  }

  return { dist: dy - safeRadius, nx: 0, ny: y >= 0 ? 1 : -1 }
}
