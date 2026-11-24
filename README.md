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
| `paints.json` | Paint database (generated): `{ id, brand, range, name_es, name_en, code, type, hex, source, aliases? }`. |
| `scripts/import-paintcommons.mjs` | Regenerates `paints.json` from the Paint Commons catalog. |
| `THIRD_PARTY_NOTICES.md` | Data credits and licences. |
| `manifest.webmanifest`, `sw.js`, `icons/` | PWA manifest, offline cache, app icons. |

## Paint data

`paints.json` holds ~1,300 current paints from Citadel, Vallejo (Model/Game/Xpress), Green Stuff World,
AK 3rd Gen and The Army Painter, imported from [Paint Commons](https://github.com/paintcommons/catalog)
(CC0, with MIT-licensed records credited in `THIRD_PARTY_NOTICES.md`). Colours are approximate samples of
manufacturer charts, not lab measurements.

To refresh it:

```bash
git clone https://github.com/paintcommons/catalog /tmp/paintcommons
node scripts/import-paintcommons.mjs /tmp/paintcommons
```

The script keeps existing Spanish names and stores old ids as `aliases`, so saved collections keep working.
Colour corrections are best sent upstream to Paint Commons so every project benefits.

## Local development

`paints.json` is loaded with `fetch`, so serve the folder over HTTP instead of opening the file directly:

```bash
python3 -m http.server 8000
```

When you change files cached by the service worker, bump `CACHE_VERSION` in `sw.js`.
