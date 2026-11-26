// Capture des vraies interfaces Fatafalta (web) pour la publicité.
// Pages publiques : site de production (lecture seule, sans compte).
// Espace de préparation (compte requis) : environnement de test local (site :3001, API :5001,
// base fatafalta-test-web) — aucune écriture en production.
import { chromium } from 'playwright';
const OUT = new URL('../public/captures/web/', import.meta.url).pathname;
const PROD = 'https://fatafalta.com';
const LOCAL = process.env.LOCAL_URL || 'http://localhost:3001';
const b = await chromium.launch({ channel: 'chrome' });
const shot = async (p, name, opts = {}) => { await p.waitForTimeout(1200); await p.screenshot({ path: OUT + name + '.png', ...opts }); console.log('ok', name); };
const hideNoise = (p) => p.addStyleTag({ content: '[data-pwa-helper],[aria-live]{display:none!important} *{caret-color:transparent!important}' }).catch(() => {});

// --- Public (production) ---
{
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2, locale: 'fr-FR' });
  const p = await ctx.newPage();
  await p.goto(PROD, { waitUntil: 'networkidle' }); await hideNoise(p);
  await shot(p, 'home-hero');
  await shot(p, 'home-full', { fullPage: true });
  await p.goto(PROD + '/sujets', { waitUntil: 'networkidle' }); await shot(p, 'sujets');
  await shot(p, 'sujets-full', { fullPage: true });
  for (const org of ['ensea', 'cafop', 'bac', 'infj']) {
    await p.goto(`${PROD}/sujets/${org}`, { waitUntil: 'networkidle' }); await shot(p, 'org-' + org);
  }
  await p.goto(`${PROD}/sujets/ensea`, { waitUntil: 'networkidle' });
  let doc = await p.$$eval('a', as => as.map(a => a.getAttribute('href')).find(h => h && h.includes('/sujets/document/')));
  if (!doc) { // descendre d'un niveau (concours / année)
    const sub = await p.$$eval('a', as => as.map(a => a.getAttribute('href')).filter(h => h && h.startsWith('/sujets/ensea/')));
    for (const s of sub.slice(0, 4)) { await p.goto(PROD + s, { waitUntil: 'networkidle' }); await shot(p, 'org-ensea-' + sub.indexOf(s));
      doc = await p.$$eval('a', as => as.map(a => a.getAttribute('href')).find(h => h && h.includes('/sujets/document/'))); if (doc) break; }
  }
  if (doc) { await p.goto(PROD + doc, { waitUntil: 'networkidle' }); await shot(p, 'document'); await shot(p, 'document-full', { fullPage: true }); console.log('doc', doc); }
  await p.goto(PROD + '/preparation', { waitUntil: 'networkidle' }); await shot(p, 'prep-landing');
  await p.goto(PROD + '/recherche?q=math%C3%A9matiques', { waitUntil: 'networkidle' }); await shot(p, 'recherche');
  await ctx.close();
}

// --- Espace de préparation (local, compte de test local) ---
{
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2, locale: 'fr-FR' });
  await ctx.route(/onrender\.com|fatafalta\.com/, r => r.abort());
  const p = await ctx.newPage();
  await p.goto(LOCAL + '/login', { waitUntil: 'networkidle' });
  await p.fill('input[type=email]', 'eleve.test.web@example.com');
  await p.fill('input[type=password]', 'TestWeb2026!');
  await p.keyboard.press('Enter'); await p.waitForTimeout(3000);
  const P = LOCAL + '/preparation/ENSEA-AS';
  const go = async (u, n, o) => { await p.goto(u, { waitUntil: 'networkidle' }); await hideNoise(p); await shot(p, n, o); };
  await go(P, 'prep-plan');
  await go(P + '?vue=programme', 'prep-programme');
  await go(P + '?vue=progres', 'prep-progres');
  await go(P + '/MATH-LNEXP/lecon/MATH-LNEXP-L7', 'lecon');
  await shot(p, 'lecon-full', { fullPage: true });
  await go(P + '/MATH-LNEXP/niveau/1', 'exercice');
  // répondre à la première question pour montrer la correction immédiate
  const opt = await p.$('main button:has-text(" "), main [role=radio]');
  await go(P + '/concours-blanc', 'concours-blanc-intro');
  const start = await p.$('button:has-text("Commencer"), button:has-text("Lancer"), button:has-text("Démarrer")');
  if (start) { await start.click(); await p.waitForTimeout(2500); await shot(p, 'concours-blanc'); }
  await go(P + '/classement', 'classement');
  await go(P + '/revisions', 'revisions');
  await go(P + '/test-de-niveau', 'test-de-niveau');
  await ctx.close();
}
await b.close();
