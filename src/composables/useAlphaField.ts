import { onBeforeUnmount, shallowRef, watch, type Ref } from 'vue'

import { buildAlphaField } from '../utils/alphaField'
import type { FieldSampler } from '../utils/geometry'
import type { MeasuredBox } from '../types'

/** Reuse decoded images across components/instances referencing the same source. */
const imageCache = new Map<string, HTMLImageElement>()

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src)

  if (cached && cached.complete && cached.naturalWidth > 0) {
    return Promise.resolve(cached)
  }

  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'

    image.onload = () => {
      imageCache.set(src, image)
      resolve(image)
    }
    image.onerror = () => reject(new Error(`Failed to load glass shape source: ${src}`))

    image.src = src
  })
}

function rasterize(image: HTMLImageElement, width: number, height: number): ImageData | null {
  if (typeof document === 'undefined') {
    return null
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))

  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    return null
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  try {
    return context.getImageData(0, 0, canvas.width, canvas.height)
  } catch {
    // Canvas was tainted (cross-origin source without CORS); glass cannot be shaped.
    return null
  }
}

/**
 * Loads an SVG/image source, rasterizes it at the element's current size, and builds
 * an alpha-derived distance field. Rebuilds reactively when the measured box changes.
 *
 * Returns a ref that is `null` until the field is ready (also `null` on SSR or load
 * failure), so consumers can defer rendering the SVG filter until a field exists.
 */
export function useAlphaField(
  src: string,
  box: Ref<MeasuredBox>,
  options: { threshold?: number } = {},
): Ref<FieldSampler | null> {
  const field = shallowRef<FieldSampler | null>(null)
  let disposed = false
  let version = 0

  async function rebuild(width: number, height: number): Promise<void> {
    const token = ++version

    try {
      const image = await loadImage(src)
      if (disposed || token !== version) {
        return
      }

      const imageData = rasterize(image, width, height)
      if (disposed || token !== version || !imageData) {
        return
      }

      field.value = buildAlphaField(
        { data: imageData.data, width: imageData.width, height: imageData.height },
        options,
      )
    } catch {
      field.value = null
    }
  }

  watch(
    box,
    (value) => {
      if (value.width > 0 && value.height > 0) {
        void rebuild(value.width, value.height)
      } else {
        field.value = null
      }
    },
    { immediate: true, deep: true },
  )

  onBeforeUnmount(() => {
    disposed = true
  })

  return field
}
