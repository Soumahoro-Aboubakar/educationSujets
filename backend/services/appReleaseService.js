const AppRelease = require('../models/AppRelease');
const AppError = require('../utils/errors');

/* Politique de mise à jour des applications : lecture publique, écriture par le super administrateur. */

const STORE_HOSTS = ['play.google.com', 'apps.apple.com'];
const DEFAULT_STORE_URL = { android: 'https://play.google.com/store/apps/details?id=com.fatafalta.mobile', ios: '' };

const publicView = (platform, release) => ({
  platform,
  latestBuild: release?.latestBuild || 0,
  latestVersion: release?.latestVersion || '',
  mode: release?.mode || 'none',
  message: release?.message || '',
  storeUrl: release?.storeUrl || DEFAULT_STORE_URL[platform] || '',
  updatedAt: release?.updatedAt || null,
});

const assertPlatform = (platform) => {
  if (!AppRelease.PLATFORMS.includes(platform)) throw new AppError('Plateforme inconnue', 404);
};

const getPolicy = async (platform) => {
  assertPlatform(platform);
  return publicView(platform, await AppRelease.findById(platform).lean());
};

const listPolicies = async () => {
  const releases = new Map((await AppRelease.find().lean()).map((release) => [release._id, release]));
  return AppRelease.PLATFORMS.map((platform) => publicView(platform, releases.get(platform)));
};

const updatePolicy = async (platform, input = {}, user) => {
  assertPlatform(platform);
  const update = {};
  if (input.mode !== undefined) {
    if (!AppRelease.MODES.includes(input.mode)) throw new AppError('Mode de mise à jour invalide', 400);
    update.mode = input.mode;
  }
  if (input.latestBuild !== undefined) {
    const build = Number(input.latestBuild);
    if (!Number.isInteger(build) || build < 0 || build > 1e9) throw new AppError('Numéro de build invalide', 400);
    update.latestBuild = build;
  }
  if (input.latestVersion !== undefined) {
    const version = String(input.latestVersion).trim();
    if (version && !/^\d{1,4}(\.\d{1,4}){0,3}$/.test(version)) throw new AppError('Version invalide (ex. 1.2.0)', 400);
    update.latestVersion = version;
  }
  if (input.message !== undefined) {
    const message = String(input.message).trim();
    if (message.length > 280) throw new AppError('Message trop long (280 caractères au plus)', 400);
    update.message = message;
  }
  if (input.storeUrl !== undefined) {
    const raw = String(input.storeUrl).trim();
    if (raw) {
      let url;
      try { url = new URL(raw); } catch (error) { throw new AppError('Lien du magasin invalide', 400); }
      // Seuls les magasins officiels : un lien de mise à jour ne doit jamais mener ailleurs.
      if (url.protocol !== 'https:' || !STORE_HOSTS.includes(url.hostname)) {
        throw new AppError('Le lien doit pointer vers Google Play ou l’App Store (https)', 400);
      }
    }
    update.storeUrl = raw;
  }
  if (update.mode && update.mode !== 'none') {
    const current = await AppRelease.findById(platform).lean();
    const build = update.latestBuild ?? current?.latestBuild ?? 0;
    if (!build) throw new AppError('Indiquez le numéro de build de la version publiée', 400);
  }
  update.updatedBy = user?._id || null;
  const release = await AppRelease.findByIdAndUpdate(platform, { $set: update }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }).lean();
  return publicView(platform, release);
};

module.exports = { getPolicy, listPolicies, updatePolicy, STORE_HOSTS };
