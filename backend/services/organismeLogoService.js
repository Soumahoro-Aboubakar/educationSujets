const net = require('net');
const Jimp = require('jimp');
const Organisme = require('../models/Organisme');
const storageConfig = require('../config/storage');
const getStorageProvider = require('../storage');
const AppError = require('../utils/errors');
const { invalidateSeoCatalog } = require('./seoCatalogService');

/*
 * Logo facultatif d'un organisme (champ `logo` existant), administré depuis le web.
 *
 * Deux formes enregistrées :
 *  - une adresse https publique fournie par l'administrateur (jamais téléchargée par le serveur :
 *    aucune requête sortante, donc pas de risque SSRF ; le navigateur affiche le monogramme si elle
 *    ne se charge pas) ;
 *  - « storage:<clé> » : image envoyée, normalisée en PNG (512 px max, métadonnées retirées) et
 *    rangée dans le stockage déjà configuré. Le bucket étant privé, elle est servie par
 *    GET /api/organismes/:id/logo (redirection vers une URL signée).
 * Les clients reçoivent toujours une adresse affichable (`logo`) via publicLogo().
 */

const STORAGE_PREFIX = 'storage:';
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_MIME_TYPES = ['image/png', 'image/jpeg'];
const MAX_SIDE = 512;
const MIN_SIDE = 32;
const SIGNED_URL_SECONDS = 6 * 60 * 60;

const isStoredLogo = (value) => typeof value === 'string' && value.startsWith(STORAGE_PREFIX);

/** Adresse affichable du logo : URL https, ou route publique de l'API pour une image stockée. */
const publicLogo = (organisme) => {
  const value = organisme?.logo;
  if (!value) return null;
  if (isStoredLogo(value)) {
    const version = organisme.updatedAt ? new Date(organisme.updatedAt).getTime() : 0;
    return `/api/organismes/${organisme._id}/logo?v=${version}`;
  }
  return /^https:\/\//i.test(value) || /^\/(?!\/)/.test(value) ? value : null;
};

const withPublicLogo = (organisme) => (organisme ? { ...organisme, logo: publicLogo(organisme) } : organisme);

/** Adresse https publique et plausible : pas d'identifiants, pas d'IP ni d'hôte local. */
const assertLogoUrl = (value) => {
  const raw = String(value || '').trim();
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new AppError('Adresse du logo invalide. Indiquez une adresse complète commençant par https://', 400, undefined, 'LOGO_URL_INVALID');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (url.protocol !== 'https:' || raw.length > 500 || url.username || url.password
    || net.isIP(host) || host === 'localhost' || host.endsWith('.local') || !host.includes('.')) {
    throw new AppError('Le logo doit être une adresse https publique (ex. https://exemple.ci/logo.png).', 400, undefined, 'LOGO_URL_INVALID');
  }
  return url.toString();
};

/** Image envoyée → PNG carré-compatible, borné, sans métadonnées. */
const normalizeLogoImage = async (file) => {
  if (!file?.buffer?.length) throw new AppError('Aucune image reçue.', 400, undefined, 'LOGO_FILE_MISSING');
  if (!LOGO_MIME_TYPES.includes(String(file.mimetype).toLowerCase())) {
    throw new AppError('Format non pris en charge : envoyez une image PNG ou JPEG.', 400, undefined, 'LOGO_FORMAT');
  }
  let image;
  try {
    image = await Jimp.read(file.buffer);
  } catch {
    throw new AppError('Cette image est illisible ou corrompue.', 400, undefined, 'LOGO_UNREADABLE');
  }
  const { width, height } = image.bitmap;
  if (width < MIN_SIDE || height < MIN_SIDE) {
    throw new AppError(`Image trop petite : ${MIN_SIDE} × ${MIN_SIDE} pixels minimum.`, 400, undefined, 'LOGO_TOO_SMALL');
  }
  if (width > MAX_SIDE || height > MAX_SIDE) image.scaleToFit(MAX_SIDE, MAX_SIDE);
  return image.getBufferAsync(Jimp.MIME_PNG);
};

const getOrganisme = async (organismeId) => {
  const organisme = await Organisme.findById(organismeId);
  if (!organisme) throw new AppError('Organisme introuvable', 404);
  return organisme;
};

const deleteStoredLogo = async (value) => {
  if (!isStoredLogo(value)) return;
  try {
    await getStorageProvider().delete(value.slice(STORAGE_PREFIX.length));
  } catch (error) {
    console.warn(`[LOGO] Suppression du fichier impossible (${value}) : ${error.message}`);
  }
};

const saveLogo = async (organisme, nextValue) => {
  const previous = organisme.logo;
  organisme.logo = nextValue || undefined;
  await organisme.save();
  if (previous && previous !== nextValue) await deleteStoredLogo(previous);
  invalidateSeoCatalog();
  return withPublicLogo(organisme.toObject());
};

/** Ajout ou remplacement : fichier envoyé (prioritaire) ou adresse https. */
const setOrganismeLogo = async (organismeId, { file, url }) => {
  const organisme = await getOrganisme(organismeId);
  if (file) {
    const png = await normalizeLogoImage(file);
    const key = `${storageConfig.folder}/organismes/${organisme._id}/logo-${Date.now()}.png`;
    await getStorageProvider().upload(key, png, { contentType: 'image/png', contentDisposition: 'inline; filename="logo.png"' });
    return saveLogo(organisme, `${STORAGE_PREFIX}${key}`);
  }
  if (!url) throw new AppError('Envoyez une image ou indiquez l’adresse du logo.', 400, undefined, 'LOGO_MISSING');
  return saveLogo(organisme, assertLogoUrl(url));
};

const removeOrganismeLogo = async (organismeId) => saveLogo(await getOrganisme(organismeId), null);

/** Adresse de redirection d'un logo stocké (URL signée), sinon null. */
const resolveStoredLogoUrl = async (organismeId) => {
  const organisme = await Organisme.findById(organismeId).select('logo').lean();
  if (!isStoredLogo(organisme?.logo)) return null;
  return getStorageProvider().generateSignedUrl(organisme.logo.slice(STORAGE_PREFIX.length), SIGNED_URL_SECONDS, { contentType: 'image/png' });
};

module.exports = {
  MAX_LOGO_BYTES,
  LOGO_MIME_TYPES,
  publicLogo,
  withPublicLogo,
  assertLogoUrl,
  normalizeLogoImage,
  setOrganismeLogo,
  removeOrganismeLogo,
  resolveStoredLogoUrl,
  SIGNED_URL_SECONDS,
};
