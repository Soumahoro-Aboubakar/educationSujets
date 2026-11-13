#!/usr/bin/env node
// Aucun dotenv. URI explicite, base locale uniquement ; lecture seule par défaut.
const mongoose = require('mongoose');
const User = require('../../models/User');
const Subscription = require('../../models/Subscription');
const PrepIdentite = require('../../models/PrepIdentite');
const PrepProgression = require('../../models/PrepProgression');
const AuthSession = require('../../models/AuthSession');
const PaymentWebhookEvent = require('../../models/PaymentWebhookEvent');

const assertLocalUri = (uri) => {
  if (typeof uri !== 'string' || !/^mongodb:\/\/(127\.0\.0\.1|localhost):27017\/fatafalta-(dev|test)[a-z0-9-]*$/.test(uri)) {
    throw new Error('URI explicite obligatoire : mongodb://127.0.0.1:27017/fatafalta-dev ou fatafalta-test (suffixe autorisé)');
  }
};
const inspect = async () => {
  const duplicates = await PrepIdentite.aggregate([
    { $match: { user: { $type: 'objectId' }, fusionneeDans: null } },
    { $sort: { createdAt: 1, _id: 1 } },
    { $group: { _id: '$user', identities: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  return { duplicates, users: await User.countDocuments({ tokenVersion: { $exists: false } }),
    subscriptions: await Subscription.countDocuments({ accessState: { $exists: false } }),
    webhooks: await PaymentWebhookEvent.countDocuments({ state: { $exists: false } }) };
};
const migrate = async ({ apply = false, mergeMap = [] } = {}) => {
  const before = await inspect();
  if (!apply) return { dryRun: true, ...before };
  // Une entrée par compte dupliqué ; le choix éditorial du canonique doit être explicite.
  const choices = new Map(mergeMap.map((entry) => [String(entry.user), String(entry.canonical)]));
  for (const group of before.duplicates) {
    if (!group.identities.some((id) => String(id) === choices.get(String(group._id)))) {
      throw new Error(`Choix canonique requis pour le compte ${group._id} ; aucune écriture effectuée`);
    }
  }
  for (const group of before.duplicates) {
    const current = await PrepIdentite.findOne({ user: group._id, canonical: true });
    if (current && String(current._id) !== choices.get(String(group._id))) throw new Error('Un autre canonique est déjà actif : aucune écriture effectuée');
  }
  await User.updateMany({ tokenVersion: { $exists: false } }, { $set: { tokenVersion: 0 } });
  await Subscription.updateMany({ accessState: { $exists: false } }, { $set: { accessState: 'enabled' } });
  await Subscription.updateMany({ accessVersion: { $exists: false } }, { $set: { accessVersion: 0 } });
  await PaymentWebhookEvent.updateMany({ state: { $exists: false }, outcome: { $exists: true } }, { $set: { state: 'completed', completedAt: new Date() } });
  await PaymentWebhookEvent.updateMany({ state: { $exists: false } }, { $set: { state: 'received', leaseUntil: null } });
  await PrepProgression.updateMany({ mergedIdentities: { $exists: false } }, { $set: { mergedIdentities: [] } });
  // Les historiques source restent en place ; chaque fusion est rejouable.
  for (const group of before.duplicates) {
    const targetId = choices.get(String(group._id));
    const current = await PrepIdentite.findOne({ user: group._id, canonical: true });
    if (current && String(current._id) !== targetId) throw new Error('Un autre canonique est déjà actif : choix à réviser');
    await PrepIdentite.updateOne({ _id: targetId }, { $set: { canonical: true } });
    for (const id of group.identities) {
      if (String(id) === targetId) continue;
      await require('../../services/prep/identityService').attach(await PrepIdentite.findById(id), { _id: group._id });
    }
  }
  for await (const identity of PrepIdentite.find({ user: { $type: 'objectId' }, fusionneeDans: null, mergeTarget: null }).cursor()) {
    await PrepIdentite.updateOne({ _id: identity._id }, { $set: { canonical: true } });
  }
  // createIndexes n'efface aucun index historique, contrairement à syncIndexes.
  await AuthSession.createIndexes();
  await PrepIdentite.createIndexes();
  await PaymentWebhookEvent.createIndexes();
  return { dryRun: false, before, after: await inspect() };
};
const main = async () => {
  const args = process.argv.slice(2);
  const uri = args.find((arg) => arg.startsWith('--uri='))?.slice(6);
  assertLocalUri(uri);
  const mapPath = args.find((arg) => arg.startsWith('--merge-map='))?.slice(12);
  const mergeMap = mapPath ? JSON.parse(require('fs').readFileSync(mapPath, 'utf8')) : [];
  await mongoose.connect(uri, { autoIndex: false, autoCreate: false });
  try { console.log(JSON.stringify(await migrate({ apply: args.includes('--apply'), mergeMap }), null, 2)); }
  finally { await mongoose.disconnect(); }
};
if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { assertLocalUri, inspect, migrate };
