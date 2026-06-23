# @amprfi/vue-glass-effect

Vue 3 component library for Figma-style glass effects in browser UI.

It uses CSS `backdrop-filter`, SVG filters, and canvas-generated displacement maps to approximate Figma glass controls like refraction, depth, frost, light intensity, and dispersion.

## Install

From GitHub:

```bash
npm install github:amprfi/vue-glass-effect#v0.1.0
```

Or as a local sibling repo:

```bash
npm install ../vue-glass-effect
```

## Usage

```vue
<script setup lang="ts">
import { GlassCard } from '@amprfi/vue-glass-effect'
import '@amprfi/vue-glass-effect/style.css'
</script>

<template>
  <GlassCard
    class="p-6"
    :refraction="50"
    :depth="20"
    :frost="0.3"
    :light-intensity="0.65"
    :dispersion="10"
    :radius="24"
  >
    Glass content
  </GlassCard>
</template>
```

## Props

- `refraction` — Figma-like refraction amount, `0–100`
- `depth` — refractive edge band width in pixels
- `frost` — blur amount
- `lightIntensity` — specular edge highlight strength
- `dispersion` — chromatic color separation, `0–100`
- `lightAngle` — light direction in radians
- `overLight` — boosts contrast for light backdrops
- `radius` — border radius before measured CSS radius is available

## Notes

This package is web-only. It relies on browser support for `backdrop-filter` and SVG filters.

## License

MIT
