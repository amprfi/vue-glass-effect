import { roundedRectSdf } from './geometry'

export interface EdgeMapOptions {
  width: number
  height: number
  borderRadius: number
  depth: number
}

export interface DisplacementMapOptions extends EdgeMapOptions {
  profile: Float64Array
  maxDisplacement: number
}

export interface LightMapOptions extends EdgeMapOptions {
  lightAngle: number
}

export interface InnerLightMaps {
  shadowUrl: string
  highlightUrl: string
}

function canUseCanvas(): boolean {
  return typeof document !== 'undefined'
}

function createImageBuffer(width: number, height: number): { canvas: HTMLCanvasElement; image: ImageData } | null {
  if (!canUseCanvas() || width <= 0 || height <= 0) {
    return null
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))

  const context = canvas.getContext('2d', { willReadFrequently: false })
  if (!context) {
    return null
  }

  return {
    canvas,
    image: context.createImageData(canvas.width, canvas.height),
  }
}

function commitImageBuffer(canvas: HTMLCanvasElement, image: ImageData): string {
  const context = canvas.getContext('2d')
  if (!context) {
    return ''
  }

  context.putImageData(image, 0, 0)
  return canvas.toDataURL('image/png')
}

/**
 * Generates an RG displacement map. Red offsets X, green offsets Y, and 128 is neutral.
 */
export function generateDisplacementMap(options: DisplacementMapOptions): string {
  const width = Math.max(1, Math.round(options.width))
  const height = Math.max(1, Math.round(options.height))
  const buffer = createImageBuffer(width, height)

  if (!buffer) {
    return ''
  }

  const { canvas, image } = buffer
  const { data } = image
  const depth = Math.max(1, options.depth)
  const profileLength = options.profile.length
  const maxDisplacement = Math.max(1, Math.abs(options.maxDisplacement))

  for (let index = 0; index < data.length; index += 4) {
    data[index] = 128
    data[index + 1] = 128
    data[index + 2] = 0
    data[index + 3] = 255
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const { dist, nx, ny } = roundedRectSdf(x, y, width, height, options.borderRadius)

      // Keep a 1px outer feather so the displaced edge anti-aliases cleanly.
      if (dist > 1) {
        continue
      }

      const fromEdge = -dist
      if (fromEdge >= depth) {
        continue
      }

      const opacity = dist > 0 ? 1 - dist : 1
      if (opacity <= 0) {
        continue
      }

      const profileIndex = Math.min(Math.floor((Math.max(0, fromEdge) / depth) * profileLength), profileLength - 1)
      const displacement = options.profile[profileIndex] ?? 0
      const dX = (-nx * displacement) / maxDisplacement
      const dY = (-ny * displacement) / maxDisplacement
      const dataIndex = (y * width + x) * 4

      data[dataIndex] = Math.max(0, Math.min(255, Math.round(128 + dX * 127 * opacity)))
      data[dataIndex + 1] = Math.max(0, Math.min(255, Math.round(128 + dY * 127 * opacity)))
    }
  }

  return commitImageBuffer(canvas, image)
}

/**
 * Generates the bright specular edge map. Uses abs(dot) so both light-facing and opposite
 * edges can glint, with strength controlled later in the SVG filter.
 */
export function generateSpecularMap(options: LightMapOptions): string {
  const width = Math.max(1, Math.round(options.width))
  const height = Math.max(1, Math.round(options.height))
  const buffer = createImageBuffer(width, height)

  if (!buffer) {
    return ''
  }

  const { canvas, image } = buffer
  const { data } = image
  const depth = Math.max(1, options.depth)
  const light = [Math.cos(options.lightAngle), Math.sin(options.lightAngle)] as const

  data.fill(0)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const { dist, nx, ny } = roundedRectSdf(x, y, width, height, options.borderRadius)

      if (dist > 1) {
        continue
      }

      const fromEdge = -dist
      if (fromEdge >= depth) {
        continue
      }

      const opacity = dist > 0 ? 1 - dist : 1
      if (opacity <= 0) {
        continue
      }

      const directionalStrength = Math.abs(nx * light[0] + -ny * light[1])
      const edgeFalloff = Math.sqrt(Math.max(0, 1 - (1 - Math.max(0, fromEdge)) ** 2))
      const alpha = Math.round(255 * Math.pow(directionalStrength * edgeFalloff, 1.5) * opacity)
      const dataIndex = (y * width + x) * 4

      data[dataIndex] = 255
      data[dataIndex + 1] = 255
      data[dataIndex + 2] = 255
      data[dataIndex + 3] = Math.max(0, Math.min(255, alpha))
    }
  }

  return commitImageBuffer(canvas, image)
}

/**
 * Generates directional inner shadow and inner highlight maps. These make light angle
 * changes visible around the whole perimeter, not just in fixed CSS box shadows.
 */
export function generateInnerLightMaps(options: LightMapOptions): InnerLightMaps {
  const width = Math.max(1, Math.round(options.width))
  const height = Math.max(1, Math.round(options.height))
  const shadowBuffer = createImageBuffer(width, height)
  const highlightBuffer = createImageBuffer(width, height)

  if (!shadowBuffer || !highlightBuffer) {
    return { shadowUrl: '', highlightUrl: '' }
  }

  const shadowData = shadowBuffer.image.data
  const highlightData = highlightBuffer.image.data
  const depth = Math.max(1, options.depth)
  const light = [Math.cos(options.lightAngle), Math.sin(options.lightAngle)] as const

  shadowData.fill(0)
  highlightData.fill(0)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const { dist, nx, ny } = roundedRectSdf(x, y, width, height, options.borderRadius)

      if (dist > 1) {
        continue
      }

      const fromEdge = -dist
      if (fromEdge < 0 || fromEdge >= depth) {
        continue
      }

      const fade = 1 - fromEdge / depth
      const opacity = Math.max(0, Math.min(1, fade * fade))
      const directional = nx * light[0] + ny * light[1]
      const dataIndex = (y * width + x) * 4

      if (directional < 0) {
        const alpha = Math.round(255 * -directional * opacity)
        shadowData[dataIndex] = 0
        shadowData[dataIndex + 1] = 0
        shadowData[dataIndex + 2] = 0
        shadowData[dataIndex + 3] = Math.max(0, Math.min(255, alpha))
      } else {
        const alpha = Math.round(255 * directional * opacity)
        highlightData[dataIndex] = 255
        highlightData[dataIndex + 1] = 255
        highlightData[dataIndex + 2] = 255
        highlightData[dataIndex + 3] = Math.max(0, Math.min(255, alpha))
      }
    }
  }

  return {
    shadowUrl: commitImageBuffer(shadowBuffer.canvas, shadowBuffer.image),
    highlightUrl: commitImageBuffer(highlightBuffer.canvas, highlightBuffer.image),
  }
}
