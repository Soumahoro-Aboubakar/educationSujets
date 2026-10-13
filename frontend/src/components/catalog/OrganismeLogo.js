import React, { useEffect, useState } from 'react';
import { cx } from '../ui';
import { labelOf } from '../../lib/format';
import { slugOf } from '../../lib/slug';
import { apiUrl } from '../../lib/visitor';

/*
 * Logo d'un organisme, affiché devant son nom.
 *  - Logo officiel (champ `logo` de l'organisme : URL https ou fichier de /public) quand il est
 *    renseigné — il doit provenir de l'établissement ou être utilisé avec son accord.
 *  - Sinon, monogramme sobre aux couleurs de Fatafalta, toujours le même pour un organisme donné
 *    (couleur dérivée de son alias), afin que chaque établissement soit reconnaissable d'un coup d'œil.
 */

// Teintes profondes et bien distinctes, accordées à la charte (encre, bordeaux, or) ;
// texte blanc lisible (contraste AA) sur chacune.
const PALETTE = [
  ['#0D1B32', '#24395F'], // encre
  ['#6C2838', '#8E3B50'], // bordeaux
  ['#7A5A24', '#A47B38'], // or
  ['#14514C', '#21706A'], // vert pétrole
  ['#2B4A8B', '#3F63AD'], // bleu roi
  ['#53346B', '#714A8F'], // prune
  ['#2E5A2E', '#437A42'], // vert forêt
  ['#9A4421', '#BD5B30'], // terre cuite
  ['#3A3F4B', '#555C6B'], // graphite
];

const SIZES = {
  xs: { box: 'h-5 w-5 rounded-[6px]', text: 'text-[8px]', pad: 'p-0.5' },
  sm: { box: 'h-8 w-8 rounded-lg', text: 'text-[11px]', pad: 'p-1' },
  md: { box: 'h-11 w-11 rounded-xl', text: 'text-[14px]', pad: 'p-1.5' },
  lg: { box: 'h-14 w-14 rounded-2xl', text: 'text-[18px]', pad: 'p-2' },
};

/**
 * Monogramme de secours (logo absent ou qui ne se charge pas) : les deux premiers caractères
 * alphanumériques du nom, sans accents, en majuscules. Même règle sur l'application mobile
 * (fatafalta/src/components/catalog/OrganismeLogo.js).
 *   ENA → EN · Concours Police → CO · INP-HB → IN · « É » → E · nom vide → ?
 */
export const monogramOf = (name = '') => {
  const characters = String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]/g, '');
  return characters ? characters.slice(0, 2).toUpperCase() : '?';
};

const hash = (value) => [...String(value)].reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) >>> 0, 7);

// Seules les adresses https et les fichiers servis par le site sont acceptés comme logo.
// Logo téléversé par l'administration : servi par l'API (/api/organismes/:id/logo).
const safeLogoUrl = (value) => {
  if (typeof value !== 'string' || !/^(https:\/\/|\/(?!\/))\S+$/.test(value.trim())) return null;
  return value.trim().startsWith('/api/') ? apiUrl(value.trim()) : value.trim();
};

/** Couleur stable d'un organisme : dérivée de son alias (même couleur sur toutes les pages). */
export const paletteIndexOf = (organisme) => hash(slugOf(organisme) || labelOf(organisme)) % PALETTE.length;

/**
 * Pour une liste : deux organismes au même monogramme (CHAO9, CHARO → « CH ») reçoivent des
 * couleurs différentes, pour rester distinguables. Renvoie un index de couleur par _id.
 */
export const distinctPalette = (organismes = []) => {
  const used = new Map();
  const result = {};
  [...organismes].sort((a, b) => String(slugOf(a)).localeCompare(String(slugOf(b)))).forEach((item) => {
    const monogram = monogramOf(labelOf(item));
    const taken = used.get(monogram) || new Set();
    let index = paletteIndexOf(item);
    for (let step = 0; step < PALETTE.length && taken.has(index); step += 1) index = (index + 1) % PALETTE.length;
    taken.add(index);
    used.set(monogram, taken);
    result[item._id] = index;
  });
  return result;
};

const OrganismeLogo = ({ organisme, size = 'md', paletteIndex, className }) => {
  const [broken, setBroken] = useState(false);
  // Nouveau logo (remplacement par l'administration) : nouvel essai d'affichage.
  useEffect(() => setBroken(false), [organisme?.logo]);
  const dimensions = SIZES[size] || SIZES.md;
  const name = labelOf(organisme);
  const logo = !broken ? safeLogoUrl(organisme?.logo) : null;

  if (logo) {
    return (
      <span className={cx('inline-flex shrink-0 items-center justify-center overflow-hidden border border-line bg-white', dimensions.box, dimensions.pad, className)}>
        <img src={logo} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} className="h-full w-full object-contain" />
      </span>
    );
  }

  const [from, to] = PALETTE[Number.isInteger(paletteIndex) ? paletteIndex % PALETTE.length : paletteIndexOf(organisme)];
  const monogram = monogramOf(name);
  return (
    <span
      aria-hidden="true"
      className={cx(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden font-semibold uppercase text-white',
        'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10),0_1px_2px_rgba(13,27,50,0.18)]',
        dimensions.box,
        className,
      )}
      style={{ backgroundImage: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
    >
      {/* Reflet discret en haut : donne du relief sans effet « bouton ». */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.12] to-transparent" />
      <span className={cx('relative leading-none', monogram.length > 2 ? 'tracking-[-0.04em]' : 'tracking-[0.02em]', dimensions.text, monogram.length > 2 && 'scale-90')}>
        {monogram}
      </span>
    </span>
  );
};

export default OrganismeLogo;
