# ChromaMini

Perceptual converter and comparator for acrylic paints used in scale modeling. Includes support for color blindness.

Live: https://firezenk.github.io/chromamini/

## Features

- Bilingual UI (ES / EN), remembered between visits.
- Closest-match search using **CIEDE2000** (ΔE00) over CIELAB.
- Color blindness simulation and LMS daltonization (protan, deutan, tritan, achromat).
- Installable PWA with offline support (service worker).
- Painter's toolkit, driven by the current reference color:
  - **Highlights & shadows**: 5-step ramp (optional cool shadows / warm highlights) plus a suggested wash.
  - **My collection**: mark owned paints, keep a shopping list, export/import, filter catalog and matches.
  - **Mixer**: up to 3 paints by parts, estimated result and closest commercial paints.
  - **Color schemes**: complementary, split, triadic, analogous and tetradic, with a color blind check.

## Project layout

| File | Purpose |
|------|---------|
| `index.html` | The whole app (UI, color math, i18n). |
| `paints.json` | Paint database: `{ id, brand, range, name_es, name_en, code, type, hex }`. |
| `manifest.webmanifest`, `sw.js`, `icons/` | PWA manifest, offline cache, app icons. |

## Contributing paints

Add an entry to `paints.json`. `type` must be one of `Base`, `Metálico`, `Wash / Tinta`, `Contrast / Xpress`, and `brand` must be listed in `ALL_BRANDS` inside `index.html`.

## Local development

`paints.json` is loaded with `fetch`, so serve the folder over HTTP instead of opening the file directly:

```bash
python3 -m http.server 8000
```

When you change files cached by the service worker, bump `CACHE_VERSION` in `sw.js`.
