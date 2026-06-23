<script setup lang="ts">
/**
 * Renders the refraction + dispersion SVG filter only (it displaces the backdrop
 * by a generated map and splits it into RGB channels for chromatic aberration).
 *
 * Frost (backdrop blur) and edge light (specular / inner shadow / inner highlight)
 * are intentionally NOT part of this filter: they're applied via separate, universally
 * supported layers (CSS backdrop-filter: blur() and blended background-image overlays).
 * Keeping `url()` isolated means that in browsers without `backdrop-filter: url()`
 * support (Firefox/Safari), only this refraction layer silently no-ops while the rest
 * of the glass treatment keeps rendering.
 */
interface GlassFilterSvgProps {
  filterId: string
  width: number
  height: number
  /** RG displacement map data URL. */
  displacementUrl: string
  /** Displacement scale passed to feDisplacementMap. */
  scale: number
  /** Chromatic channel separation, 0–100. */
  dispersion?: number
}

const props = withDefaults(defineProps<GlassFilterSvgProps>(), {
  dispersion: 0,
})

const SPECULAR_SATURATION = 4
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
        <feImage
          :href="props.displacementUrl"
          x="0"
          y="0"
          :width="props.width"
          :height="props.height"
          result="disp_map"
        />

        <template v-if="props.dispersion > 0">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="src_r"
          />
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="src_g"
          />
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="src_b"
          />

          <feDisplacementMap
            in="src_r"
            in2="disp_map"
            :scale="props.scale * (1 + (props.dispersion / 100) * 0.15)"
            xChannelSelector="R"
            yChannelSelector="G"
            result="disp_r"
          />
          <feDisplacementMap
            in="src_g"
            in2="disp_map"
            :scale="props.scale"
            xChannelSelector="R"
            yChannelSelector="G"
            result="disp_g"
          />
          <feDisplacementMap
            in="src_b"
            in2="disp_map"
            :scale="props.scale * (1 - (props.dispersion / 100) * 0.15)"
            xChannelSelector="R"
            yChannelSelector="G"
            result="disp_b"
          />

          <feBlend in="disp_r" in2="disp_g" mode="screen" result="disp_rg" />
          <feBlend in="disp_rg" in2="disp_b" mode="screen" result="displaced" />
        </template>

        <feDisplacementMap
          v-else
          in="SourceGraphic"
          in2="disp_map"
          :scale="props.scale"
          xChannelSelector="R"
          yChannelSelector="G"
          result="displaced"
        />

        <feColorMatrix
          in="displaced"
          type="saturate"
          :values="String(SPECULAR_SATURATION)"
        />
      </filter>
    </defs>
  </svg>
</template>
