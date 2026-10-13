/**
 * Génère les ressources graphiques de Fatafalta à partir de src/theme/brand.js :
 *   assets/brand/*.svg           logo et symbole (clair, inversé, monochrome)
 *   assets/icon.png              icône iOS / fallback (1024, opaque)
 *   assets/android-icon-*.png    couches de l'icône adaptative Android
 *   assets/splash-icon.png       symbole du splash natif (coin déplié)
 *   assets/favicon.png           favicon de la version web Expo
 *
 * Usage : npm run brand:assets
 * Après une modification du logo, relancer ce script puis un build natif
 * (`npx expo prebuild --clean` ou EAS) : les icônes sont figées à la compilation.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { Resvg } from '@resvg/resvg-js';
import opentype from 'opentype.js';
import { brand, logo } from '../src/theme/brand.js';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'assets');
const out = (file) => join(assets, file);

// ── Mot-symbole : Inter Bold vectorisé (OFL), approche -0,03 em comme sur le site ──
const font = opentype.loadSync(require.resolve('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'));

const wordmark = (text, fontSize, x, baseline, tracking = -0.03) => {
  const scale = fontSize / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(text);
  let cursor = x;
  const parts = [];
  glyphs.forEach((glyph, index) => {
    parts.push(glyph.getPath(cursor, baseline, fontSize).toPathData(2));
    const kerning = index < glyphs.length - 1 ? font.getKerningValue(glyph, glyphs[index + 1]) : 0;
    cursor += (glyph.advanceWidth + kerning) * scale + tracking * fontSize;
  });
  return { d: parts.join(''), width: cursor - x - tracking * fontSize };
};

// ── Briques SVG ────────────────────────────────
const svg = (viewBox, body, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${extra}>${body}</svg>\n`;

// F + revers, dans le cadre 100 × 100.
const mark = ({ letter, flap, folded = true }) => folded
  ? `<path d="${logo.body}" fill="${letter}"/><path d="${logo.flap}" fill="${flap}"/>`
  : `<path d="${logo.bodyUnfolded}" fill="${letter}"/>`;

// Version monochrome : le revers est détaché du corps par un liseré vide.
const monoMark = (color, id = 'fold') =>
  `<defs><mask id="${id}"><rect x="-10" y="-10" width="120" height="120" fill="#fff"/>`
  + `<path d="${logo.flap}" fill="none" stroke="#000" stroke-width="3.2" stroke-linejoin="round"/></mask></defs>`
  + `<path d="${logo.body}" fill="${color}" mask="url(#${id})"/><path d="${logo.flap}" fill="${color}"/>`;

const tile = (fill) => `<rect width="100" height="100" rx="${logo.tileRadius}" fill="${fill}"/>`;

// Halo discret de l'icône, repris du fond de l'écran d'accueil.
const glow = `<defs><radialGradient id="glow" cx="0.78" cy="0.18" r="0.9">`
  + `<stop offset="0" stop-color="${brand.inkGlow}"/><stop offset="1" stop-color="${brand.ink}"/></radialGradient></defs>`;

// Place le cadre 100 × 100 du symbole à l'échelle `scale` au centre d'une toile `size`.
const centered = (size, scale, body) =>
  `<g transform="translate(${(size - 100 * scale) / 2} ${(size - 100 * scale) / 2}) scale(${scale})">${body}</g>`;

// ── Logos vectoriels ───────────────────────────
const lockup = ({ tileFill, letter, flap, text }) => {
  const word = wordmark('Fatafalta', 54, 124, 69.6);
  const width = Math.ceil(124 + word.width + 2);
  return svg(`0 0 ${width} 100`,
    `<title>Fatafalta</title>${tile(tileFill)}${mark({ letter, flap })}<path d="${word.d}" fill="${text}"/>`,
    ` width="${width * 2}" height="200"`);
};

const monoLockup = () => {
  const word = wordmark('Fatafalta', 54, 124, 69.6);
  const width = Math.ceil(124 + word.width + 2);
  // Tuile pleine, F évidé : un seul aplat, imprimable en une couleur.
  const knockout = `<defs><mask id="knock"><rect width="100" height="100" fill="#fff"/>${mark({ letter: '#000', flap: '#fff' })}`
    + `<path d="${logo.flap}" fill="none" stroke="#000" stroke-width="3.2" stroke-linejoin="round"/></mask></defs>`;
  return svg(`0 0 ${width} 100`,
    `<title>Fatafalta</title>${knockout}<rect width="100" height="100" rx="${logo.tileRadius}" fill="currentColor" mask="url(#knock)"/>`
    + `<path d="${word.d}" fill="currentColor"/>`,
    ` width="${width * 2}" height="200"`);
};

const files = {
  'brand/fatafalta-logo.svg': lockup({ tileFill: brand.ink, letter: brand.paper, flap: brand.goldLight, text: brand.ink }),
  'brand/fatafalta-logo-inverse.svg': lockup({ tileFill: brand.paper, letter: brand.ink, flap: brand.gold, text: brand.paper }),
  'brand/fatafalta-logo-mono.svg': monoLockup(),
  'brand/fatafalta-symbol.svg': svg(logo.viewBox,
    `<title>Fatafalta</title>${tile(brand.ink)}${mark({ letter: brand.paper, flap: brand.goldLight })}`, ' width="512" height="512"'),
  'brand/fatafalta-symbol-mono.svg': svg(logo.viewBox, `<title>Fatafalta</title>${monoMark('currentColor')}`, ' width="512" height="512"'),
};

// ── Icônes et splash (PNG) ─────────────────────
const S = 1024;
const png = (markup, size) => new Resvg(markup, { fitTo: { mode: 'width', value: size } }).render().asPng();

// iOS applique son propre masque : toile pleine, opaque, sans coins arrondis.
const iconSvg = svg(`0 0 ${S} ${S}`,
  `${glow}<rect width="${S}" height="${S}" fill="url(#glow)"/>${centered(S, 8.3, mark({ letter: brand.paper, flap: brand.goldLight }))}`);

// Android adaptatif : 108 dp dont 72 visibles, zone sûre de 66 dp ; le F reste à ~55 % de la partie visible.
const adaptiveScale = 5.9;
const rasters = {
  'icon.png': [iconSvg, S],
  'android-icon-background.png': [svg(`0 0 ${S} ${S}`, `${glow}<rect width="${S}" height="${S}" fill="url(#glow)"/>`), S],
  'android-icon-foreground.png': [svg(`0 0 ${S} ${S}`, centered(S, adaptiveScale, mark({ letter: brand.paper, flap: brand.goldLight }))), S],
  'android-icon-monochrome.png': [svg(`0 0 ${S} ${S}`, centered(S, adaptiveScale, monoMark('#FFFFFF'))), S],
  // Coin déplié : l'intro animée le replie au premier rendu (voir BrandIntro).
  'splash-icon.png': [svg(logo.viewBox, mark({ letter: brand.paper, flap: brand.goldLight, folded: false })), S],
  'favicon.png': [files['brand/fatafalta-symbol.svg'], 48],
};

mkdirSync(join(assets, 'brand'), { recursive: true });
for (const [file, content] of Object.entries(files)) writeFileSync(out(file), content);
for (const [file, [markup, size]] of Object.entries(rasters)) writeFileSync(out(file), png(markup, size));

// Aperçus PNG des logos, pratiques pour les supports de communication.
writeFileSync(out('brand/fatafalta-logo.png'), png(files['brand/fatafalta-logo.svg'], 1200));
writeFileSync(out('brand/fatafalta-logo-inverse.png'), png(files['brand/fatafalta-logo-inverse.svg'], 1200));

console.log(`Ressources générées dans ${assets}`);
