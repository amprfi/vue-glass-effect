<script setup lang="ts">
import { computed } from 'vue'

import {
  calculateRefractionProfile,
  refractionToMaterialParams,
  type FieldSampler,
} from '../utils/geometry'
import {
  generateDisplacementMap,
  generateInnerLightMaps,
  generateSpecularMap,
} from '../utils/maps'
import { frostToBlur } from '../utils/frost'
import { DEFAULT_GLASS_PARAMS, DEFAULT_LIGHT_ANGLE, DEFAULT_SPLAY, MIN_FROST_OVER_LIGHT } from '../types'

interface GlassFilterSvgProps {
  filterId: string
  width: number
  height: number
  borderRadius: number
  refraction?: number
  depth?: number
  frost?: number
  lightIntensity?: number
  dispersion?: number
  splay?: number
  lightAngle?: number
  overLight?: boolean
  /** Optional silhouette field; when omitted a rounded rectangle is used. */
  field?: FieldSampler | null
}

const props = withDefaults(defineProps<GlassFilterSvgProps>(), {
  refraction: DEFAULT_GLASS_PARAMS.refraction,
  depth: DEFAULT_GLASS_PARAMS.depth,
  frost: DEFAULT_GLASS_PARAMS.frost,
  lightIntensity: DEFAULT_GLASS_PARAMS.lightIntensity,
  dispersion: DEFAULT_GLASS_PARAMS.dispersion,
  splay: DEFAULT_SPLAY,
  lightAngle: DEFAULT_LIGHT_ANGLE,
  overLight: false,
  field: null,
})

const SPECULAR_SATURATION = 4
const SCALE_RATIO = 1

const filterData = computed(() => {
  const width = Math.max(1, Math.round(props.width))
  const height = Math.max(1, Math.round(props.height))
  const borderRadius = Math.max(0, Math.round(props.borderRadius))
  const maxDepth = Math.max(1, Math.min(width, height) / 2 - 1)
  const depth = Math.max(1, Math.min(props.depth, maxDepth))
  const { ior, glassThickness } = refractionToMaterialParams(props.refraction)
  const profile = calculateRefractionProfile(glassThickness, depth, ior, 128)
  let maxDisplacement = 1

  for (const sample of profile) {
    maxDisplacement = Math.max(maxDisplacement, Math.abs(sample))
  }

  const displacementUrl = generateDisplacementMap({
    width,
    height,
    borderRadius,
    depth,
    field: props.field ?? undefined,
    profile,
    maxDisplacement,
  })

  const specularDepth = Math.min(Math.max(1, depth * 2.5), Math.min(width, height) / 2)
  const specularUrl = generateSpecularMap({
    width,
    height,
    borderRadius,
    depth: specularDepth,
    field: props.field ?? undefined,
    splay: props.splay,
    lightAngle: props.lightAngle,
  })

  const innerLightMaps = generateInnerLightMaps({
    width,
    height,
    borderRadius,
    depth: Math.min(Math.max(1, depth * 1.6), Math.min(width, height) / 2),
    field: props.field ?? undefined,
    splay: props.splay,
    lightAngle: props.lightAngle,
  })

  const frostScale = props.overLight ? Math.max(MIN_FROST_OVER_LIGHT, props.frost) : props.frost

  return {
    width,
    height,
    displacementUrl,
    specularUrl,
    shadowUrl: innerLightMaps.shadowUrl,
    highlightUrl: innerLightMaps.highlightUrl,
    scale: maxDisplacement * SCALE_RATIO,
    frost: frostToBlur(frostScale),
    lightIntensity: props.overLight ? Math.max(0.8, props.lightIntensity) : props.lightIntensity,
    dispersion: Math.max(0, Math.min(100, props.dispersion)),
  }
})
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="0"
    height="0"
    class="ampr-glass-filter-svg"
    aria-hidden="true"
    focusable="false"
    color-interpolation-filters="sRGB"
  >
    <defs>
      <filter :id="filterId" x="0%" y="0%" width="100%" height="100%">
        <feGaussianBlur
          in="SourceGraphic"
          :stdDeviation="filterData.frost"
          result="blurred_source"
        />

        <feImage
          :href="filterData.displacementUrl"
          x="0"
          y="0"
          :width="filterData.width"
          :height="filterData.height"
          result="disp_map"
        />

        <template v-if="filterData.dispersion > 0">
          <feColorMatrix
            in="blurred_source"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="src_r"
          />
          <feColorMatrix
            in="blurred_source"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="src_g"
          />
          <feColorMatrix
            in="blurred_source"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="src_b"
          />

          <feDisplacementMap
            in="src_r"
            in2="disp_map"
            :scale="filterData.scale * (1 + (filterData.dispersion / 100) * 0.15)"
            xChannelSelector="R"
            yChannelSelector="G"
            result="disp_r"
          />
          <feDisplacementMap
            in="src_g"
            in2="disp_map"
            :scale="filterData.scale"
            xChannelSelector="R"
            yChannelSelector="G"
            result="disp_g"
          />
          <feDisplacementMap
            in="src_b"
            in2="disp_map"
            :scale="filterData.scale * (1 - (filterData.dispersion / 100) * 0.15)"
            xChannelSelector="R"
            yChannelSelector="G"
            result="disp_b"
          />

          <feBlend in="disp_r" in2="disp_g" mode="screen" result="disp_rg" />
          <feBlend in="disp_rg" in2="disp_b" mode="screen" result="displaced" />
        </template>

        <feDisplacementMap
          v-else
          in="blurred_source"
          in2="disp_map"
          :scale="filterData.scale"
          xChannelSelector="R"
          yChannelSelector="G"
          result="displaced"
        />

        <feColorMatrix
          in="displaced"
          type="saturate"
          :values="String(SPECULAR_SATURATION)"
          result="displaced_sat"
        />

        <feImage
          :href="filterData.specularUrl"
          x="0"
          y="0"
          :width="filterData.width"
          :height="filterData.height"
          result="spec_layer"
        />
        <feComposite
          in="displaced_sat"
          in2="spec_layer"
          operator="in"
          result="spec_masked"
        />
        <feBlend in="spec_masked" in2="displaced" mode="normal" result="with_saturation" />
        <feComponentTransfer in="spec_layer" result="spec_faded">
          <feFuncA type="linear" :slope="filterData.lightIntensity" />
        </feComponentTransfer>
        <feBlend in="spec_faded" in2="with_saturation" mode="screen" result="with_specular" />

        <feImage
          :href="filterData.shadowUrl"
          x="0"
          y="0"
          :width="filterData.width"
          :height="filterData.height"
          result="inner_shadow"
        />
        <feComponentTransfer in="inner_shadow" result="inner_shadow_faded">
          <feFuncA type="linear" slope="0.16" />
        </feComponentTransfer>
        <feBlend in="inner_shadow_faded" in2="with_specular" mode="multiply" result="with_inner_shadow" />

        <feImage
          :href="filterData.highlightUrl"
          x="0"
          y="0"
          :width="filterData.width"
          :height="filterData.height"
          result="inner_highlight"
        />
        <feComponentTransfer in="inner_highlight" result="inner_highlight_faded">
          <feFuncA type="linear" slope="0.22" />
        </feComponentTransfer>
        <feBlend in="inner_highlight_faded" in2="with_inner_shadow" mode="screen" />
      </filter>
    </defs>
  </svg>
</template>
