// Écrans connectés de la préparation au format iPhone (390×844, ×3), environnement de test local.
import { chromium } from 'playwright';
const OUT = new URL('../public/captures/mobile/', import.meta.url).pathname;
const LOCAL = process.env.LOCAL_URL || 'http://localhost:3001';
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'fr-FR',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
await ctx.addInitScript(() => { try { localStorage.setItem('fatafalta.pwa.ios-guide', String(Date.now())); } catch (e) {} });
await ctx.route(/onrender\.com|fatafalta\.com/, r => r.abort());
const p = await ctx.newPage();
const shot = async (n, o = {}) => { await p.waitForTimeout(1500); await p.screenshot({ path: OUT + n + '.png', ...o }); console.log('ok', n); };
const hide = () => p.addStyleTag({ content: '*{caret-color:transparent!important}' });
await p.goto(LOCAL + '/login', { waitUntil: 'networkidle' });
await p.fill('input[type=email]', 'eleve.test.web@example.com');
await p.fill('input[type=password]', 'TestWeb2026!');
await p.keyboard.press('Enter'); await p.waitForTimeout(3000);
const P = LOCAL + '/preparation/ENSEA-AS';
const go = async (u, n, o) => { await p.goto(u, { waitUntil: 'networkidle' }); await hide(); await shot(n, o); };
await go(P, 'plan'); await shot('plan-full', { fullPage: true });
await go(P + '?vue=programme', 'programme');
await go(P + '?vue=progres', 'progres'); await shot('progres-full', { fullPage: true });
await go(P + '/classement', 'classement');
await go(P + '/MATH-LNEXP/lecon/MATH-LNEXP-L7', 'lecon');
// pleine page pour le défilement : barres fixes masquées (sinon figées au milieu de la capture)
const st = await p.addStyleTag({ content: '.fixed{display:none!important}' }); await shot('lecon-full', { fullPage: true }); await st.evaluate(n => n.remove());
const play = await p.$('button[aria-label*="vidéo" i], button:has(svg) >> nth=0');
const vbtn = await p.$('[class*="aspect-video"] button, button[aria-label*="Lire" i]');
if (vbtn) { await vbtn.click(); await p.waitForTimeout(5000); await shot('lecon-video'); }
await go(P + '/MATH-LNEXP/niveau/1', 'exercice');
await go(P + '/concours-blanc', 'concours-blanc-intro');
await go(LOCAL + '/sujets', 'sujets'); await shot('sujets-full', { fullPage: true });
await b.close();
