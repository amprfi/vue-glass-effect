# @amprfi/vue-glass-effect

Vue 3 component library for Figma-style glass effects in browser UI.

It uses CSS `backdrop-filter`, SVG filters, and canvas-generated displacement maps to approximate Figma's native glass controls: refraction, depth, frost, light intensity, dispersion, and splay.

## Install

From GitHub:

```bash
npm install github:amprfi/vue-glass-effect#v0.2.0
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
    :frost="50"
    :light-intensity="0.65"
    :dispersion="10"
    :splay="50"
    :radius="24"
  >
    Glass content
  </GlassCard>
</template>
```

## Glass shapes (logos, icons)

`GlassShape` applies the glass treatment to a source SVG/image **silhouette** rather than a
rectangle — the displacement, specular rim, dispersion, and inner light all follow the
outline of the glyph. Pass the source via `src`; it is used both as a CSS mask (to clip the
result to the glyph) and rasterized into an alpha distance field that drives the effect.

```vue
<script setup lang="ts">
import { GlassShape } from '@amprfi/vue-glass-effect'
import logoUrl from '@/assets/images/ampr_logo.svg'
</script>

<template>
  <GlassShape
    :src="logoUrl"
    :size="32"
    :refraction="88"
    :depth="11"
    :dispersion="65"
    :splay="50"
    :frost="50"
    :light-angle="-Math.PI / 4"
    :light-intensity="0.8"
    alt="Amprfi"
  />
</template>
```

Glass needs content behind it to refract; on a flat backdrop the read comes mostly from the
specular rim and dispersion. Shaped glass is computed from the source alpha, so transparent
PNGs and SVGs both work.

## Props

Shared (GlassCard + GlassShape):

- `refraction` — Figma refraction, `0–100`
- `depth` — refractive edge band width in pixels
- `frost` — background blur, `0–100`
- `lightIntensity` — specular edge highlight strength, `0–1`
- `dispersion` — chromatic color separation, `0–100`
- `splay` — how far projected light spreads across the surface, `0–100`
- `lightAngle` — light direction in radians
- `overLight` — boosts contrast for light backdrops

GlassCard only:

- `radius` — border radius before measured CSS radius is available

GlassShape only:

- `src` — source SVG/image URL defining the silhouette
- `size` — rendered width/height of the shape (number = px)
- `alt` — accessible label

## Notes

This package is web-only. It relies on browser support for `backdrop-filter` and SVG filters.

## License

MIT
