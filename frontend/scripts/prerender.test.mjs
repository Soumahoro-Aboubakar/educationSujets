/**
 * Pré-rendu : pages, sitemap, robots.txt et cohérence des adresses avec le site.
 *   npm run test:seo
 * Utilise un flux de catalogue fictif et un dossier temporaire : aucun appel réseau.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { findBySegment } from '../src/lib/slug.js';

const run = promisify(execFile);
const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'prerender.mjs');
const SITE = 'https://fatafalta.onrender.com';

const TEMPLATE = '<!doctype html><html lang="fr"><head><meta charset="utf-8"/><title>Défaut</title><meta name="description" content="Défaut" data-seo/></head><body><div id="root"></div></body></html>';
const year = (ordre = 1) => ({ ordre, type: 'annee', libelleSingulier: 'Année', libellePluriel: 'Années' });
const doc = (id, fields) => ({
  _id: id, title: `Sujet ${id}`, description: '', parcoursTypeId: null, hasCorrection: false, correctionIncludedInPdf: false,
  extension: '.pdf', fileSize: 1024, dateAjout: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-02T00:00:00.000Z', ...fields,
});

const FEED = {
  generatedAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-09-02T00:00:00.000Z',
  organismes: [
    {
      // Sans type de parcours : /sujets/ensea/2024/mathematiques
      _id: 'o1', nom: 'ENSEA', slug: 'ensea', niveaux: [year()], parcoursTypes: [],
      noeuds: [{ _id: 'n1', nom: '2024', parentId: null, ordreNiveau: 1 }, { _id: 'n2', nom: '2023', parentId: null, ordreNiveau: 1 }],
      matieres: [{ _id: 'm1', nom: 'Mathématiques' }, { _id: 'm2', nom: 'Français' }],
      documents: [
        doc('d1', { noeudId: 'n1', matiereId: 'm1', hasCorrection: true, title: 'ENSEA 2024 <Maths>' }),
        doc('d2', { noeudId: 'n1', matiereId: 'm1' }),
        doc('d3', { noeudId: 'n2', matiereId: 'm2' }),
      ],
    },
    {
      // Avec types de parcours : /sujets/inphb/idsi/2025/informatique
      _id: 'o2', nom: 'inphb', slug: 'inphb', niveaux: [year()],
      parcoursTypes: [{ _id: 'p1', nom: 'IDSI' }, { _id: 'p2', nom: 'Vide' }],
      noeuds: [{ _id: 'n3', nom: '2025', parentId: null, ordreNiveau: 1 }],
      matieres: [{ _id: 'm3', nom: 'Informatique' }],
      documents: [doc('d4', { noeudId: 'n3', matiereId: 'm3', parcoursTypeId: 'p1', correctionIncludedInPdf: true, hasCorrection: true })],
    },
  ],
};

let dir;
const read = (relative) => readFile(path.join(dir, relative), 'utf8');
const pageFile = (urlPath) => (urlPath === '/' ? 'index.html' : path.join(...urlPath.split('/').filter(Boolean), 'index.html'));

test.before(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'prerender-'));
  await writeFile(path.join(dir, 'index.html'), TEMPLATE);
  await writeFile(path.join(dir, 'feed.json'), JSON.stringify({ success: true, data: FEED }));
  await run(process.execPath, ['--no-warnings', SCRIPT], {
    env: { ...process.env, PRERENDER_BUILD_DIR: dir, PRERENDER_FEED_FILE: path.join(dir, 'feed.json'), INDEXNOW_KEY: 'abcdef0123456789', REACT_APP_SITE_URL: SITE },
  });
});

test.after(async () => {
  await rm(dir, { recursive: true, force: true });
});

const sitemapPaths = async () => [...(await read('sitemap.xml')).matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc.replace(SITE, '') || '/');

test('sitemap lists public pages only, each served by its own file', async () => {
  const xml = await read('sitemap.xml');
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
  const paths = await sitemapPaths();
  assert.equal(new Set(paths).size, paths.length, 'aucun doublon');
  ['/', '/sujets', '/abonnement', '/sujets/ensea', '/sujets/ensea/2024', '/sujets/ensea/2024/mathematiques',
    '/sujets/inphb', '/sujets/inphb/idsi', '/sujets/document/d1', '/sujets/document/d4'].forEach((expected) => {
    assert.ok(paths.includes(expected), `${expected} dans le sitemap`);
  });
  // Matière à un seul sujet : servie mais hors sitemap ; parcours sans sujet : aucune page.
  assert.ok(!paths.includes('/sujets/ensea/2023/francais'));
  assert.ok(!paths.some((entry) => /compte|dashboard|login|register|recherche|vide/.test(entry)));
  await Promise.all(paths.map((entry) => access(path.join(dir, pageFile(entry)))));
  await access(path.join(dir, pageFile('/sujets/ensea/2023/francais')));
  assert.match(xml, /<loc>https:\/\/fatafalta.onrender.com\/sujets\/document\/d1<\/loc><lastmod>2026-09-02T00:00:00.000Z<\/lastmod>/);
});

test('every page has one H1, its own canonical, valid JSON-LD and escaped text', async () => {
  for (const urlPath of await sitemapPaths()) {
    const html = await read(pageFile(urlPath));
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${urlPath} : un seul H1`);
    assert.equal((html.match(/<title>/g) || []).length, 1, `${urlPath} : un seul titre`);
    assert.equal((html.match(/name="description"/g) || []).length, 1, `${urlPath} : une seule description`);
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    assert.equal(canonical, `${SITE}${urlPath === '/' ? '/' : urlPath}`, `${urlPath} : canonique`);
    assert.ok(!html.includes('noindex'), `${urlPath} : indexable`);
    [...html.matchAll(/<script type="application\/ld\+json" data-seo>([\s\S]*?)<\/script>/g)].forEach(([, json]) => JSON.parse(json));
  }
  const d1 = await read(pageFile('/sujets/document/d1'));
  assert.ok(d1.includes('ENSEA 2024 &lt;Maths&gt;') && !d1.includes('<Maths>'), 'titre échappé');
  assert.match(d1, /"@type":"LearningResource"/);
  assert.match(d1, /Le corrigé de ce sujet est disponible/);
  const home = await read('index.html');
  assert.match(home, /"@type":"WebSite"/);
});

test('every catalogue link resolves like the site does (ExplorePage)', async () => {
  // Résolution identique à ExplorePage : organisme, [parcours], un segment par niveau, matière.
  const resolve = (urlPath) => {
    const segments = urlPath.split('/').filter(Boolean).slice(1).map(decodeURIComponent);
    const organisme = findBySegment(FEED.organismes, segments[0]);
    if (!organisme) return false;
    const needsParcours = organisme.parcoursTypes.length > 0;
    if (needsParcours && segments[1] && !findBySegment(organisme.parcoursTypes, segments[1])) return false;
    const tail = segments.slice(needsParcours ? 2 : 1);
    if (tail.length > organisme.niveaux.length + 1) return false;
    const nodes = tail.slice(0, organisme.niveaux.length).map((segment) => findBySegment(organisme.noeuds, segment));
    const matiere = tail[organisme.niveaux.length] ? findBySegment(organisme.matieres, tail[organisme.niveaux.length]) : true;
    return nodes.every(Boolean) && Boolean(matiere);
  };
  const files = (await sitemapPaths()).map(pageFile);
  for (const file of files) {
    const hrefs = [...(await read(file)).matchAll(/href="(\/sujets\/[^"]+)"/g)].map(([, href]) => href);
    hrefs.filter((href) => !href.startsWith('/sujets/document/')).forEach((href) => {
      assert.ok(resolve(href), `${file} → ${href} résolu`);
    });
  }
});

test('robots.txt, 404, app shell and IndexNow key', async () => {
  const robots = await read('robots.txt');
  assert.match(robots, /User-agent: \*\nAllow: \/\nDisallow: \/compte\nDisallow: \/dashboard/);
  assert.match(robots, /Sitemap: https:\/\/fatafalta.onrender.com\/sitemap.xml/);
  assert.ok(!/Disallow: \/static|Disallow: \/$/m.test(robots), 'ressources de rendu jamais bloquées');
  assert.match(await read('404.html'), /<meta name="robots" content="noindex, follow"/);
  const shell = await read('app.html');
  assert.equal(shell, TEMPLATE, 'coquille inchangée : ni canonique ni noindex');
  assert.equal(await read('abcdef0123456789.txt'), 'abcdef0123456789');
});
