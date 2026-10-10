/**
 * Pré-rendu des pages publiques, après `react-scripts build`.
 *
 * Le site est une application React servie en fichiers statiques par Render : sans ce script,
 * chaque adresse renvoie la même page vide (même titre, aucun contenu) tant que JavaScript n'a pas
 * chargé les données. Ici, chaque page publique du catalogue reçoit son propre fichier HTML :
 * titre, description, canonique, données structurées et contenu lisible (titres, liens, fiches).
 * React remplace ce contenu au chargement, avec les mêmes textes (lib/catalogSeo.js, lib/seo.js).
 *
 * Produit aussi sitemap.xml, robots.txt, 404.html, app.html (coquille de l'application pour les
 * adresses non pré-rendues) et, si INDEXNOW_KEY est défini, le fichier de clé IndexNow.
 *
 * Données : un seul appel à GET /api/seo/catalog (sujets publiés uniquement, sans fichier ni lien).
 * API injoignable : la construction échoue et Render garde la version en ligne, sauf si
 * PRERENDER_ALLOW_OFFLINE=true (pages fixes uniquement).
 *
 * Variables : REACT_APP_SITE_URL, REACT_APP_API_URL (ou PRERENDER_API_URL), PRERENDER_FEED_FILE
 * (flux JSON local, pour les tests), INDEXNOW_KEY, GOOGLE_SITE_VERIFICATION, BING_SITE_VERIFICATION.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SITE_URL, absoluteUrl, renderHead } from '../src/lib/seo.js';
import { PAGES_SEO } from '../src/lib/pagesSeo.js';
import {
  CATALOG_ROOT, catalogCrumbs, catalogPath, catalogSeo, catalogText, documentPath, documentSeo,
} from '../src/lib/catalogSeo.js';
import { formatDate, formatFileSize, labelOf, organismeLabel } from '../src/lib/format.js';
import { segmentFor } from '../src/lib/slug.js';

const BUILD_DIR = path.resolve(process.env.PRERENDER_BUILD_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'build'));
const API_URL = (process.env.PRERENDER_API_URL || process.env.REACT_APP_API_URL || 'https://educationsujets.onrender.com').replace(/\/+$/, '');
const ATTEMPTS = 6;
const RETRY_DELAY_MS = 20 * 1000;
const REQUEST_TIMEOUT_MS = 60 * 1000;

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const byName = (left, right) => labelOf(left).localeCompare(labelOf(right), 'fr');
const newest = (dates) => dates.filter(Boolean).map((date) => new Date(date)).sort((a, b) => b - a)[0] || null;
const plural = (count, word) => `${count} ${word}${count > 1 ? 's' : ''}`;

// ── Données ────────────────────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

const loadFeed = async () => {
  if (process.env.PRERENDER_FEED_FILE) {
    return JSON.parse(await readFile(process.env.PRERENDER_FEED_FILE, 'utf8')).data;
  }
  // Le serveur gratuit de Render peut être en veille : plusieurs tentatives espacées.
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(`${API_URL}/api/seo/catalog`, {
        headers: { Accept: 'application/json', 'User-Agent': 'fatafalta-prerender' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()).data;
    } catch (error) {
      console.warn(`[prerender] Catalogue indisponible (essai ${attempt}/${ATTEMPTS}) : ${error.message}`);
      if (attempt < ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }
  }
  return null;
};

/**
 * Arbre publié d'un organisme, calculé comme le catalogue public de l'API
 * (/api/catalog/noeuds, /api/catalog/matieres) : mêmes éléments, mêmes voisins, mêmes alias.
 */
const organismePages = (organisme, organismes) => {
  const levels = organisme.niveaux || [];
  const nodesById = new Map(organisme.noeuds.map((node) => [node._id, node]));
  const matieresById = new Map(organisme.matieres.map((matiere) => [matiere._id, matiere]));
  const chainOf = (leafId) => {
    const chain = [];
    for (let node = nodesById.get(leafId); node && chain.length < 20; node = nodesById.get(node.parentId)) chain.unshift(node);
    return chain;
  };
  const organismeSegment = segmentFor(organisme, organismes);
  const needsParcours = organisme.parcoursTypes.length > 0;
  const pages = [];
  const documentContexts = new Map();

  const baseTrail = [{ label: organismeLabel(organisme), path: catalogPath([organismeSegment]) }];
  const lastmod = (documents) => newest(documents.map((document) => document.updatedAt || document.dateAjout));

  pages.push({
    path: catalogPath([organismeSegment]),
    step: needsParcours ? 'parcours' : 'noeud',
    context: { organisme, nodes: [], count: organisme.documents.length },
    trail: baseTrail,
    items: needsParcours
      ? organisme.parcoursTypes
        .filter((parcoursType) => organisme.documents.some((document) => document.parcoursTypeId === parcoursType._id))
        .map((parcoursType) => ({ label: labelOf(parcoursType), path: catalogPath([organismeSegment, segmentFor(parcoursType, organisme.parcoursTypes)]) }))
      : null,
    documents: organisme.documents,
    lastmod: lastmod(organisme.documents),
  });

  const scopes = needsParcours
    ? organisme.parcoursTypes.map((parcoursType) => ({
      parcoursType,
      segment: segmentFor(parcoursType, organisme.parcoursTypes),
      documents: organisme.documents.filter((document) => document.parcoursTypeId === parcoursType._id),
    })).filter((scope) => scope.documents.length)
    : [{ parcoursType: null, segment: null, documents: organisme.documents }];

  scopes.forEach(({ parcoursType, segment: parcoursSegment, documents: scopeDocuments }) => {
    const rows = scopeDocuments
      .map((document) => ({ document, chain: chainOf(document.noeudId) }))
      .filter(({ chain }) => chain.length === levels.length && levels.length > 0);
    const scopeTrail = parcoursType
      ? [...baseTrail, { label: labelOf(parcoursType), path: catalogPath([organismeSegment, parcoursSegment]) }]
      : baseTrail;

    // Niveau `depth` sous le chemin `prefix` (nœuds déjà choisis) : voisins publiés, triés par nom.
    const visit = (prefix, prefixSegments, trail) => {
      const depth = prefix.length;
      const inside = rows.filter(({ chain }) => prefix.every((node, index) => chain[index]._id === node._id));
      const positionPath = catalogPath([organismeSegment, parcoursSegment, ...prefixSegments]);

      if (depth < levels.length) {
        const children = [...new Map(inside.map(({ chain }) => [chain[depth]._id, chain[depth]])).values()].sort(byName);
        const items = children.map((child) => {
          const segment = segmentFor(child, children);
          const childRows = inside.filter(({ chain }) => chain[depth]._id === child._id);
          return { child, segment, count: childRows.length, path: catalogPath([organismeSegment, parcoursSegment, ...prefixSegments, segment]) };
        });
        if (depth > 0 || parcoursType) {
          pages.push({
            path: positionPath,
            step: 'noeud',
            context: { organisme, parcoursType, nodes: prefix, count: depth > 0 ? inside.length : undefined },
            trail,
            items: items.map(({ child, path: itemPath, count }) => ({ label: labelOf(child), path: itemPath, meta: plural(count, 'sujet') })),
            documents: inside.map(({ document }) => document),
            lastmod: lastmod(inside.map(({ document }) => document)),
          });
        } else {
          // Racine sans parcours : la page de l'organisme liste ce niveau.
          pages[0].items = items.map(({ child, path: itemPath, count }) => ({ label: labelOf(child), path: itemPath, meta: plural(count, 'sujet') }));
        }
        items.forEach(({ child, segment, path: itemPath }) => {
          visit([...prefix, child], [...prefixSegments, segment], [...trail, { label: labelOf(child), path: itemPath }]);
        });
        return;
      }

      // Dernier niveau : matières, puis sujets de chaque matière.
      const matieres = [...new Set(inside.map(({ document }) => document.matiereId))]
        .map((matiereId) => matieresById.get(matiereId)).filter(Boolean).sort(byName);
      const matiereItems = matieres.map((matiere) => {
        const segment = segmentFor(matiere, matieres);
        const documents = inside.map(({ document }) => document).filter((document) => document.matiereId === matiere._id)
          .sort((left, right) => new Date(right.dateAjout) - new Date(left.dateAjout));
        return { matiere, segment, documents, path: catalogPath([organismeSegment, parcoursSegment, ...prefixSegments, segment]) };
      });
      pages.push({
        path: positionPath,
        step: 'matiere',
        context: { organisme, parcoursType, nodes: prefix, count: inside.length },
        trail,
        items: matiereItems.map(({ matiere, path: itemPath, documents }) => ({ label: labelOf(matiere), path: itemPath, meta: plural(documents.length, 'sujet') })),
        documents: inside.map(({ document }) => document),
        lastmod: lastmod(inside.map(({ document }) => document)),
      });
      matiereItems.forEach(({ matiere, path: itemPath, documents }) => {
        const matiereTrail = [...trail, { label: labelOf(matiere), path: itemPath }];
        pages.push({
          path: itemPath,
          step: 'documents',
          context: { organisme, parcoursType, nodes: prefix, matiere, count: documents.length },
          trail: matiereTrail,
          items: documents.map((document) => ({
            label: document.title,
            path: documentPath(document._id),
            meta: [formatDate(document.dateAjout), document.hasCorrection ? 'Corrigé' : null].filter(Boolean).join(' · '),
          })),
          documents,
          // Une matière à un seul sujet double la fiche du sujet : page servie, mais hors sitemap.
          inSitemap: documents.length > 1,
          lastmod: lastmod(documents),
        });
        documents.forEach((document) => {
          documentContexts.set(document._id, { organisme, parcoursType, nodes: prefix, matiere, crumbs: catalogCrumbs(matiereTrail) });
        });
      });
    };

    visit([], [], scopeTrail);
  });

  // Sujet hors de l'arbre (structure incomplète) : fiche servie, rattachée à l'organisme.
  organisme.documents.forEach((document) => {
    if (!documentContexts.has(document._id)) {
      documentContexts.set(document._id, {
        organisme, nodes: chainOf(document.noeudId), matiere: matieresById.get(document.matiereId), crumbs: catalogCrumbs(baseTrail),
      });
    }
  });

  return { pages, documentContexts, levels };
};

// ── Rendu ──────────────────────────────────────────────────────────────────────────────────

const header = () => `
<header class="border-b border-line bg-paper"><div class="mx-auto flex w-full max-w-site items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
  <a href="/" class="text-[19px] font-bold tracking-[-0.03em] text-ink">Fatafalta</a>
  <nav aria-label="Navigation principale" class="flex gap-4 text-[15px] font-medium text-ink-soft">
    <a href="/sujets">Sujets</a><a href="/recherche">Recherche</a><a href="/abonnement">Abonnement</a>
  </nav>
</div></header>`;

const footer = () => `
<footer class="mt-auto border-t border-line bg-paper"><div class="mx-auto w-full max-w-site px-4 py-10 text-sm text-ink-soft sm:px-6 lg:px-8">
  <p>Les anciens sujets de concours, tests et corrigés, réunis au même endroit.</p>
  <nav aria-label="Pied de page" class="mt-3 flex gap-4"><a href="/sujets">Sujets</a><a href="/abonnement">Abonnement</a></nav>
</div></footer>`;

const layout = (main) => `<div class="flex min-h-screen flex-col bg-paper font-sans text-ink antialiased">${header()}<main class="flex-1"><div class="mx-auto w-full max-w-site px-4 py-8 sm:px-6 md:py-12 lg:px-8">${main}</div></main>${footer()}</div>`;

const breadcrumbHtml = (crumbs) => `<nav aria-label="Fil d’Ariane" class="flex flex-wrap items-center gap-1 text-sm">${crumbs
  .map(({ label, path: href }, index) => (index === crumbs.length - 1
    ? `<span class="font-medium text-ink">${escapeHtml(label)}</span>`
    : `<a href="${escapeHtml(href)}" class="text-ink-soft">${escapeHtml(label)}</a><span class="text-ink-muted"> › </span>`))
  .join('')}</nav>`;

const listHtml = (items) => `<ul class="mt-3 overflow-hidden rounded-2xl border border-line bg-white">${items
  .map(({ label, path: href, meta }) => `<li class="border-b border-line px-5 py-4 last:border-0"><a href="${escapeHtml(href)}" class="text-[16px] font-semibold text-ink">${escapeHtml(label)}</a>${meta ? `<p class="mt-0.5 text-sm text-ink-soft">${escapeHtml(meta)}</p>` : ''}</li>`)
  .join('')}</ul>`;

const catalogPageHtml = ({ text, crumbs, items }) => layout(`
  ${breadcrumbHtml(crumbs)}
  <h1 class="mt-6 text-3xl font-bold tracking-[-0.03em] text-ink md:text-4xl">${escapeHtml(text.h1)}</h1>
  <p class="mt-1.5 text-ink-soft">${escapeHtml(text.description)}</p>
  <h2 class="mt-8 text-sm font-semibold uppercase tracking-[0.12em] text-ink-muted">${escapeHtml(text.listHeading)}</h2>
  ${listHtml(items)}`);

const documentPageHtml = (document, context, levels) => {
  const details = [
    ['Parcours', labelOf(context.parcoursType)],
    ...context.nodes.map((node, index) => [levels[index]?.libelleSingulier || 'Niveau', labelOf(node)]),
    ['Matière', labelOf(context.matiere)],
    ['Format', [String(document.extension || 'pdf').replace('.', '').toUpperCase(), formatFileSize(document.fileSize)].filter(Boolean).join(' · ')],
    ['Ajouté le', formatDate(document.dateAjout)],
  ].filter(([, value]) => Boolean(value));
  const correction = document.correctionIncludedInPdf
    ? 'Corrigé inclus : il se trouve dans le même PDF, à la suite du sujet.'
    : document.hasCorrection ? 'Le corrigé de ce sujet est disponible.' : 'Le corrigé de ce sujet n’a pas encore été publié.';
  const parent = context.crumbs[context.crumbs.length - 1];
  return layout(`
  ${breadcrumbHtml([...context.crumbs, { label: document.title, path: documentPath(document._id) }])}
  <article class="max-w-3xl">
    <h1 class="mt-6 text-3xl font-bold leading-tight tracking-[-0.03em] text-ink md:text-[40px]">${escapeHtml(document.title)}</h1>
    ${document.description ? `<p class="mt-3 text-lg leading-relaxed text-ink-soft">${escapeHtml(document.description)}</p>` : ''}
    <p class="mt-6 text-ink-soft">Document réservé aux membres : connectez-vous pour vérifier votre accès au téléchargement.</p>
    <p class="mt-4 text-sm text-ink-soft">${escapeHtml(correction)}</p>
    <dl class="mt-10 rounded-2xl border border-line bg-white px-5">${details
    .map(([label, value]) => `<div class="flex justify-between gap-4 border-b border-line py-3 last:border-0"><dt class="text-sm text-ink-soft">${escapeHtml(label)}</dt><dd class="text-sm font-medium text-ink">${escapeHtml(value)}</dd></div>`)
    .join('')}</dl>
    ${parent && context.crumbs.length > 1 ? `<p class="mt-8 text-sm"><a href="${escapeHtml(parent.path)}" class="font-semibold text-burgundy">Tous les sujets : ${escapeHtml(context.crumbs.slice(1).map(({ label }) => label).join(' · '))}</a></p>` : ''}
  </article>`);
};

const homeHtml = (organismes) => layout(`
  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-gold-ink">Concours · Examens · Tests</p>
  <h1 class="mt-4 text-[40px] font-extrabold leading-[1.05] tracking-[-0.035em] text-ink sm:text-5xl">Les anciens sujets de concours, avec leurs corrigés.</h1>
  <p class="mt-5 max-w-lg text-lg leading-relaxed text-ink-soft">Fatafalta réunit les sujets, tests et corrigés des concours passés pour vous aider à vous préparer sérieusement.</p>
  <p class="mt-6"><a href="/sujets" class="font-semibold text-burgundy">Explorer les sujets</a></p>
  <h2 class="mt-16 text-3xl font-bold tracking-[-0.03em] text-ink">Parcourez par organisme</h2>
  <p class="mt-2 text-ink-soft">Les organismes dont les sujets sont déjà disponibles.</p>
  ${listHtml(organismes.slice(0, 8).map((organisme) => ({
    label: organismeLabel(organisme), path: catalogPath([segmentFor(organisme, organismes)]), meta: plural(organisme.documents.length, 'sujet'),
  })))}
  <h2 class="mt-16 text-3xl font-bold tracking-[-0.03em] text-ink">Trois étapes, pas plus.</h2>
  <ol class="mt-6 grid gap-6 md:grid-cols-3">
    <li><h3 class="text-lg font-semibold text-ink">Choisissez votre concours</h3><p class="text-ink-soft">Organisme, concours, année, matière : chaque sujet est rangé à sa place.</p></li>
    <li><h3 class="text-lg font-semibold text-ink">Consultez le sujet</h3><p class="text-ink-soft">Voyez ce qui est disponible, avec ou sans corrigé, avant de vous engager.</p></li>
    <li><h3 class="text-lg font-semibold text-ink">Téléchargez et révisez</h3><p class="text-ink-soft">Avec votre abonnement, gardez sujets et corrigés pour travailler hors ligne.</p></li>
  </ol>
  <p class="mt-10"><a href="/abonnement" class="font-semibold text-burgundy">Voir l’abonnement</a></p>`);

const simplePageHtml = (h1, text, link) => layout(`
  <h1 class="text-3xl font-bold tracking-[-0.03em] text-ink">${escapeHtml(h1)}</h1>
  <p class="mt-2 text-ink-soft">${escapeHtml(text)}</p>
  ${link ? `<p class="mt-6"><a href="${link.path}" class="font-semibold text-burgundy">${escapeHtml(link.label)}</a></p>` : ''}`);

// ── Écriture ───────────────────────────────────────────────────────────────────────────────

const pageFromTemplate = (template, { seo, body, extraHead = '' }) => {
  const head = renderHead(seo) + extraHead;
  return template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta[^>]*data-seo[^>]*>/g, '')
    .replace('</head>', `${head}</head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
};

const writePage = async (pagePath, html) => {
  const target = pagePath === '/'
    ? path.join(BUILD_DIR, 'index.html')
    : pagePath.endsWith('.html')
      ? path.join(BUILD_DIR, pagePath)
      : path.join(BUILD_DIR, ...pagePath.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment)), 'index.html');
  if (!target.startsWith(BUILD_DIR)) throw new Error(`Chemin hors du dossier de build : ${pagePath}`);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html);
};

const sitemapXml = (entries) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(({ path: entryPath, lastmod }) => `  <url><loc>${escapeHtml(absoluteUrl(entryPath))}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;

const robotsTxt = () => `# Fatafalta — règles d'exploration.
# Les pages publiques (accueil, catalogue des sujets, fiches, abonnement) sont ouvertes à tous les robots,
# y compris Googlebot, Bingbot et OAI-SearchBot (ChatGPT Search).
# Espace personnel et administration : rien à explorer (ces pages exigent une connexion).
# robots.txt ne protège rien : l'accès aux données et aux fichiers reste contrôlé par l'API.
User-agent: *
Allow: /
Disallow: /compte
Disallow: /dashboard

Sitemap: ${absoluteUrl('/sitemap.xml')}
`;

const verificationTags = () => [
  process.env.GOOGLE_SITE_VERIFICATION && `<meta name="google-site-verification" content="${escapeHtml(process.env.GOOGLE_SITE_VERIFICATION)}">`,
  process.env.BING_SITE_VERIFICATION && `<meta name="msvalidate.01" content="${escapeHtml(process.env.BING_SITE_VERIFICATION)}">`,
].filter(Boolean).join('');

const main = async () => {
  const template = await readFile(path.join(BUILD_DIR, 'index.html'), 'utf8');
  if (!template.includes('<div id="root"></div>')) throw new Error('build/index.html déjà pré-rendu : relancez `npm run build`.');

  const feed = await loadFeed();
  if (!feed && process.env.PRERENDER_ALLOW_OFFLINE !== 'true') {
    throw new Error(`Catalogue injoignable (${API_URL}/api/seo/catalog). PRERENDER_ALLOW_OFFLINE=true pour publier sans pages du catalogue.`);
  }
  const organismes = (feed?.organismes || []).filter((organisme) => organisme.documents?.length);
  const sitemap = [];

  // Coquille de l'application (adresses non pré-rendues : espace personnel, sujets publiés depuis
  // la dernière construction…) : aucune canonique ni consigne d'indexation, React les fixe.
  await writePage('/app.html', template);

  const home = { ...PAGES_SEO.home };
  await writePage('/', pageFromTemplate(template, { seo: home, body: homeHtml(organismes), extraHead: verificationTags() }));
  sitemap.push({ path: '/', lastmod: feed?.updatedAt });

  await writePage('/abonnement', pageFromTemplate(template, {
    seo: PAGES_SEO.subscribe,
    body: simplePageHtml('Préparez vos concours avec tous les sujets.', PAGES_SEO.subscribe.description, { path: '/sujets', label: 'Parcourir les sujets' }),
  }));
  sitemap.push({ path: '/abonnement' });

  await writeFile(path.join(BUILD_DIR, '404.html'), pageFromTemplate(template, {
    seo: PAGES_SEO.notFound,
    body: simplePageHtml('Page introuvable', 'Ce lien ne correspond à aucune page de Fatafalta. Il est peut-être incomplet ou a été modifié.', { path: '/sujets', label: 'Parcourir les sujets' }),
  }));

  // Catalogue : racine, organismes, parcours, niveaux, matières, fiches.
  const rootText = catalogText({ organismes, step: 'organisme' });
  await writePage(CATALOG_ROOT, pageFromTemplate(template, {
    seo: catalogSeo({ text: rootText, path: CATALOG_ROOT, crumbs: catalogCrumbs([]) }),
    body: catalogPageHtml({
      text: rootText,
      crumbs: [{ label: 'Organismes', path: CATALOG_ROOT }],
      items: organismes.map((organisme) => ({
        label: organismeLabel(organisme), path: catalogPath([segmentFor(organisme, organismes)]), meta: plural(organisme.documents.length, 'sujet'),
      })),
    }),
  }));
  sitemap.push({ path: CATALOG_ROOT, lastmod: feed?.updatedAt });

  let catalogPages = 0;
  let documentPages = 0;
  for (const organisme of organismes) {
    const { pages, documentContexts, levels } = organismePages(organisme, organismes);
    for (const page of pages) {
      const text = catalogText({ ...page.context, organismes, levels, step: page.step });
      const crumbs = catalogCrumbs(page.trail);
      await writePage(page.path, pageFromTemplate(template, {
        seo: catalogSeo({ text, path: page.path, crumbs }),
        body: catalogPageHtml({ text, crumbs: [{ label: 'Organismes', path: CATALOG_ROOT }, ...page.trail], items: page.items || [] }),
      }));
      if (page.inSitemap !== false) sitemap.push({ path: page.path, lastmod: page.lastmod });
      catalogPages += 1;
    }
    for (const document of organisme.documents) {
      const context = documentContexts.get(document._id);
      await writePage(documentPath(document._id), pageFromTemplate(template, {
        seo: documentSeo(document, context),
        body: documentPageHtml(document, context, levels),
      }));
      sitemap.push({ path: documentPath(document._id), lastmod: document.updatedAt || document.dateAjout });
      documentPages += 1;
    }
  }

  const unique = [...new Map(sitemap.map((entry) => [entry.path, entry])).values()];
  if (unique.length > 50000) throw new Error('Plus de 50 000 adresses : découper le sitemap (index de sitemaps).');
  await writeFile(path.join(BUILD_DIR, 'sitemap.xml'), sitemapXml(unique));
  await writeFile(path.join(BUILD_DIR, 'robots.txt'), robotsTxt());

  const indexNowKey = process.env.INDEXNOW_KEY;
  if (indexNowKey) {
    if (!/^[a-zA-Z0-9-]{8,128}$/.test(indexNowKey)) throw new Error('INDEXNOW_KEY invalide (8 à 128 caractères : lettres, chiffres, tirets).');
    await writeFile(path.join(BUILD_DIR, `${indexNowKey}.txt`), indexNowKey);
  }

  console.log(`[prerender] ${SITE_URL} : ${organismes.length} organisme(s), ${catalogPages} page(s) de catalogue, ${documentPages} fiche(s), ${unique.length} adresse(s) dans le sitemap.${feed ? '' : ' (hors ligne : pages fixes uniquement)'}`);
};

main().catch((error) => {
  console.error(`[prerender] ${error.message}`);
  process.exitCode = 1;
});
