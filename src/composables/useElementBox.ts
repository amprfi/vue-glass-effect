import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

import type { MeasuredBox } from '../types'

function parsePixelValue(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function useElementBox(elementRef: Ref<HTMLElement | null>, fallbackRadius = 16): Ref<MeasuredBox> {
  const box = ref<MeasuredBox>({ width: 0, height: 0, borderRadius: fallbackRadius })
  let resizeObserver: ResizeObserver | null = null
  let animationFrame = 0

  const measure = () => {
    const element = elementRef.value
    if (!element) {
      return
    }

    const rect = element.getBoundingClientRect()
    const computed = window.getComputedStyle(element)
    const borderRadius = parsePixelValue(computed.borderTopLeftRadius || computed.borderRadius)

    box.value = {
      width: Math.max(0, Math.round(rect.width)),
      height: Math.max(0, Math.round(rect.height)),
      borderRadius: Math.round(borderRadius || fallbackRadius),
    }
  }

  const scheduleMeasure = () => {
    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame)
    }

    animationFrame = window.requestAnimationFrame(() => {
      animationFrame = 0
      measure()
    })
  }

  onMounted(() => {
    measure()

    if (typeof ResizeObserver !== 'undefined' && elementRef.value) {
      resizeObserver = new ResizeObserver(scheduleMeasure)
      resizeObserver.observe(elementRef.value)
    } else {
      window.addEventListener('resize', scheduleMeasure)
    }
  })

  onBeforeUnmount(() => {
    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame)
      animationFrame = 0
    }

    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    } else if (typeof window !== 'undefined') {
      window.removeEventListener('resize', scheduleMeasure)
    }
  })

  return box
}
