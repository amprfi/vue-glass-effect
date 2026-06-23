<script setup lang="ts">
import { computed, getCurrentInstance, ref } from 'vue'

import { useElementBox } from '../composables/useElementBox'
import { useAlphaField } from '../composables/useAlphaField'
import { useGlassData, type GlassDataInput } from '../composables/useGlassData'
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
  /**
   * Luminous base layer rendered behind the glass. Glass doesn't emit light, so over a
   * dark/flat backdrop the silhouette would render dark; a base gives the glass something
   * bright to sit over. Defaults to `src` (the shape paints itself as its own base).
   */
  baseSrc?: string
  /** Opacity of the base layer, 0–1. Use to restore a source's translucency (e.g. 0.64). */
  baseFill?: number
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
  baseSrc: undefined,
  baseFill: 1,
})

const resolvedBaseSrc = computed(() => props.baseSrc ?? silhouette.value ?? props.src)
const baseStyle = computed(() => ({
  backgroundImage: `url("${resolvedBaseSrc.value}")`,
  opacity: props.baseFill,
}))

let fallbackId = 0
const instance = getCurrentInstance()
const filterId = `ampr-glass-shape-filter-${instance?.uid ?? (fallbackId += 1)}`
const rootRef = ref<HTMLElement | null>(null)

const box = useElementBox(rootRef, 0)
const { field, silhouette } = useAlphaField(props.src, box)

const ready = computed(
  () => field.value !== null && silhouette.value !== null && box.value.width > 0 && box.value.height > 0,
)

const input = computed<GlassDataInput>(() => ({
  refraction: props.refraction,
  depth: props.depth,
  frost: props.frost,
  lightIntensity: props.lightIntensity,
  dispersion: props.dispersion,
  splay: props.splay,
  lightAngle: props.lightAngle,
  overLight: props.overLight,
  field: field.value,
  borderRadius: 0,
}))

const data = useGlassData(box, input)

const rootStyle = computed(() => {
  const size = typeof props.size === 'number' ? `${props.size}px` : props.size
  // The mask uses the opaque silhouette (not the source) so translucency in the source
  // can't cap the brightness of the layers behind the mask.
  const maskSrc = silhouette.value ?? props.src

  return {
    width: size,
    height: size,
    '--ampr-glass-filter': `url(#${filterId})`,
    '--ampr-glass-frost': data.value.frostFilter,
    '--ampr-shape-mask': `url("${maskSrc}")`,
  }
})

const rimStyle = computed(() => ({
  backgroundImage: `url("${data.value.specularUrl}")`,
  opacity: data.value.rimOpacity,
}))
const shadowStyle = computed(() => ({ backgroundImage: `url("${data.value.shadowUrl}")` }))
const highlightStyle = computed(() => ({ backgroundImage: `url("${data.value.highlightUrl}")` }))
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
      v-if="data.ready && ready"
      :filter-id="filterId"
      :width="box.width"
      :height="box.height"
      :displacement-url="data.displacementUrl"
      :scale="data.scale"
      :dispersion="data.dispersion"
    />

    <!-- Luminous base: the glyph paints itself bright beneath the glass. -->
    <div class="ampr-glass-layer ampr-glass-shape-base" :style="baseStyle" />

    <div class="ampr-glass-layer ampr-glass-frost" />
    <div class="ampr-glass-layer ampr-glass-refract" />
    <div class="ampr-glass-layer ampr-glass-shape-tint" :class="{ 'ampr-glass-tint--over-light': overLight }" />
    <div class="ampr-glass-layer ampr-glass-rim" :style="rimStyle" />
    <div class="ampr-glass-layer ampr-glass-shadow" :style="shadowStyle" />
    <div class="ampr-glass-layer ampr-glass-highlight" :style="highlightStyle" />
  </div>
</template>
