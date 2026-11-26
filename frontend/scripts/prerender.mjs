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
 * adresses non pré-rendues), _redirects et _headers (Cloudflare Pages) et, si INDEXNOW_KEY est défini,
 * le fichier de clé IndexNow. Pages écrites en `chemin.html` : Cloudflare Pages les sert sans redirection.
 *
 * Données : un seul appel à GET /api/seo/catalog (sujets publiés uniquement, sans fichier ni lien).
 * API injoignable : la construction échoue et Render garde la version en ligne, sauf si
 * PRERENDER_ALLOW_OFFLINE=true (pages fixes uniquement).
 *
 * Variables : REACT_APP_SITE_URL, REACT_APP_API_URL (ou PRERENDER_API_URL), PRERENDER_FEED_FILE
 * (flux JSON local, pour les tests), INDEXNOW_KEY, GOOGLE_SITE_VERIFICATION, BING_SITE_VERIFICATION.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SITE_DESCRIPTION, SITE_URL, absoluteUrl, renderHead } from '../src/lib/seo.js';
import { PAGES_SEO } from '../src/lib/pagesSeo.js';
import { DOCUMENTS as LEGAL_DOCUMENTS, LEGAL_DATE_TEXTE, LEGAL_VERSION, legalSeo } from '../src/legal/documents.js';
import {
  CATALOG_ROOT, catalogCrumbs, catalogPath, catalogSeo, catalogText, documentPath, documentSeo,
} from '../src/lib/catalogSeo.js';
import { formatDate, formatFileSize, labelOf, organismeLabel } from '../src/lib/format.js';
import { segmentFor } from '../src/lib/slug.js';
import { PREP_ROOT, prepHomeSeo, programmeModules, programmePath, programmeSeo } from '../src/lib/prepSeo.js';

const BUILD_DIR = path.resolve(process.env.PRERENDER_BUILD_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'build'));
const API_URL = (process.env.PRERENDER_API_URL || process.env.REACT_APP_API_URL || 'https://api.fatafalta.com').replace(/\/+$/, '');
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

const fetchJson = async (pathname, attempts = ATTEMPTS) => {
  // Le serveur gratuit de Render peut être en veille : plusieurs tentatives espacées.
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(`${API_URL}${pathname}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'fatafalta-prerender' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()).data;
    } catch (error) {
      console.warn(`[prerender] ${pathname} indisponible (essai ${attempt}/${attempts}) : ${error.message}`);
      if (attempt < attempts) await sleep(RETRY_DELAY_MS);
    }
  }
  return null;
};

const loadFeed = async () => {
  if (process.env.PRERENDER_FEED_FILE) {
    return JSON.parse(await readFile(process.env.PRERENDER_FEED_FILE, 'utf8')).data;
  }
  return fetchJson('/api/seo/catalog');
};

/**
 * Préparation publique : catalogue des programmes, puis chaque programme publié (programme officiel,
 * épreuves, matières, modules et titres des leçons ; jamais le contenu des leçons ni les corrigés).
 * Facultatif : en cas d'échec, ces adresses sont servies par la coquille de l'application.
 */
const loadPrep = async () => {
  if (process.env.PRERENDER_PREP_FILE) {
    return JSON.parse(await readFile(process.env.PRERENDER_PREP_FILE, 'utf8'));
  }
  if (process.env.PRERENDER_FEED_FILE) return null;
  const catalogue = await fetchJson('/api/prep/catalogue', 2);
  if (!Array.isArray(catalogue)) return null;
  const codes = catalogue.flatMap((organisme) => (organisme.cycles || []).filter((cycle) => cycle.publie !== false).map((cycle) => cycle.programme));
  const programmes = [];
  for (const code of codes) {
    const data = await fetchJson(`/api/prep/programmes/${encodeURIComponent(code)}`, 2);
    // Programme annoncé mais illisible : la construction échoue et la version en ligne reste servie
    // (sinon l'accueil de la préparation publierait un lien vers une page absente).
    if (!data?.programme) throw new Error(`Programme ${code} annoncé par le catalogue mais injoignable.`);
    programmes.push(data);
  }
  return { catalogue, programmes };
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

/*
 * Droit de téléchargement d'une fiche, calculé par le serveur (flux SEO : `acces` du document,
 * `accessPolicy` du catalogue). Sans ces champs, une phrase générale exacte, jamais une promesse.
 */
const accessText = (document, policy) => {
  if (document.acces === 'gratuit') return 'Téléchargement gratuit, sans compte.';
  if (document.acces === 'quota') {
    return policy?.freeQuota
      ? `Téléchargeable avec le quota gratuit (${policy.freeQuota} sujets de cette période, sans abonnement) ou avec un abonnement.`
      : 'Téléchargeable avec le quota gratuit ou avec un abonnement.';
  }
  if (document.acces === 'abonnement') return 'Téléchargement réservé aux abonnés.';
  return 'Les sujets anciens sont gratuits ; les plus récents demandent le quota gratuit ou un abonnement, selon leur année.';
};

/** Règle d'accès en une phrase (llms.txt, abonnement), à partir des seuils publiés par le serveur. */
const accessPolicyText = (policy) => (policy?.freeUntilYear
  ? `Les fiches des sujets sont publiques. Téléchargement des PDF : gratuit et sans compte pour les sujets de ${policy.freeUntilYear} et avant ; de ${policy.freeUntilYear + 1} à ${policy.freeQuotaUntilYear}, ${policy.freeQuota} téléchargements gratuits au total, puis abonnement ; à partir de ${policy.freeQuotaUntilYear + 1}, abonnement.`
  : 'Les fiches des sujets sont publiques ; le téléchargement des PDF est gratuit pour les sujets anciens et demande, pour les plus récents, le quota gratuit ou un abonnement.');

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
  <nav aria-label="Pied de page" class="mt-3 flex flex-wrap gap-4"><a href="/sujets">Sujets</a><a href="/abonnement">Abonnement</a><a href="/conditions-utilisation">Conditions d’utilisation</a><a href="/politique-confidentialite">Confidentialité</a><a href="/mentions-legales">Mentions légales</a><a href="/informations-legales">Informations légales</a></nav>
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

const documentPageHtml = (document, context, levels, accessPolicy) => {
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
    <p class="mt-6 text-ink-soft">${escapeHtml(accessText(document, accessPolicy))}</p>
    <p class="mt-4 text-sm text-ink-soft">${escapeHtml(correction)}</p>
    <dl class="mt-10 rounded-2xl border border-line bg-white px-5">${details
    .map(([label, value]) => `<div class="flex justify-between gap-4 border-b border-line py-3 last:border-0"><dt class="text-sm text-ink-soft">${escapeHtml(label)}</dt><dd class="text-sm font-medium text-ink">${escapeHtml(value)}</dd></div>`)
    .join('')}</dl>
    ${parent && context.crumbs.length > 1 ? `<p class="mt-8 text-sm"><a href="${escapeHtml(parent.path)}" class="font-semibold text-burgundy">Tous les sujets : ${escapeHtml(context.crumbs.slice(1).map(({ label }) => label).join(' · '))}</a></p>` : ''}
  </article>`);
};

// Mêmes H1, introduction et accès que l'accueil React (pages/Home.js) : les deux offres sont visibles sans JavaScript.
const homeHtml = (organismes, prep) => layout(`
  <h1 class="mt-4 text-[40px] font-extrabold leading-[1.05] tracking-[-0.035em] text-ink sm:text-5xl">Préparez vos concours, des anciens sujets au jour J.</h1>
  <p class="mt-5 max-w-lg text-lg leading-relaxed text-ink-soft">Les sujets et corrigés des concours passés, et une préparation guidée : cours en vidéo, exercices corrigés et concours blancs.</p>
  <p class="mt-6 flex flex-wrap gap-6"><a href="/sujets" class="font-semibold text-burgundy">Explorer les sujets</a><a href="${PREP_ROOT}" class="font-semibold text-burgundy">Découvrir la préparation</a></p>
  <h2 class="mt-16 text-3xl font-bold tracking-[-0.03em] text-ink">Parcourez par organisme</h2>
  <p class="mt-2 text-ink-soft">Les organismes dont les sujets sont déjà disponibles.</p>
  ${listHtml(organismes.slice(0, 8).map((organisme) => ({
    label: organismeLabel(organisme), path: catalogPath([segmentFor(organisme, organismes)]), meta: plural(organisme.documents.length, 'sujet'),
  })))}
  ${prep?.programmes?.length ? `
  <h2 class="mt-16 text-3xl font-bold tracking-[-0.03em] text-ink">Préparez un concours pas à pas</h2>
  <p class="mt-2 text-ink-soft">Programme officiel, leçons courtes avec vidéo, exercices corrigés par niveau et concours blancs chronométrés.</p>
  ${listHtml(prep.programmes.map(({ programme }) => ({ label: `${programme.organisme?.sigle || ''} · ${programme.titre}`, path: programmePath(programme.code) })))}` : ''}
  <p class="mt-10"><a href="/abonnement" class="font-semibold text-burgundy">Voir l’abonnement</a></p>`);

const simplePageHtml = (h1, text, link) => layout(`
  <h1 class="text-3xl font-bold tracking-[-0.03em] text-ink">${escapeHtml(h1)}</h1>
  <p class="mt-2 text-ink-soft">${escapeHtml(text)}</p>
  ${link ? `<p class="mt-6"><a href="${link.path}" class="font-semibold text-burgundy">${escapeHtml(link.label)}</a></p>` : ''}`);

// Documents juridiques : texte intégral dans le HTML (lisible sans JavaScript, indexable).
const legalInline = (text) => escapeHtml(text)
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => `<a href="${href}" class="font-medium text-ink underline">${label}</a>`)
  .replace(/\[(À COMPLÉTER[^\]]*)\]/g, '<mark>$1</mark>');
const legalBlocHtml = (bloc) => {
  if (bloc.liste) return `<ul class="my-4 list-disc space-y-2 pl-5">${bloc.liste.map((item) => `<li>${legalInline(item)}</li>`).join('')}</ul>`;
  if (bloc.tableau) return `<table class="my-5 w-full text-left"><thead><tr>${bloc.tableau.entetes.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${bloc.tableau.lignes.map((ligne) => `<tr>${ligne.map((cell) => `<td>${legalInline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  if (bloc.note) return `<p class="my-5 rounded-xl bg-paper-dim px-5 py-4">${legalInline(bloc.note)}</p>`;
  return `<p class="my-4">${legalInline(bloc.p)}</p>`;
};
const legalPageHtml = (doc) => layout(`
  <article class="max-w-[68ch] text-[17px] leading-[1.7] text-ink-soft">
  <a href="/informations-legales" class="text-[14px] text-ink-muted">Informations légales</a>
  <h1 class="mt-3 text-3xl font-bold tracking-[-0.03em] text-ink md:text-4xl">${escapeHtml(doc.titre)}</h1>
  <p class="mt-4 text-[14px] text-ink-muted">Version ${escapeHtml(LEGAL_VERSION)} · En vigueur le ${escapeHtml(LEGAL_DATE_TEXTE)}</p>
  ${doc.essentiel?.length ? `<h2 class="mt-8 text-[15px] font-bold text-ink">L’essentiel</h2><ul class="mt-3 list-disc pl-5">${doc.essentiel.map((item) => `<li>${legalInline(item)}</li>`).join('')}</ul>` : ''}
  ${doc.sections.map((section) => `<section id="${escapeHtml(section.id)}"><h2 class="mt-12 text-[22px] font-bold text-ink">${escapeHtml(section.titre)}</h2>${section.blocs.map(legalBlocHtml).join('')}</section>`).join('')}
  <p class="mt-12">Une question sur ce document ? <a href="mailto:contact@fatafalta.com">contact@fatafalta.com</a></p>
  </article>
  <h2 class="mt-16 text-xl font-bold text-ink">Les autres documents</h2>
  ${listHtml(LEGAL_DOCUMENTS.filter((d) => d.slug !== doc.slug).map((d) => ({ label: d.titre, path: `/${d.slug}` })))}`);
const LEGAL_HUB_SEO = {
  title: 'Informations légales — Fatafalta',
  description: 'Conditions d’utilisation, conditions d’abonnement, politique de confidentialité, cookies, sécurité, propriété intellectuelle et mentions légales de Fatafalta.',
  path: '/informations-legales',
};
const legalHubHtml = () => layout(`
  <h1 class="text-3xl font-bold tracking-[-0.03em] text-ink md:text-4xl">Informations légales</h1>
  <p class="mt-2 max-w-2xl text-ink-soft">Les règles qui encadrent l’utilisation de Fatafalta, l’abonnement et la protection de tes données. Version ${escapeHtml(LEGAL_VERSION)}, en vigueur le ${escapeHtml(LEGAL_DATE_TEXTE)}.</p>
  ${listHtml(LEGAL_DOCUMENTS.map((d) => ({ label: d.titre, path: `/${d.slug}`, meta: d.resume })))}`);

const prepHomeHtml = (catalogue) => layout(`
  ${breadcrumbHtml([{ label: 'Accueil', path: '/' }, { label: 'Préparation', path: PREP_ROOT }])}
  <h1 class="mt-6 text-3xl font-bold tracking-[-0.03em] text-ink md:text-4xl">Préparation aux concours</h1>
  <p class="mt-2 max-w-2xl text-ink-soft">Pour chaque concours : le programme officiel, des leçons courtes avec une vidéo, des exercices corrigés par niveau, des concours blancs chronométrés et un suivi de progression, sur le site et sur l’application Android.</p>
  ${catalogue.map((organisme) => `
  <h2 class="mt-10 text-xl font-bold text-ink">${escapeHtml(organisme.sigle || organisme.nom)}</h2>
  ${listHtml((organisme.cycles || []).filter((cycle) => cycle.publie !== false).map((cycle) => ({
    label: cycle.nom, path: programmePath(cycle.programme), meta: [cycle.parcoursType, cycle.matieres ? plural(cycle.matieres, 'matière') : null].filter(Boolean).join(' · '),
  })))}`).join('')}
  <p class="mt-10 text-ink-soft">Les anciens sujets et leurs corrigés restent consultables dans le <a href="/sujets" class="font-semibold text-burgundy">catalogue des sujets</a>.</p>`);

const programmeHtml = (data) => {
  const { programme } = data;
  const sigle = programme.organisme?.sigle || '';
  const epreuves = programme.epreuves || [];
  const matieres = programmeModules(data);
  const sources = (programme.sources || []).filter((source) => source.titre && source.url);
  return layout(`
  ${breadcrumbHtml([{ label: 'Accueil', path: '/' }, { label: 'Préparation', path: PREP_ROOT }, { label: `${sigle} · ${programme.titre}`, path: programmePath(programme.code) }])}
  <article class="max-w-3xl">
    <h1 class="mt-6 text-3xl font-bold leading-tight tracking-[-0.03em] text-ink md:text-4xl">${escapeHtml(`Préparer le concours ${sigle} · ${programme.titre}`)}</h1>
    ${programme.description ? `<p class="mt-3 text-lg leading-relaxed text-ink-soft">${escapeHtml(programme.description)}</p>` : ''}
    ${epreuves.length ? `
    <h2 class="mt-10 text-xl font-bold text-ink">Les épreuves du concours</h2>
    <table class="mt-3 w-full text-left text-sm"><thead><tr><th scope="col" class="py-2">Épreuve</th><th scope="col" class="py-2">Durée</th><th scope="col" class="py-2">Coefficient</th></tr></thead><tbody>${epreuves
    .map((epreuve) => `<tr class="border-t border-line"><td class="py-2 font-medium text-ink">${escapeHtml(epreuve.nom)}${epreuve.note ? `<br><span class="text-ink-soft">${escapeHtml(epreuve.note)}</span>` : ''}</td><td class="py-2">${escapeHtml(epreuve.duree || '—')}</td><td class="py-2 tabular-nums">${escapeHtml(epreuve.coefficient ?? '—')}</td></tr>`)
    .join('')}</tbody></table>` : ''}
    ${matieres.length ? `
    <h2 class="mt-10 text-xl font-bold text-ink">Le programme de préparation</h2>
    ${matieres.map((matiere) => `
    <h3 class="mt-6 text-lg font-semibold text-ink">${escapeHtml(matiere.nom)}</h3>
    <ul class="mt-2 grid gap-3">${matiere.modules.map((module) => `<li><p class="font-medium text-ink">${escapeHtml(module.titre)}</p>${module.resume ? `<p class="text-sm text-ink-soft">${escapeHtml(module.resume)}</p>` : ''}${(module.lecons || []).length ? `<p class="text-sm text-ink-soft">Leçons : ${escapeHtml(module.lecons.map((lecon) => lecon.titre).join(' · '))}</p>` : ''}</li>`).join('')}</ul>`).join('')}` : ''}
    ${programme.concoursBlanc?.nbQuestions ? `<p class="mt-8 text-ink-soft">${escapeHtml(`Concours blanc : ${programme.concoursBlanc.nbQuestions} questions en ${programme.concoursBlanc.dureeMinutes} minutes, noté automatiquement.`)}</p>` : ''}
    ${sources.length ? `
    <h2 class="mt-10 text-xl font-bold text-ink">Sources</h2>
    <ul class="mt-2 grid gap-1 text-sm text-ink-soft">${sources.map((source) => `<li><a href="${escapeHtml(source.url)}" rel="noopener" class="underline">${escapeHtml(source.titre)}</a></li>`).join('')}</ul>` : ''}
    <p class="mt-10"><a href="/register?next=${encodeURIComponent(programmePath(programme.code))}" class="font-semibold text-burgundy">Créer un compte et commencer la préparation</a></p>
  </article>`);
};

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
      // Cloudflare Pages sert /a/b depuis a/b.html sans redirection ; a/b/index.html imposerait une
      // redirection 308 vers /a/b/ et une canonique qui ne correspond plus à l'adresse servie.
      : `${path.join(BUILD_DIR, ...pagePath.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment)))}.html`;
  if (!target.startsWith(BUILD_DIR)) throw new Error(`Chemin hors du dossier de build : ${pagePath}`);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html);
  if (!pagePath.endsWith('.html')) pageFingerprints.set(pagePath, contentFingerprint(html));
};

// ── Empreintes, lastmod et manifeste d'indexation ──────────────────────────────────────────

/*
 * Empreinte du contenu « significatif » d'une page, au sens de Google : titre, description, canonique,
 * consigne robots, données structurées et contenu principal (<main>). L'en-tête, le pied de page et les
 * fichiers JavaScript/CSS du build n'y entrent pas : les modifier ne change ni lastmod ni IndexNow.
 */
const pageFingerprints = new Map();
const contentFingerprint = (html) => {
  const head = html.split('</head>')[0];
  const parts = [
    ...(head.match(/<title>[\s\S]*?<\/title>/g) || []),
    ...(head.match(/<meta[^>]+name="(?:description|robots)"[^>]*>/g) || []),
    ...(head.match(/<link[^>]+rel="canonical"[^>]*>/g) || []),
    ...(html.match(/<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g) || []),
    ...(html.match(/<main[\s\S]*?<\/main>/g) || []),
  ];
  // Normalisation : classes CSS et espaces ne sont pas du contenu (un changement de style ≠ changement).
  const normalized = parts.join('\n').replace(/\sclass="[^"]*"/g, '').replace(/\s+/g, ' ').trim();
  return createHash('sha256').update(normalized).digest('hex').slice(0, 24);
};
const FINGERPRINT_VERSION = 1; // à incrémenter si l'algorithme change : le backend repart d'une base neuve

const SITEMAP_CHUNK = 45000; // limite du protocole : 50 000 URL et 50 Mo par fichier
const iso = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
};

/*
 * Manifeste de la version en ligne (avant ce déploiement). PRERENDER_PREVIOUS_MANIFEST=off le désactive,
 * PRERENDER_PREVIOUS_MANIFEST_FILE le lit sur disque (tests). Absent ou illisible : null.
 */
const loadPreviousManifest = async () => {
  if (process.env.PRERENDER_PREVIOUS_MANIFEST === 'off') return null;
  try {
    if (process.env.PRERENDER_PREVIOUS_MANIFEST_FILE) return JSON.parse(await readFile(process.env.PRERENDER_PREVIOUS_MANIFEST_FILE, 'utf8'));
    if (process.env.PRERENDER_FEED_FILE) return null; // build de test : jamais d'appel réseau
    const res = await fetch(`${SITE_URL}/seo-manifest.json`, { headers: { 'User-Agent': 'fatafalta-prerender' }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const manifest = await res.json();
    return manifest?.version === 1 && manifest.pages ? manifest : null;
  } catch (error) {
    console.warn(`[prerender] Manifeste en ligne illisible (${error.message}) : lastmod tiré des seules données.`);
    return null;
  }
};

/*
 * lastmod exact : empreinte inchangée → date précédente conservée ; page nouvelle ou modifiée → date des
 * données si elle est plus récente que la précédente, sinon l'heure du build. Sans manifeste précédent,
 * seules les dates des données servent (jamais une date inventée).
 */
const resolveLastmod = (entry, hash, previous, builtAt) => {
  const data = iso(entry.lastmod);
  if (!previous || previous.fp !== FINGERPRINT_VERSION) return data;
  const before = previous.pages[entry.path];
  if (before && before.h === hash) return before.m || data;
  // Absente d'une version précédente incomplète (catalogue ou préparation manquants) : rien ne prouve
  // un changement, seule la date des données vaut.
  if (!before && previous.complete === false) return data;
  if (data && (!before?.m || data > before.m)) return data;
  return builtAt;
};

const sitemapXml = (entries) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(({ path: entryPath, lastmod }) => `  <url><loc>${escapeHtml(absoluteUrl(entryPath))}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;

const sitemapIndexXml = (files) => `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${files.map(({ name, lastmod }) => `  <sitemap><loc>${escapeHtml(absoluteUrl(`/${name}`))}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</sitemap>`).join('\n')}
</sitemapindex>
`;

/** Sitemaps par catégorie (index dans sitemap.xml), manifeste et identifiant de build. */
const writeSitemapsAndManifest = async (entries, { complete }) => {
  const builtAt = new Date().toISOString();
  const previous = await loadPreviousManifest();
  const pages = {};
  const resolved = entries.map((entry) => {
    const hash = pageFingerprints.get(entry.path);
    if (!hash) throw new Error(`Page sans empreinte : ${entry.path}`);
    const lastmod = resolveLastmod(entry, hash, previous, builtAt);
    pages[entry.path] = { h: hash, m: lastmod, c: entry.category, ...(entry.inSitemap === false ? { s: 0 } : {}) };
    return { ...entry, lastmod };
  });

  const files = [];
  for (const category of ['pages', 'concours', 'sujets', 'preparations']) {
    const inCategory = resolved.filter((entry) => entry.category === category && entry.inSitemap !== false);
    for (let start = 0, part = 1; start < inCategory.length; start += SITEMAP_CHUNK, part += 1) {
      const chunk = inCategory.slice(start, start + SITEMAP_CHUNK);
      const name = `sitemap-${category}${part > 1 ? `-${part}` : ''}.xml`;
      const xml = sitemapXml(chunk);
      // lastmod d'une entrée d'index = dernière modification de CE fichier (ajout, retrait ou date d'une
      // page) : contenu identique → date précédente conservée ; modifié → heure du build.
      const fileHash = createHash('sha256').update(xml).digest('hex').slice(0, 24);
      const before = previous?.sitemaps?.[name];
      const lastmod = before?.h === fileHash ? before.m : previous?.sitemaps ? builtAt : chunk.map((entry) => entry.lastmod).filter(Boolean).sort().pop() || null;
      await writeFile(path.join(BUILD_DIR, name), xml);
      files.push({ name, category, lastmod, h: fileHash });
    }
  }
  await writeFile(path.join(BUILD_DIR, 'sitemap.xml'), sitemapIndexXml(files));

  const manifestBody = JSON.stringify(pages);
  const contentHash = createHash('sha256').update(manifestBody).digest('hex').slice(0, 16);
  const buildId = `${builtAt.replace(/[^0-9]/g, '').slice(0, 14)}-${contentHash}`;
  const commit = (process.env.CF_PAGES_COMMIT_SHA || '').slice(0, 12) || null;
  await writeFile(path.join(BUILD_DIR, 'seo-manifest.json'), JSON.stringify({ version: 1, fp: FINGERPRINT_VERSION, complete, buildId, builtAt, site: SITE_URL, commit, sitemaps: Object.fromEntries(files.map((file) => [file.name, { h: file.h, m: file.lastmod }])), pages }));
  await writeFile(path.join(BUILD_DIR, 'seo-build.json'), JSON.stringify({ version: 1, fp: FINGERPRINT_VERSION, complete, buildId, builtAt, commit, contentHash, pages: resolved.length, sitemaps: files.map((file) => file.name) }));
  return { files, count: resolved.filter((entry) => entry.inSitemap !== false).length, previous: Boolean(previous) };
};

const robotsTxt = () => `# Fatafalta — règles d'exploration.
# Pages publiques (accueil, catalogue des sujets, fiches, préparation, abonnement) : ouvertes à tous les
# robots, moteurs de recherche et moteurs de réponse (Googlebot, Bingbot, OAI-SearchBot, PerplexityBot,
# ClaudeBot…). Espace personnel, administration et coquille de l'application : rien à explorer.
# robots.txt ne protège rien : l'accès aux fichiers PDF et aux données reste contrôlé par l'API.
User-agent: *
Allow: /
Disallow: /compte
Disallow: /dashboard
Disallow: /app

Sitemap: ${absoluteUrl('/sitemap.xml')}
`;

/*
 * Cloudflare Pages : routes de l'application sans page pré-rendue, servies par la coquille (/app)
 * avec un statut 200 (sans cette règle, elles recevraient 404.html et un statut 404).
 * Les règles de _redirects passent avant les fichiers : aucune ne doit couvrir une page pré-rendue.
 */
const APP_ROUTES = [
  '/login', '/register', '/verifier-email', '/mot-de-passe-oublie', '/recherche', '/telecharger', '/compte', '/compte/*', '/dashboard', '/dashboard/*',
  `${PREP_ROOT}/:programme/revisions`, `${PREP_ROOT}/:programme/classement`, `${PREP_ROOT}/:programme/concours-blanc`,
  `${PREP_ROOT}/:programme/test-de-niveau`, `${PREP_ROOT}/:programme/:module/lecon/:lecon`, `${PREP_ROOT}/:programme/:module/niveau/:niveau`,
];
const redirectsFile = ({ prepRendered }) => `# Généré par scripts/prerender.mjs — ne pas modifier à la main.
${[...APP_ROUTES, ...(prepRendered ? [] : [PREP_ROOT, `${PREP_ROOT}/:programme`])].map((route) => `${route} /app 200`).join('\n')}
`;

/*
 * En-têtes Cloudflare Pages. Fichiers versionnés (empreinte dans le nom) : cache d'un an. Pages HTML et
 * service worker : toujours revalidés, pour qu'une publication soit visible aussitôt.
 */
const headersFile = () => `# Généré par scripts/prerender.mjs — ne pas modifier à la main.
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()

/static/*
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/sw.js
  Cache-Control: no-cache

/seo-*.json
  Cache-Control: no-cache
  X-Robots-Tag: noindex

/app
  X-Robots-Tag: noindex

/404
  X-Robots-Tag: noindex
`;

/*
 * llms.txt (proposition llmstxt.org) : résumé factuel du site et liens vers ses pages de référence, en
 * Markdown, pour les assistants qui le consultent. Aucun moteur ne garantit de l'utiliser ; il est
 * généré depuis les mêmes données que le sitemap, donc jamais en retard sur le catalogue.
 */
const llmsTxt = ({ organismes, prep, accessPolicy }) => `# Fatafalta

> ${SITE_DESCRIPTION}

Site en français, pour les candidats de Côte d’Ivoire. ${accessPolicyText(accessPolicy)} Les programmes de préparation citent leurs sources officielles (brochures, arrêtés).

## Catalogue des anciens sujets

- [Tous les organismes](${absoluteUrl(CATALOG_ROOT)}): organismes, concours et examens couverts
${organismes.map((organisme) => `- [${organismeLabel(organisme)}](${absoluteUrl(catalogPath([segmentFor(organisme, organismes)]))}): ${plural(organisme.documents.length, 'sujet')} publié${organisme.documents.length > 1 ? 's' : ''}`).join('\n')}
${prep?.programmes?.length ? `
## Préparation aux concours

- [Tous les programmes](${absoluteUrl(PREP_ROOT)}): cours, exercices corrigés, concours blancs
${prep.programmes.map(({ programme }) => `- [${programme.organisme?.sigle || ''} · ${programme.titre}](${absoluteUrl(programmePath(programme.code))}): épreuves, coefficients, programme et sources`).join('\n')}
` : ''}
## Optional

- [Abonnement](${absoluteUrl('/abonnement')}): accès au téléchargement des sujets et corrigés
- [Plan du site](${absoluteUrl('/sitemap.xml')})
`;

/*
 * Service worker : sa version reprend l'empreinte du build. Chaque déploiement change donc sw.js, ce
 * qui suffit au navigateur pour proposer (ou imposer) la nouvelle version, même dans la PWA ouverte.
 */
const stampServiceWorker = async () => {
  const swPath = path.join(BUILD_DIR, 'sw.js');
  let sw;
  try { sw = await readFile(swPath, 'utf8'); } catch (error) { return; }
  const manifest = await readFile(path.join(BUILD_DIR, 'asset-manifest.json'), 'utf8').catch(() => String(Date.now()));
  const build = createHash('sha256').update(manifest).digest('hex').slice(0, 12);
  const stamped = sw.replace(/const VERSION = '[^']*';/, `const VERSION = 'fatafalta-${build}';`);
  if (stamped === sw && !sw.includes(`fatafalta-${build}`)) throw new Error('sw.js : constante VERSION introuvable.');
  await writeFile(swPath, stamped);
};

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

  // Préparation chargée d'abord : l'accueil la présente aussi.
  const prep = await loadPrep();
  if (!prep && feed && process.env.PRERENDER_ALLOW_OFFLINE !== 'true' && !process.env.PRERENDER_FEED_FILE) {
    throw new Error('Préparation injoignable (/api/prep/catalogue). PRERENDER_ALLOW_OFFLINE=true pour publier sans ses pages.');
  }

  // Exhaustivité : chaque programme publié annoncé par le catalogue a sa page, sinon aucun déploiement.
  if (prep) {
    const announced = prep.catalogue.flatMap((organisme) => (organisme.cycles || []).filter((cycle) => cycle.publie !== false).map((cycle) => cycle.programme));
    const rendered = new Set(prep.programmes.map((data) => data.programme?.code));
    const missing = announced.filter((code) => !rendered.has(code));
    if (missing.length) throw new Error(`Préparation incomplète : ${missing.join(', ')} sans données. Aucune page publiée.`);
  }

  const home = { ...PAGES_SEO.home };
  await writePage('/', pageFromTemplate(template, { seo: home, body: homeHtml(organismes, prep), extraHead: verificationTags() }));
  sitemap.push({ path: '/', lastmod: feed?.updatedAt, category: 'pages' });

  await writePage('/abonnement', pageFromTemplate(template, {
    seo: PAGES_SEO.subscribe,
    body: simplePageHtml('Préparez vos concours avec tous les sujets.', PAGES_SEO.subscribe.description, { path: '/sujets', label: 'Parcourir les sujets' }),
  }));
  sitemap.push({ path: '/abonnement', category: 'pages' });

  await writePage('/informations-legales', pageFromTemplate(template, { seo: LEGAL_HUB_SEO, body: legalHubHtml() }));
  sitemap.push({ path: '/informations-legales', category: 'pages' });
  for (const doc of LEGAL_DOCUMENTS) {
    await writePage(`/${doc.slug}`, pageFromTemplate(template, { seo: legalSeo(doc), body: legalPageHtml(doc) }));
    sitemap.push({ path: `/${doc.slug}`, category: 'pages' });
  }

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
  sitemap.push({ path: CATALOG_ROOT, lastmod: feed?.updatedAt, category: 'pages' });

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
      sitemap.push({ path: page.path, lastmod: page.lastmod, category: 'concours', inSitemap: page.inSitemap !== false });
      catalogPages += 1;
    }
    for (const document of organisme.documents) {
      const context = documentContexts.get(document._id);
      await writePage(documentPath(document._id), pageFromTemplate(template, {
        seo: documentSeo(document, context),
        body: documentPageHtml(document, context, levels, feed?.accessPolicy),
      }));
      sitemap.push({ path: documentPath(document._id), lastmod: document.updatedAt || document.dateAjout, category: 'sujets' });
      documentPages += 1;
    }
  }

  // Préparation : accueil et page publique de chaque programme.
  if (prep?.catalogue?.length) {
    await writePage(PREP_ROOT, pageFromTemplate(template, { seo: prepHomeSeo(prep.catalogue), body: prepHomeHtml(prep.catalogue) }));
    sitemap.push({ path: PREP_ROOT, category: 'preparations' });
    for (const data of prep.programmes) {
      await writePage(programmePath(data.programme.code), pageFromTemplate(template, { seo: programmeSeo(data), body: programmeHtml(data) }));
      sitemap.push({ path: programmePath(data.programme.code), lastmod: data.programme.updatedAt || null, category: 'preparations' });
    }
  }
  const prepRendered = Boolean(prep?.catalogue?.length);
  await writeFile(path.join(BUILD_DIR, '_redirects'), redirectsFile({ prepRendered }));
  await writeFile(path.join(BUILD_DIR, '_headers'), headersFile());

  const unique = [...new Map(sitemap.map((entry) => [entry.path, entry])).values()];
  // Manifeste « incomplet » (catalogue ou préparation absents) : le backend n'en déduit aucune suppression.
  const sitemaps = await writeSitemapsAndManifest(unique, { complete: Boolean(feed) && prepRendered });
  await writeFile(path.join(BUILD_DIR, 'robots.txt'), robotsTxt());
  await writeFile(path.join(BUILD_DIR, 'llms.txt'), llmsTxt({ organismes, prep, accessPolicy: feed?.accessPolicy }));

  await stampServiceWorker();

  const indexNowKey = process.env.INDEXNOW_KEY;
  if (indexNowKey) {
    if (!/^[a-zA-Z0-9-]{8,128}$/.test(indexNowKey)) throw new Error('INDEXNOW_KEY invalide (8 à 128 caractères : lettres, chiffres, tirets).');
    await writeFile(path.join(BUILD_DIR, `${indexNowKey}.txt`), indexNowKey);
  }

  console.log(`[prerender] ${SITE_URL} : ${organismes.length} organisme(s), ${catalogPages} page(s) de catalogue, ${documentPages} fiche(s), ${prepRendered ? `${prep.programmes.length} programme(s) de préparation` : 'préparation non pré-rendue'}, ${sitemaps.count} adresse(s) dans ${sitemaps.files.length} sitemap(s)${sitemaps.previous ? '' : ' (lastmod : dates des données seules)'}.${feed ? '' : ' (hors ligne : pages fixes uniquement)'}`);
};

main().catch((error) => {
  console.error(`[prerender] ${error.message}`);
  process.exitCode = 1;
});
