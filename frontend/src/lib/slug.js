import { labelOf } from './format.js';

/*
 * Segments d'URL lisibles du catalogue : /sujets/inphb/mpsi/2022/francais.
 * Même règle que le serveur (backend/utils/slug.js) : minuscules, sans accents, chaque mot
 * réduit à ses lettres et chiffres, mots reliés par des tirets.
 * Les identifiants MongoDB restent acceptés (anciens liens) mais ne sont plus produits, sauf
 * si deux éléments voisins donnent le même alias (cas rare : l'identifiant lève l'ambiguïté).
 */
export const slugify = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .trim()
  .split(/\s+/)
  .map((word) => word.replace(/[^a-z0-9]/g, ''))
  .filter(Boolean)
  .join('-');

const compact = (value) => slugify(value).replace(/-/g, '');
const isObjectId = (value) => /^[a-f0-9]{24}$/i.test(String(value || ''));

/** Alias d'un élément : celui enregistré par le serveur (organismes), sinon dérivé du nom. */
export const slugOf = (item) => item?.slug || slugify(labelOf(item));

/** Segment d'URL d'un élément parmi ses voisins : son alias, ou son identifiant en cas d'ambiguïté. */
export const segmentFor = (item, siblings = []) => {
  const slug = slugOf(item);
  if (!slug) return item._id;
  const clash = siblings.some((other) => other._id !== item._id && slugOf(other) === slug);
  return clash ? item._id : slug;
};

/**
 * Élément désigné par un segment d'URL. Insensible à la casse et aux tirets :
 * « INPHB », « InPhB », « inp-hb » et « inphb » désignent le même organisme.
 */
export const findBySegment = (items = [], segment) => {
  if (!segment) return null;
  if (isObjectId(segment)) {
    const byId = items.find((item) => item._id === segment);
    if (byId) return byId;
  }
  const wanted = slugify(segment);
  const exact = items.filter((item) => slugOf(item) === wanted);
  if (exact.length === 1) return exact[0];
  const loose = items.filter((item) => compact(slugOf(item)) === compact(segment));
  return loose.length === 1 ? loose[0] : null;
};
