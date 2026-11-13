/**
 * Génère les ressources de l'expérience de lancement (écran E00) à partir de src/theme/brand.js :
 *   src/launch/launchGeometry.js       tracé lumineux du F, mot-symbole et signature vectorisés
 *   assets/launch/grain*.png           grain de papier (anti-bandes sur les halos, iOS et web)
 *   public/icons/splash-mark.png       F « éteint » de l'écran de démarrage web (#boot)
 *   public/icons/splash/launch-*.png   écrans de lancement de la PWA iOS
 *
 * Le F « éteint » du splash natif (assets/splash-icon.png) est produit par
 * generate-brand-assets.mjs avec les mêmes valeurs (brand.js → launch.dormant).
 *
 * Usage : npm run brand:assets
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { deflateSync } from 'node:zlib';
import { Resvg } from '@resvg/resvg-js';
import opentype from 'opentype.js';
import { brand, launch, logo, SPLASH_IMAGE_WIDTH } from '../src/theme/brand.js';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const round = (value, digits = 2) => Number(value.toFixed(digits));

// ── Géométrie : aplatissement d'un tracé SVG (M H V L A Z, coordonnées absolues) ──
const ARC_STEP = 0.4; // unités du cadre 100 × 100 (≈ 0,6 pt à l'écran)

const arcPoints = (x1, y1, r, large, sweep, x2, y2) => {
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const d2 = dx * dx + dy * dy;
  const radius = Math.max(r, Math.sqrt(d2));
  const coef = (large !== sweep ? 1 : -1) * Math.sqrt(Math.max(0, (radius * radius - d2) / d2));
  const cxp = coef * dy;
  const cyp = -coef * dx;
  const cx = cxp + (x1 + x2) / 2;
  const cy = cyp + (y1 + y2) / 2;
  const start = Math.atan2(dy - cyp, dx - cxp);
  let delta = Math.atan2(-dy - cyp, -dx - cxp) - start;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  const steps = Math.max(2, Math.ceil(Math.abs(delta) * radius / ARC_STEP));
  const points = [];
  for (let k = 1; k <= steps; k += 1) {
    const angle = start + (delta * k) / steps;
    points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
  }
  return points;
};

const flatten = (d) => {
  const tokens = d.match(/[MHVLAZ]|-?\d*\.?\d+/g);
  const points = [];
  let i = 0;
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  const num = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    const command = tokens[i++];
    if (command === 'M') { x = num(); y = num(); startX = x; startY = y; points.push([x, y]); }
    else if (command === 'H') { x = num(); points.push([x, y]); }
    else if (command === 'V') { y = num(); points.push([x, y]); }
    else if (command === 'L') { x = num(); y = num(); points.push([x, y]); }
    else if (command === 'A') {
      const r = num(); num(); num();
      const large = num();
      const sweep = num();
      const endX = num();
      const endY = num();
      points.push(...arcPoints(x, y, r, large, sweep, endX, endY));
      x = endX; y = endY;
    } else if (command === 'Z') {
      if (x !== startX || y !== startY) points.push([startX, startY]);
      x = startX; y = startY;
    } else throw new Error(`Commande SVG non prise en charge : ${command}`);
  }
  return points;
};

const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lengthOf = (points) => points.slice(1).reduce((sum, point, index) => sum + distance(points[index], point), 0);

// Point de la polyligne fermée le plus proche d'une cible ; l'insère s'il tombe sur un segment.
const anchor = (ring, target) => {
  let best = { gap: Infinity, index: 0, point: ring[0] };
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [ax, ay] = ring[index];
    const [bx, by] = ring[index + 1];
    const span = (bx - ax) ** 2 + (by - ay) ** 2;
    const t = span ? Math.max(0, Math.min(1, ((target[0] - ax) * (bx - ax) + (target[1] - ay) * (by - ay)) / span)) : 0;
    const point = [ax + t * (bx - ax), ay + t * (by - ay)];
    const gap = distance(point, target);
    if (gap < best.gap) best = { gap, index, point };
  }
  const open = ring.slice(0, -1);
  open.splice(best.index + 1, 0, best.point);
  return { open, at: best.index + 1 };
};

// Rééchantillonne une polyligne à pas constant le long de sa longueur.
const resample = (points, count) => {
  const total = lengthOf(points);
  const samples = [];
  let segment = 0;
  let walked = 0;
  for (let index = 0; index < count; index += 1) {
    const goal = (total * index) / (count - 1);
    while (segment < points.length - 2 && walked + distance(points[segment], points[segment + 1]) < goal) {
      walked += distance(points[segment], points[segment + 1]);
      segment += 1;
    }
    const span = distance(points[segment], points[segment + 1]) || 1;
    const t = Math.max(0, Math.min(1, (goal - walked) / span));
    samples.push([
      points[segment][0] + t * (points[segment + 1][0] - points[segment][0]),
      points[segment][1] + t * (points[segment + 1][1] - points[segment][1]),
    ]);
  }
  return samples;
};

const toPath = (points) => points.map(([x, y], index) => `${index ? 'L' : 'M'}${round(x)} ${round(y)}`).join('');

/*
 * Tracé lumineux : deux traits partent du pied du F et se rejoignent au coin supérieur droit,
 * là où la feuille sera cornée. Dérivé du contour officiel (logo.bodyUnfolded), jamais redessiné.
 */
const FOOT = [39, 82];
const CORNER = [75, 18];
const SAMPLES = 41;

const outline = flatten(logo.bodyUnfolded);
const fromFoot = anchor(outline, FOOT);
const rotated = [...fromFoot.open.slice(fromFoot.at), ...fromFoot.open.slice(0, fromFoot.at)];
const closed = [...rotated, rotated[0]];
const meet = anchor(closed, CORNER);
const loop = meet.open;
// Sens du tracé officiel (pied → flanc gauche → sommet) puis sens inverse (pied → barres → coin).
const forward = loop.slice(0, meet.at + 1);
const backward = [loop[0], ...loop.slice(meet.at).reverse()];

const trace = (points) => {
  const samples = resample(points, SAMPLES);
  return {
    d: toPath(points),
    length: round(lengthOf(points), 3),
    xs: samples.map(([x]) => round(x)),
    ys: samples.map(([, y]) => round(y)),
  };
};

// ── Typographie vectorisée (aucune police à charger pendant le lancement) ──
const font = (path) => opentype.loadSync(require.resolve(path));
const interBold = font('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf');
const interRegular = font('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf');
const playfairItalic = font('@expo-google-fonts/playfair-display/700Bold_Italic/PlayfairDisplay_700Bold_Italic.ttf');

const EM = 100; // les tracés sont exprimés pour un corps de 100 unités

// Place chaque glyphe (crénage et approche compris) ; `tracking` en em.
const layout = (typeface, text, size, tracking, originX = 0) => {
  const scale = size / typeface.unitsPerEm;
  const glyphs = typeface.stringToGlyphs(text);
  let cursor = originX;
  const placed = glyphs.map((glyph, index) => {
    const x = cursor;
    const kerning = index < glyphs.length - 1 ? typeface.getKerningValue(glyph, glyphs[index + 1]) : 0;
    cursor += (glyph.advanceWidth + kerning) * scale + tracking * size;
    return { glyph, x };
  });
  return { placed, end: cursor - tracking * size };
};

// Mot-symbole : Inter Bold, approche -0,03 em — le même dessin que le logo officiel.
const word = layout(interBold, 'Fatafalta', EM, -0.03);
const wordGlyphs = word.placed.map(({ glyph, x }) => {
  const path = glyph.getPath(0, 0, EM);
  const box = path.getBoundingBox();
  return { d: path.toPathData(1), x: round(x), x1: round(box.x1), x2: round(box.x2), y1: box.y1, y2: box.y2 };
});
const wordmark = {
  width: round(word.end),
  top: round(Math.min(...wordGlyphs.map((g) => g.y1))),
  bottom: round(Math.max(...wordGlyphs.map((g) => g.y2))),
  glyphs: wordGlyphs.map(({ d, x, x1, x2 }) => ({ d, x, x1, x2 })),
};

// Signature : « Apprendre. Progresser. » en Inter, « Réussir. » en Playfair italique or —
// l'accent éditorial de la marque (un mot, une fois par écran).
const SERIF_RATIO = 1.1; // Playfair a un œil plus petit : on aligne les hauteurs d'x
const lineOf = (typeface, text, size, tracking, originX) => {
  const line = layout(typeface, text, size, tracking, originX);
  const paths = line.placed.map(({ glyph, x }) => glyph.getPath(x, 0, size));
  const boxes = paths.map((path) => path.getBoundingBox()).filter((box) => Number.isFinite(box.x1) && box.x2 > box.x1);
  return {
    d: paths.map((path) => path.toPathData(1)).join(''),
    end: line.end,
    top: Math.min(...boxes.map((box) => box.y1)),
    bottom: Math.max(...boxes.map((box) => box.y2)),
  };
};
const plain = lineOf(interRegular, 'Apprendre. Progresser.', EM, 0.012, 0);
const gap = interRegular.charToGlyph(' ').advanceWidth * (EM / interRegular.unitsPerEm) * 1.05;
const accent = lineOf(playfairItalic, 'Réussir.', EM * SERIF_RATIO, 0.004, plain.end + gap);
const tagline = {
  width: round(accent.end),
  top: round(Math.min(plain.top, accent.top)),
  bottom: round(Math.max(plain.bottom, accent.bottom)),
  plain: plain.d,
  accent: accent.d,
};

const geometry = {
  viewBox: logo.viewBox,
  foot: FOOT,
  meet: [round(loop[meet.at][0]), round(loop[meet.at][1])],
  traces: [trace(forward), trace(backward)],
  wordmark,
  tagline,
};

// JSON lisible : une ligne par propriété, les listes de nombres sur une seule ligne.
const serialize = (value) => JSON.stringify(value, null, 2)
  .replace(/\[\s+(-?[\d.]+(?:,\s+-?[\d.]+)*)\s+\]/g, (_, list) => `[${list.replace(/\s+/g, ' ')}]`);

const banner = `/**
 * FICHIER GÉNÉRÉ — ne pas modifier à la main.
 * Source : scripts/generate-launch-assets.mjs (npm run brand:assets), à partir de src/theme/brand.js
 * et des polices Inter / Playfair Display du projet.
 *
 *  - traces   : les deux traits lumineux qui dessinent le F (du pied au coin corné), dans le cadre
 *               100 × 100 du symbole ; xs / ys = positions de l'étincelle le long du trait.
 *  - wordmark : « Fatafalta » en Inter Bold (approche -0,03 em), un tracé par lettre, corps 100.
 *  - tagline  : « Apprendre. Progresser. Réussir. », corps 100 (Inter) et ${Math.round(EM * SERIF_RATIO)} (Playfair italique).
 */
`;
mkdirSync(join(root, 'src/launch'), { recursive: true });
writeFileSync(
  join(root, 'src/launch/launchGeometry.js'),
  `${banner}const geometry = ${serialize(geometry)};\n\nexport default geometry;\n`,
);

// ── Grain : bruit blanc en transparence, répété en mosaïque ──────────────
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(body));
  return Buffer.concat([head, body, tail]);
};
// PNG niveaux de gris + alpha (type 4), 8 bits.
const encodeGrayAlpha = (size, pixels) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 4, 0, 0, 0], 8);
  const rows = Buffer.alloc(size * (size * 2 + 1));
  for (let y = 0; y < size; y += 1) pixels.copy(rows, y * (size * 2 + 1) + 1, y * size * 2, (y + 1) * size * 2);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};
// Générateur déterministe : relancer le script ne modifie pas les fichiers.
const mulberry = (seed) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const GRAIN_TILE = 64; // pt
const GRAIN_PEAK = 22; // alpha maximal (sur 255) ; l'opacité de la vue règle l'intensité finale
mkdirSync(join(root, 'assets/launch'), { recursive: true });
[[1, ''], [2, '@2x'], [3, '@3x']].forEach(([density, suffix]) => {
  const size = GRAIN_TILE * density;
  const random = mulberry(0xfa7a + density);
  const pixels = Buffer.alloc(size * size * 2);
  for (let index = 0; index < size * size; index += 1) {
    pixels[index * 2] = 255;
    // Distribution triangulaire : un grain doux, sans points durs isolés.
    pixels[index * 2 + 1] = Math.round(((random() + random()) / 2) * GRAIN_PEAK);
  }
  writeFileSync(join(root, `assets/launch/grain${suffix}.png`), encodeGrayAlpha(size, pixels));
});

// ── Écrans de démarrage web : même F « éteint » que le splash natif ──────
const dormantMark = `<path d="${logo.bodyUnfolded}" fill="${launch.dormant.color}" fill-opacity="${launch.dormant.fillOpacity}" `
  + `stroke="${launch.dormant.color}" stroke-opacity="${launch.dormant.strokeOpacity}" stroke-width="${launch.dormant.strokeWidth}" stroke-linejoin="round"/>`;
const png = (markup, width) => new Resvg(markup, { fitTo: { mode: 'width', value: width } }).render().asPng();

mkdirSync(join(root, 'public/icons/splash'), { recursive: true });
writeFileSync(
  join(root, 'public/icons/splash-mark.png'),
  png(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${logo.viewBox}">${dormantMark}</svg>`, SPLASH_IMAGE_WIDTH * 3),
);

// iOS n'affiche un écran de lancement de PWA que si l'image a les dimensions exactes de l'écran
// (liste reprise de public/index.html) : largeur × hauteur en pixels, densité.
const LAUNCH_SCREENS = [
  [1320, 2868, 3], [1260, 2736, 3], [1206, 2622, 3], [1290, 2796, 3], [1179, 2556, 3], [1284, 2778, 3],
  [1170, 2532, 3], [1125, 2436, 3], [1242, 2688, 3], [828, 1792, 2], [1242, 2208, 3], [750, 1334, 2],
];
LAUNCH_SCREENS.forEach(([width, height, density]) => {
  const side = SPLASH_IMAGE_WIDTH * density;
  const scale = side / 100;
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`
    + `<rect width="${width}" height="${height}" fill="${launch.base}"/>`
    + `<g transform="translate(${(width - side) / 2} ${(height - side) / 2}) scale(${scale})">${dormantMark}</g></svg>`;
  writeFileSync(join(root, `public/icons/splash/launch-${width}x${height}.png`), png(markup, width));
});

console.log(
  `Lancement : tracé ${geometry.traces.map((t) => t.length).join(' + ')} unités, `
  + `mot-symbole ${wordmark.glyphs.length} lettres (${wordmark.width} × ${round(wordmark.bottom - wordmark.top)}), `
  + `signature ${tagline.width} unités, grain et ${LAUNCH_SCREENS.length} écrans web générés (fond ${brand.ink}).`,
);
