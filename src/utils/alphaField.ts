import type { FieldSampler, SdfSample } from './geometry'

export interface AlphaFieldSource {
  /** RGBA pixel data; only the alpha channel (stride 4) is used. */
  data: Uint8ClampedArray | Uint8Array
  width: number
  height: number
}

export interface AlphaFieldOptions {
  /** Alpha threshold above which a pixel counts as "inside" the shape. */
  threshold?: number
}

/** A large sentinel value representing "no seed yet" during the distance transform. */
const INF = 1e20

interface VecGrid {
  x: Float64Array
  y: Float64Array
}

/**
 * Two-pass eight-points signed sequential Euclidean distance transform (8SSEDT).
 * Each cell stores the vector offset to its nearest seed pixel; the distance is
 * recovered from the vector length. Produces exact Euclidean distances.
 */
function propagate(grid: VecGrid, width: number, height: number, forward: boolean): void {
  // Neighbours that have already been visited in the current scan direction.
  const offsets = forward
    ? ([-1, -1, 0, -1, 1, -1, -1, 0] as const)
    : ([1, 0, -1, 1, 0, 1, 1, 1] as const)

  const yStart = forward ? 0 : height - 1
  const yStop = forward ? height : -1
  const yStep = forward ? 1 : -1
  const xStart = forward ? 0 : width - 1
  const xStop = forward ? width : -1
  const xStep = forward ? 1 : -1

  for (let y = yStart; y !== yStop; y += yStep) {
    for (let x = xStart; x !== xStop; x += xStep) {
      const idx = y * width + x
      let bestX = grid.x[idx] ?? INF
      let bestY = grid.y[idx] ?? INF
      let best = bestX * bestX + bestY * bestY

      for (let o = 0; o < offsets.length; o += 2) {
        const ox = offsets[o] as number
        const oy = offsets[o + 1] as number
        const nxp = x + ox
        const nyp = y + oy

        if (nxp < 0 || nyp < 0 || nxp >= width || nyp >= height) {
          continue
        }

        const nIdx = nyp * width + nxp
        const px = (grid.x[nIdx] ?? INF) + ox
        const py = (grid.y[nIdx] ?? INF) + oy
        const d = px * px + py * py

        if (d < best) {
          best = d
          bestX = px
          bestY = py
        }
      }

      grid.x[idx] = bestX
      grid.y[idx] = bestY
    }
  }
}

/**
 * Builds a signed distance field from an alpha mask and returns a FieldSampler
 * matching the rounded-rect contract (`dist` negative inside, outward normals).
 *
 * Interior distances come from a transform seeded on outside pixels; exterior
 * distances from a transform seeded on inside pixels. Normals follow the field
 * gradient (pointing outward).
 */
export function buildAlphaField(source: AlphaFieldSource, options: AlphaFieldOptions = {}): FieldSampler {
  const { data, width, height } = source
  const threshold = options.threshold ?? 128
  const n = width * height

  // insideGrid: seeded on OUTSIDE pixels -> gives interior thickness.
  // outsideGrid: seeded on INSIDE pixels -> gives exterior gap.
  const insideGrid: VecGrid = { x: new Float64Array(n), y: new Float64Array(n) }
  const outsideGrid: VecGrid = { x: new Float64Array(n), y: new Float64Array(n) }

  for (let i = 0; i < n; i += 1) {
    const alpha = data[i * 4 + 3] ?? 0
    const isInside = alpha > threshold

    if (isInside) {
      insideGrid.x[i] = INF
      insideGrid.y[i] = INF
      outsideGrid.x[i] = 0
      outsideGrid.y[i] = 0
    } else {
      insideGrid.x[i] = 0
      insideGrid.y[i] = 0
      outsideGrid.x[i] = INF
      outsideGrid.y[i] = INF
    }
  }

  for (const grid of [insideGrid, outsideGrid]) {
    propagate(grid, width, height, true)
    propagate(grid, width, height, false)
  }

  const sdf = new Float64Array(n)
  const nx = new Float64Array(n)
  const ny = new Float64Array(n)

  for (let i = 0; i < n; i += 1) {
    const alpha = data[i * 4 + 3] ?? 0
    const isInside = alpha > threshold
    const grid = isInside ? insideGrid : outsideGrid
    const vx = grid.x[i] ?? INF
    const vy = grid.y[i] ?? INF
    const d = Math.sqrt(vx * vx + vy * vy)

    sdf[i] = isInside ? -d : d
  }

  // Outward normals from the gradient of the SDF (it increases toward the outside).
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x
      const xm = x > 0 ? x - 1 : 0
      const xp = x < width - 1 ? x + 1 : width - 1
      const ym = y > 0 ? y - 1 : 0
      const yp = y < height - 1 ? y + 1 : height - 1
      const gx = (sdf[y * width + xp] ?? 0) - (sdf[y * width + xm] ?? 0)
      const gy = (sdf[yp * width + x] ?? 0) - (sdf[ym * width + x] ?? 0)
      const len = Math.sqrt(gx * gx + gy * gy) || 1

      nx[idx] = gx / len
      ny[idx] = gy / len
    }
  }

  const field: FieldSampler = (x: number, y: number): SdfSample => {
    const xi = x < 0 ? 0 : x >= width ? width - 1 : Math.round(x)
    const yi = y < 0 ? 0 : y >= height ? height - 1 : Math.round(y)
    const idx = yi * width + xi

    return { dist: sdf[idx] ?? 0, nx: nx[idx] ?? 0, ny: ny[idx] ?? 0 }
  }

  return field
}
