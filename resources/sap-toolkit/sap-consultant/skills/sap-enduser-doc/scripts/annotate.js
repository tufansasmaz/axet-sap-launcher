#!/usr/bin/env node
/**
 * annotate.js — Draws numbered callouts on captured screenshots.
 *
 * Usage:
 *   node scripts/annotate.js work/shots/ [--color "#e5484d"]
 *
 * Reads <dir>/markers.json (written by capture.js):
 *   { "scale": 2, "shots": { "step-01-selection": [ {label, x, y, width, height}, ... ] } }
 *
 * For each shot it produces <name>-annotated.png with, per marker:
 *   - a rounded highlight rectangle around the element
 *   - a numbered circle (①-style) anchored at the element's top-left corner
 *
 * The document text must use the same numbers (①, ②...) so text and image align.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const dir = path.resolve(process.argv[2] || '');
if (!dir || !fs.existsSync(path.join(dir, 'markers.json'))) {
  console.error('Usage: node annotate.js <shots-dir>  (must contain markers.json)');
  process.exit(1);
}
const colorIdx = process.argv.indexOf('--color');
const COLOR = colorIdx > -1 ? process.argv[colorIdx + 1] : '#e5484d';

const { scale = 2, shots = {} } = JSON.parse(fs.readFileSync(path.join(dir, 'markers.json'), 'utf8'));

function overlaySvg(width, height, marks) {
  const R = 14 * scale;          // callout circle radius
  const stroke = 1.5 * scale;
  const font = 15 * scale;
  const pad = 3 * scale;         // highlight padding around the element

  const parts = marks.map(m => {
    const x = m.x * scale, y = m.y * scale, w = m.width * scale, h = m.height * scale;
    // Circle sits just outside the element's top-left; clamp inside the image.
    const cx = Math.max(R + 2, x - R * 0.4);
    const cy = Math.max(R + 2, y - R * 0.4);
    return `
      <rect x="${x - pad}" y="${y - pad}" width="${w + pad * 2}" height="${h + pad * 2}"
            rx="${3 * scale}" fill="none" stroke="${COLOR}" stroke-width="${stroke}"/>
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="${COLOR}"/>
      <text x="${cx}" y="${cy}" font-family="Arial, sans-serif" font-size="${font}"
            font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${m.label}</text>`;
  }).join('\n');

  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${parts}</svg>`
  );
}

(async () => {
  for (const [name, marks] of Object.entries(shots)) {
    const src = path.join(dir, `${name}.png`);
    if (!fs.existsSync(src)) {
      console.warn(`skip: ${name}.png not found`);
      continue;
    }
    const img = sharp(src);
    const { width, height } = await img.metadata();
    const out = path.join(dir, `${name}-annotated.png`);
    await img
      .composite([{ input: overlaySvg(width, height, marks), top: 0, left: 0 }])
      .png()
      .toFile(out);
    console.log(`annotated: ${out} (${marks.length} marker${marks.length > 1 ? 's' : ''})`);
  }
})().catch(err => { console.error(err); process.exit(1); });
