<script setup lang="ts">
import { computed, getCurrentInstance, ref } from 'vue'

import { useElementBox } from '../composables/useElementBox'
import { useGlassData, type GlassDataInput } from '../composables/useGlassData'
import GlassFilterSvg from './GlassFilterSvg.vue'
import { DEFAULT_GLASS_PARAMS, DEFAULT_LIGHT_ANGLE, DEFAULT_SPLAY } from '../types'

interface GlassCardProps {
  refraction?: number
  depth?: number
  frost?: number
  lightIntensity?: number
  dispersion?: number
  splay?: number
  lightAngle?: number
  overLight?: boolean
  radius?: number | string
}

defineOptions({
  name: 'GlassCard',
})

const props = withDefaults(defineProps<GlassCardProps>(), {
  refraction: DEFAULT_GLASS_PARAMS.refraction,
  depth: DEFAULT_GLASS_PARAMS.depth,
  frost: DEFAULT_GLASS_PARAMS.frost,
  lightIntensity: DEFAULT_GLASS_PARAMS.lightIntensity,
  dispersion: DEFAULT_GLASS_PARAMS.dispersion,
  splay: DEFAULT_SPLAY,
  lightAngle: DEFAULT_LIGHT_ANGLE,
  overLight: false,
  radius: '1rem',
})

let fallbackId = 0
const instance = getCurrentInstance()
const filterId = `ampr-glass-filter-${instance?.uid ?? (fallbackId += 1)}`
const rootRef = ref<HTMLElement | null>(null)
const fallbackRadius = computed(() => (typeof props.radius === 'number' ? props.radius : 16))
const box = useElementBox(rootRef, fallbackRadius.value)

const input = computed<GlassDataInput>(() => ({
  refraction: props.refraction,
  depth: props.depth,
  frost: props.frost,
  lightIntensity: props.lightIntensity,
  dispersion: props.dispersion,
  splay: props.splay,
  lightAngle: props.lightAngle,
  overLight: props.overLight,
  field: null,
  borderRadius: box.value.borderRadius,
}))

const data = useGlassData(box, input)

const rootStyle = computed(() => {
  const radius = typeof props.radius === 'number' ? `${props.radius}px` : props.radius

  return {
    '--ampr-glass-radius': radius,
    '--ampr-glass-filter': `url(#${filterId})`,
    '--ampr-glass-frost': data.value.frostFilter,
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
    class="ampr-glass-card"
    :class="{ 'ampr-glass-card--over-light': overLight }"
    :style="rootStyle"
  >
    <GlassFilterSvg
      v-if="data.ready"
      :filter-id="filterId"
      :width="box.width"
      :height="box.height"
      :displacement-url="data.displacementUrl"
      :scale="data.scale"
      :dispersion="data.dispersion"
    />

    <!-- Tier 1: frost (universal backdrop blur, isolated so url() can't invalidate it) -->
    <div class="ampr-glass-layer ampr-glass-frost" />

    <!-- Tier 3: refraction + dispersion (backdrop-filter: url() — Chromium only) -->
    <div class="ampr-glass-layer ampr-glass-refract" />

    <!-- Tier 0: tint + inset edge -->
    <div class="ampr-glass-layer ampr-glass-tint" :class="{ 'ampr-glass-tint--over-light': overLight }" />

    <!-- Tier 2: edge light (universal blended overlays) -->
    <div class="ampr-glass-layer ampr-glass-rim" :style="rimStyle" />
    <div class="ampr-glass-layer ampr-glass-shadow" :style="shadowStyle" />
    <div class="ampr-glass-layer ampr-glass-highlight" :style="highlightStyle" />

    <slot />
  </div>
</template>
