<script setup lang="ts">
import { computed, getCurrentInstance, ref } from 'vue'

import { useElementBox } from '../composables/useElementBox'
import GlassFilterSvg from './GlassFilterSvg.vue'
import { DEFAULT_GLASS_PARAMS, DEFAULT_LIGHT_ANGLE } from '../types'

interface GlassCardProps {
  refraction?: number
  depth?: number
  frost?: number
  lightIntensity?: number
  dispersion?: number
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

const hasMeasuredBox = computed(() => box.value.width > 0 && box.value.height > 0)

const glassStyle = computed(() => {
  const radius = typeof props.radius === 'number' ? `${props.radius}px` : props.radius

  return {
    '--ampr-glass-filter': `url(#${filterId})`,
    '--ampr-glass-radius': radius,
  }
})
</script>

<template>
  <div
    ref="rootRef"
    class="ampr-glass-card"
    :class="{ 'ampr-glass-card--over-light': overLight }"
    :style="glassStyle"
  >
    <GlassFilterSvg
      v-if="hasMeasuredBox"
      :filter-id="filterId"
      :width="box.width"
      :height="box.height"
      :border-radius="box.borderRadius"
      :refraction="refraction"
      :depth="depth"
      :frost="frost"
      :light-intensity="lightIntensity"
      :dispersion="dispersion"
      :light-angle="lightAngle"
      :over-light="overLight"
    />
    <slot />
  </div>
</template>
