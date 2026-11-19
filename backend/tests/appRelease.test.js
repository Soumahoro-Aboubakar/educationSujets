/**
 * Politique de mise à jour des applications.
 *   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/fatafalta-app-test node --test tests/appRelease.test.js
 */
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const uri = process.env.TEST_MONGODB_URI;
const skip = !uri && 'TEST_MONGODB_URI non defini';
const service = require('../services/appReleaseService');

test.before(async () => { if (skip) return; await mongoose.connect(uri); await mongoose.connection.dropDatabase(); });
test.after(async () => { if (skip) return; await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

const admin = { _id: new mongoose.Types.ObjectId() };

test('no policy yet: nothing to do, Play Store link by default', { skip }, async () => {
  const android = await service.getPolicy('android');
  assert.equal(android.mode, 'none');
  assert.equal(android.latestBuild, 0);
  assert.match(android.storeUrl, /^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.fatafalta\.mobile$/);
  await assert.rejects(service.getPolicy('web'), /Plateforme inconnue/, 'le site se met à jour seul');
});

test('admin sets a required update; invalid input is refused', { skip }, async () => {
  await assert.rejects(service.updatePolicy('android', { mode: 'required' }, admin), /numéro de build/);
  await assert.rejects(service.updatePolicy('android', { mode: 'force' }, admin), /Mode/);
  await assert.rejects(service.updatePolicy('android', { latestBuild: -1 }, admin), /build invalide/);
  await assert.rejects(service.updatePolicy('android', { storeUrl: 'https://evil.example/apk' }, admin), /Google Play/);
  await assert.rejects(service.updatePolicy('android', { storeUrl: 'http://play.google.com/x' }, admin), /Google Play/);
  await assert.rejects(service.updatePolicy('android', { message: 'x'.repeat(281) }, admin), /trop long/);

  const saved = await service.updatePolicy('android', { mode: 'required', latestBuild: 12, latestVersion: '1.1.0', message: 'Correctifs importants.' }, admin);
  assert.deepEqual({ mode: saved.mode, latestBuild: saved.latestBuild, latestVersion: saved.latestVersion }, { mode: 'required', latestBuild: 12, latestVersion: '1.1.0' });
  assert.equal((await service.getPolicy('android')).message, 'Correctifs importants.');

  const all = await service.listPolicies();
  assert.deepEqual(all.map((policy) => policy.platform), ['android', 'ios']);
});
