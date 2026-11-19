/*
 * Métadonnées des pages (titre, description, canonique, Open Graph, données structurées).
 *
 * Module partagé : le site les applique au <head> à chaque navigation (useSeo), et le script de
 * pré-rendu (scripts/prerender.mjs) les écrit dans les pages HTML statiques servies aux robots.
 * Les deux produisent donc exactement les mêmes balises. Imports avec extension : ce fichier est
 * aussi chargé directement par Node.
 */
export const SITE_NAME = 'Fatafalta';
export const SITE_URL = (process.env.REACT_APP_SITE_URL || 'https://fatafalta.com').replace(/\/+$/, '');
export const NOINDEX = 'noindex, follow';
export const SHARE_IMAGE = { path: '/og/fatafalta-v1.jpg', width: 1200, height: 630, alt: 'Fatafalta : anciens sujets de concours et préparation, Côte d’Ivoire' };

export const absoluteUrl = (path = '/') => `${SITE_URL}${path === '/' ? '/' : path}`;

/** Titre complet : « Page | Fatafalta », sans répéter le nom du site. */
export const fullTitle = (title) => (!title || title.includes(SITE_NAME) ? title || SITE_NAME : `${title} | ${SITE_NAME}`);

/** Description utilisable dans un extrait : espaces normalisés, coupée proprement vers 160 caractères. */
export const clampDescription = (text = '', max = 160) => {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : cut.length).replace(/[\s,;:.–—-]+$/, '')}…`;
};

/*
 * Identité de Fatafalta pour les moteurs de recherche et de réponse : une seule entité, identifiée par
 * des @id stables et citée comme éditeur ou fournisseur par les autres données structurées.
 * Uniquement des faits vérifiables (ce que fait le site, son pays, sa langue) ; aucune note ni avis.
 */
export const ORGANIZATION_ID = `${SITE_URL}/#organisation`;
export const WEBSITE_ID = `${SITE_URL}/#site`;
export const SITE_DESCRIPTION = 'Fatafalta réunit les anciens sujets de concours et d’examens de Côte d’Ivoire, classés par organisme, année et matière, avec leurs corrigés quand ils sont publiés, et une préparation guidée aux concours (cours, exercices corrigés, concours blancs).';

export const organizationJsonLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  '@id': ORGANIZATION_ID,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: { '@type': 'ImageObject', url: `${SITE_URL}/icons/icon-512.png`, width: 512, height: 512 },
  description: SITE_DESCRIPTION,
  areaServed: { '@type': 'Country', name: 'Côte d’Ivoire' },
  knowsLanguage: 'fr',
  knowsAbout: ['Concours de la fonction publique ivoirienne', 'Concours des grandes écoles de Côte d’Ivoire', 'Anciens sujets de concours', 'Corrigés de concours', 'Préparation aux concours'],
});

export const websiteJsonLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  inLanguage: 'fr',
  description: SITE_DESCRIPTION,
  publisher: { '@id': ORGANIZATION_ID },
});

/** Référence à l'éditeur, pour les autres données structurées. */
export const publisherRef = () => ({ '@id': ORGANIZATION_ID });

/** Fil d'Ariane schema.org à partir de [{ label, path }] (le dernier élément est la page elle-même). */
export const breadcrumbJsonLd = (crumbs) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map(({ label, path }, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: label,
    item: absoluteUrl(path),
  })),
});

/**
 * Balises du <head> d'une page.
 * @param {{ title: string, description?: string, path?: string, robots?: string, jsonLd?: object|object[], type?: string }} seo
 *   `path` : adresse canonique ; absente (ou robots noindex), aucune balise canonique n'est émise.
 */
export const headTags = ({ title, description, path, robots, jsonLd, type = 'website' }) => {
  const indexable = !robots || !robots.includes('noindex');
  const canonical = indexable && path ? absoluteUrl(path) : null;
  const text = description ? clampDescription(description) : '';
  const tags = [];
  if (text) tags.push({ tag: 'meta', attrs: { name: 'description', content: text } });
  if (robots) tags.push({ tag: 'meta', attrs: { name: 'robots', content: robots } });
  if (canonical) tags.push({ tag: 'link', attrs: { rel: 'canonical', href: canonical } });
  tags.push(
    { tag: 'meta', attrs: { property: 'og:site_name', content: SITE_NAME } },
    { tag: 'meta', attrs: { property: 'og:locale', content: 'fr_FR' } },
    { tag: 'meta', attrs: { property: 'og:type', content: type } },
    { tag: 'meta', attrs: { property: 'og:title', content: title } },
  );
  if (text) tags.push({ tag: 'meta', attrs: { property: 'og:description', content: text } });
  if (canonical) tags.push({ tag: 'meta', attrs: { property: 'og:url', content: canonical } });
  // Image de partage commune (WhatsApp, Facebook, X…) : 1200 × 630, nom versionné.
  tags.push(
    { tag: 'meta', attrs: { property: 'og:image', content: `${SITE_URL}${SHARE_IMAGE.path}` } },
    { tag: 'meta', attrs: { property: 'og:image:width', content: String(SHARE_IMAGE.width) } },
    { tag: 'meta', attrs: { property: 'og:image:height', content: String(SHARE_IMAGE.height) } },
    { tag: 'meta', attrs: { property: 'og:image:alt', content: SHARE_IMAGE.alt } },
    { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
  );
  [].concat(jsonLd || []).filter(Boolean).forEach((data) => {
    tags.push({ tag: 'script', attrs: { type: 'application/ld+json' }, text: JSON.stringify(data) });
  });
  return { title: fullTitle(title), tags };
};

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** Sérialisation HTML (pré-rendu). Le JSON-LD est protégé contre une fermeture de balise. */
export const renderHead = (seo) => {
  const { title, tags } = headTags(seo);
  const html = tags.map(({ tag, attrs, text }) => {
    const attributes = Object.entries({ ...attrs, 'data-seo': '' })
      .map(([name, value]) => (value === '' ? name : `${name}="${escapeHtml(value)}"`))
      .join(' ');
    if (tag === 'script') return `<script ${attributes}>${text.replace(/</g, '\\u003c')}</script>`;
    return `<${tag} ${attributes}>`;
  });
  return `<title>${escapeHtml(title)}</title>${html.join('')}`;
};

/** Application au document courant (navigation dans le site). */
export const applyHead = (seo) => {
  if (typeof document === 'undefined') return;
  const { title, tags } = headTags(seo);
  document.title = title;
  document.head.querySelectorAll('[data-seo]').forEach((node) => node.remove());
  tags.forEach(({ tag, attrs, text }) => {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([name, value]) => node.setAttribute(name, value));
    node.setAttribute('data-seo', '');
    if (text) node.textContent = text;
    document.head.appendChild(node);
  });
};
