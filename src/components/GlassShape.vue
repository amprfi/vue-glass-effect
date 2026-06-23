<script setup lang="ts">
import { computed, getCurrentInstance, ref } from 'vue'

import { useElementBox } from '../composables/useElementBox'
import { useAlphaField } from '../composables/useAlphaField'
import GlassFilterSvg from './GlassFilterSvg.vue'
import { DEFAULT_GLASS_PARAMS, DEFAULT_LIGHT_ANGLE, DEFAULT_SPLAY } from '../types'

interface GlassShapeProps {
  /** Source SVG/image whose alpha silhouette becomes the glass shape. */
  src: string
  refraction?: number
  depth?: number
  frost?: number
  lightIntensity?: number
  dispersion?: number
  splay?: number
  lightAngle?: number
  overLight?: boolean
  /** Rendered width/height of the shape (the shape is square). */
  size?: number | string
  /** Accessible label, since the visual is decorative glass. */
  alt?: string
}

defineOptions({
  name: 'GlassShape',
})

const props = withDefaults(defineProps<GlassShapeProps>(), {
  refraction: DEFAULT_GLASS_PARAMS.refraction,
  depth: DEFAULT_GLASS_PARAMS.depth,
  frost: DEFAULT_GLASS_PARAMS.frost,
  lightIntensity: DEFAULT_GLASS_PARAMS.lightIntensity,
  dispersion: DEFAULT_GLASS_PARAMS.dispersion,
  splay: DEFAULT_SPLAY,
  lightAngle: DEFAULT_LIGHT_ANGLE,
  overLight: false,
  size: 32,
  alt: '',
})

let fallbackId = 0
const instance = getCurrentInstance()
const filterId = `ampr-glass-shape-filter-${instance?.uid ?? (fallbackId += 1)}`
const rootRef = ref<HTMLElement | null>(null)

const box = useElementBox(rootRef, 0)
const field = useAlphaField(props.src, box)

const ready = computed(() => field.value !== null && box.value.width > 0 && box.value.height > 0)

const rootStyle = computed(() => {
  const size = typeof props.size === 'number' ? `${props.size}px` : props.size

  return {
    width: size,
    height: size,
    '--ampr-glass-filter': `url(#${filterId})`,
    '--ampr-shape-mask': `url("${props.src}")`,
  }
})
</script>

<template>
  <div
    ref="rootRef"
    class="ampr-glass-shape"
    :class="{ 'ampr-glass-shape--over-light': overLight }"
    :style="rootStyle"
    role="img"
    :aria-label="alt"
  >
    <GlassFilterSvg
      v-if="ready"
      :field="field"
      :filter-id="filterId"
      :width="box.width"
      :height="box.height"
      :border-radius="0"
      :refraction="refraction"
      :depth="depth"
      :frost="frost"
      :light-intensity="lightIntensity"
      :dispersion="dispersion"
      :splay="splay"
      :light-angle="lightAngle"
      :over-light="overLight"
    />
  </div>
</template>
