#!/usr/bin/env node
/**
 * Builds paints.json from a local checkout of the Paint Commons catalog
 * (https://github.com/paintcommons/catalog, CC0-1.0 with MIT-licensed Arcturus records).
 *
 * Usage:
 *   git clone https://github.com/paintcommons/catalog /tmp/paintcommons
 *   git -C /tmp/paintcommons checkout <PINNED_COMMIT>
 *   node scripts/import-paintcommons.mjs /tmp/paintcommons
 *
 * - Only current (not discontinued) paints with a colour are imported.
 * - Existing Spanish names are kept when brand + English name match the previous paints.json;
 *   otherwise name_es falls back to the English name.
 * - Previous ids are kept as `aliases` so saved collections/settings keep working.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PINNED_COMMIT = '46946c5';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'paints.json');

// [Paint Commons folder, range file, ChromaMini brand label, id prefix]
const SCOPE = [
  ['citadel', 'base', 'Citadel', 'cit'],
  ['citadel', 'layer', 'Citadel', 'cit'],
  ['citadel', 'shade', 'Citadel', 'cit'],
  ['citadel', 'contrast', 'Citadel', 'cit'],
  ['citadel', 'dry', 'Citadel', 'cit'],
  ['vallejo', 'model-color', 'Vallejo Model Color', 'vmc'],
  ['vallejo', 'model-color-metallic', 'Vallejo Model Color', 'vmc'],
  ['vallejo', 'game-color', 'Vallejo Game Color', 'vgc'],
  ['vallejo', 'game-color-ink', 'Vallejo Game Color', 'vgc'],
  ['vallejo', 'game-color-metallic', 'Vallejo Game Color', 'vgc'],
  ['vallejo', 'game-wash', 'Vallejo Game Color', 'vgc'],
  ['vallejo', 'xpress-color', 'Vallejo Game Color', 'vgc'],
  ['vallejo', 'xpress-color-intense', 'Vallejo Game Color', 'vgc'],
  ['green-stuff-world', 'acrylic-colors', 'Green Stuff World', 'gsw'],
  ['green-stuff-world', 'metallic-colors', 'Green Stuff World', 'gsw'],
  ['green-stuff-world', 'wash-ink', 'Green Stuff World', 'gsw'],
  ['green-stuff-world', 'intensity-ink', 'Green Stuff World', 'gsw'],
  ['ak-interactive', 'standard-3rd-gen', 'AK 3rd Gen', 'ak'],
  ['ak-interactive', 'intense-3rd-gen', 'AK 3rd Gen', 'ak'],
  ['ak-interactive', 'figures-3rd-gen', 'AK 3rd Gen', 'ak'],
  ['ak-interactive', 'metallic-3rd-gen', 'AK 3rd Gen', 'ak'],
  ['ak-interactive', 'ink-3rd-gen', 'AK 3rd Gen', 'ak'],
  ['the-army-painter', 'warpaints-fanatic', 'The Army Painter', 'ap'],
  ['the-army-painter', 'warpaints-fanatic-metallic', 'The Army Painter', 'ap'],
  ['the-army-painter', 'warpaints-fanatic-wash', 'The Army Painter', 'ap'],
  ['the-army-painter', 'speedpaint-2-0', 'The Army Painter', 'ap']
];

const CONTRAST_RANGES = /contrast|xpress|speedpaint/i;
const SKIP_TYPES = new Set(['effect', 'primer', 'medium', 'varnish']);

function mapType(paint) {
  if (SKIP_TYPES.has(paint.type)) return null;
  if (paint.type === 'metallic') return 'Metálico';
  if (paint.type === 'wash' || paint.type === 'ink') return 'Wash / Tinta';
  if (paint.type === 'speedpaint' || CONTRAST_RANGES.test(paint.range)) return 'Contrast / Xpress';
  if (paint.type === 'acrylic') return 'Base';
  return null;
}

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const slug = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const src = process.argv[2];
if (!src || !existsSync(join(src, 'paints'))) {
  console.error('Usage: node scripts/import-paintcommons.mjs <path-to-paintcommons-catalog>');
  process.exit(1);
}
let commit = 'unknown';
try { commit = execFileSync('git', ['-C', src, 'rev-parse', '--short', 'HEAD']).toString().trim(); } catch { /* not a git checkout */ }
if (!commit.startsWith(PINNED_COMMIT)) console.warn(`Warning: catalog at ${commit}, pinned commit is ${PINNED_COMMIT}`);

// Previous database: Spanish names + legacy ids
const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : [];
const legacyByKey = new Map();
for (const p of previous) {
  const key = `${p.brand}|${norm(p.name_en)}`;
  if (!legacyByKey.has(key)) legacyByKey.set(key, p);
  for (const alias of p.aliases || []) legacyByKey.set(`alias|${alias}`, p);
}

const out = [];
const usedIds = new Set();
const stats = { skippedType: 0, skippedStatus: 0, skippedNoColour: 0, keptSpanish: 0 };
const matchedLegacy = new Set();

for (const [folder, file, brand, prefix] of SCOPE) {
  const data = JSON.parse(readFileSync(join(src, 'paints', folder, `${file}.json`), 'utf8'));
  for (const p of data) {
    if (p.status !== 'current') { stats.skippedStatus++; continue; }
    const hex = p.colour && p.colour.hex;
    if (!hex) { stats.skippedNoColour++; continue; }
    const type = mapType(p);
    if (!type) { stats.skippedType++; continue; }

    let id = `${prefix}-${slug(p.name)}`;
    if (usedIds.has(id)) id = `${id}-${slug(p.code || p.range)}`;
    if (usedIds.has(id)) id = `${id}-${p.id.slice(0, 6)}`;
    usedIds.add(id);

    const legacy = legacyByKey.get(`${brand}|${norm(p.name)}`);
    const nameEs = legacy && legacy.name_es ? legacy.name_es : p.name;
    if (legacy && legacy.name_es && legacy.name_es !== p.name) stats.keptSpanish++;

    const record = {
      id,
      brand,
      range: p.range,
      name_es: nameEs,
      name_en: p.name,
      code: p.code || '',
      type,
      hex: hex.toUpperCase(),
      source: p.colour.source
    };
    if (legacy && !matchedLegacy.has(legacy.id)) {
      matchedLegacy.add(legacy.id);
      const aliases = [...new Set([...(legacy.aliases || []), legacy.id].filter(a => a !== id))];
      if (aliases.length) record.aliases = aliases;
    }
    out.push(record);
  }
}

writeFileSync(OUT, '[\n' + out.map(r => '  ' + JSON.stringify(r)).join(',\n') + '\n]\n');

const byBrand = out.reduce((acc, p) => ({ ...acc, [p.brand]: (acc[p.brand] || 0) + 1 }), {});
const byType = out.reduce((acc, p) => ({ ...acc, [p.type]: (acc[p.type] || 0) + 1 }), {});
const unmatched = previous.filter(p => !matchedLegacy.has(p.id)).map(p => `${p.brand} · ${p.name_en}`);
console.log(`Paint Commons ${commit}: wrote ${out.length} paints to paints.json`);
console.log('By brand:', byBrand);
console.log('By type:', byType);
console.log('Skipped:', stats);
console.log(`Previous paints without a match (${unmatched.length}):`, unmatched.join('; '));
