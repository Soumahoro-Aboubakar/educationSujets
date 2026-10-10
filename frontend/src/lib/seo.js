/*
 * Métadonnées des pages (titre, description, canonique, Open Graph, données structurées).
 *
 * Module partagé : le site les applique au <head> à chaque navigation (useSeo), et le script de
 * pré-rendu (scripts/prerender.mjs) les écrit dans les pages HTML statiques servies aux robots.
 * Les deux produisent donc exactement les mêmes balises. Imports avec extension : ce fichier est
 * aussi chargé directement par Node.
 */
export const SITE_NAME = 'Fatafalta';
export const SITE_URL = (process.env.REACT_APP_SITE_URL || 'https://fatafalta.onrender.com').replace(/\/+$/, '');
export const NOINDEX = 'noindex, follow';

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
  tags.push({ tag: 'meta', attrs: { name: 'twitter:card', content: 'summary' } });
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
