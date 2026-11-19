/**
 * Provenance des visites : classification et rapport.
 *   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/fatafalta-traffic-test node --test tests/traffic.test.js
 */
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { classify, isBot, sectionOf } = require('../services/traffic/sources');

const uri = process.env.TEST_MONGODB_URI;
const skip = !uri && 'TEST_MONGODB_URI non defini';
const CHROME = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36';

test('classification of each kind of source', () => {
  const key = (visit) => classify({ userAgent: CHROME, ...visit }).key;
  assert.equal(key({ utmSource: 'chatgpt.com' }), 'chatgpt', 'ChatGPT ajoute utm_source=chatgpt.com');
  assert.equal(key({ referrerHost: 'chatgpt.com' }), 'chatgpt');
  assert.equal(key({ referrerHost: 'www.perplexity.ai' }), 'perplexity');
  assert.equal(key({ referrerHost: 'gemini.google.com' }), 'gemini', 'Gemini avant Google');
  assert.equal(key({ referrerHost: 'mail.google.com' }), 'email', 'webmail avant Google');
  assert.equal(key({ referrerHost: 'www.google.ci' }), 'google');
  assert.equal(key({ referrerHost: 'www.google.com' }), 'google');
  assert.equal(key({ referrerHost: 'l.facebook.com' }), 'facebook');
  assert.equal(key({ referrerHost: 'lm.facebook.com' }), 'facebook');
  assert.equal(key({ userAgent: `${CHROME} [FBAN/FB4A;FBAV/450.0]` }), 'facebook', 'navigateur intégré Facebook');
  assert.equal(key({ userAgent: `${CHROME} Instagram 300.0` }), 'instagram');
  assert.equal(key({ utmSource: 'whatsapp' }), 'whatsapp', 'liens partagés avec UTM');
  assert.equal(key({ referrerHost: 't.co' }), 'x');
  assert.equal(key({ referrerHost: 'fatafalta.com' }), 'direct', 'navigation interne ignorée');
  assert.equal(key({ referrerHost: 'blog.exemple.ci' }), 'site:exemple.ci');
  assert.equal(key({ utmSource: 'Affiche INP-HB!' }), 'campagne:afficheinp-hb');
  assert.equal(key({ standalone: true }), 'pwa');
  assert.equal(key({}), 'direct');
  assert.ok(isBot('Mozilla/5.0 (compatible; Googlebot/2.1)'));
  assert.ok(isBot('WhatsApp/2.23.20 A'), 'aperçu de lien WhatsApp');
  assert.ok(isBot('Mozilla/5.0 HeadlessChrome/140'));
  assert.ok(isBot(''));
  assert.ok(!isBot(CHROME));
  assert.equal(sectionOf('/preparation/ENSEA-AS'), 'preparation');
  assert.equal(sectionOf('/sujets/document/x'), 'sujets');
  assert.equal(sectionOf('/'), 'accueil');
});

test('visits and signups are aggregated per day, robots ignored', { skip }, async () => {
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  try {
    const traffic = require('../services/trafficService');
    await traffic.recordVisit({ utmSource: 'chatgpt.com', path: '/preparation', userAgent: CHROME });
    await traffic.recordVisit({ referrerHost: 'chatgpt.com', path: '/preparation', userAgent: CHROME });
    await traffic.recordVisit({ referrerHost: 'www.google.com', path: '/sujets/ensea', userAgent: CHROME });
    assert.equal(await traffic.recordVisit({ referrerHost: 'www.google.com', userAgent: 'Googlebot/2.1' }), null);
    assert.equal(await traffic.recordSignup({ source: 'chatgpt', userAgent: CHROME }), true);
    assert.equal(await traffic.recordSignup({ source: 'x"; drop', userAgent: CHROME }), false);

    const report = await traffic.report({ range: '7j' });
    assert.equal(report.granularity, 'jour');
    assert.equal(report.series.length, 7);
    assert.deepEqual({ visits: report.totals.visits, signups: report.totals.signups }, { visits: 3, signups: 1 });
    const [first] = report.sources;
    assert.deepEqual({ key: first.key, visits: first.visits, signups: first.signups, prep: first.sections.preparation }, { key: 'chatgpt', visits: 2, signups: 1, prep: 2 });
    assert.equal(report.series.at(-1).categories.ia, 2);
    assert.equal(report.series.at(-1).categories.recherche, 1);
    assert.equal((await traffic.report({ range: '12m' })).granularity, 'mois');
    assert.equal(traffic.periodOf('2026-11-19', 'semaine'), '2026-11-16', 'semaine du lundi');
  } finally {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
