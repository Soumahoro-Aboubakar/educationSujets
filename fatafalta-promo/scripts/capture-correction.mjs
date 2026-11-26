// Exercice : bonne réponse choisie puis « Vérifier » → correction immédiate.
// Environnement de test local (site :3001, compte de test local), jamais la production.
// La session reprend sur une question tirée au hasard : on répond juste selon la question affichée.
import { chromium } from 'playwright';
const OUT = new URL('../public/captures/mobile/', import.meta.url).pathname;
// Réponses des exercices de niveau 1 du module MATH-LNEXP (clés du contenu publié).
const SOLVE = [
  { match: 'Complète les repères', selects: ['0', '1', 'ln 3 + ln 5'] },
  { match: 'Relie chaque écriture', selects: ['ln a + ln b', 'ln a − ln b', '3 ln a', '(ln a)/2'] },
  { match: 'dérivée en x = 3', button: '6' },
  { match: 'Simplifie (2³', button: '2' },
  { match: 'Distingue existence', vf: ['Faux', 'Vrai', 'Faux'] },
  { match: 'ln(e⁴) − ln(e²)', input: '2' },
];
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'fr-FR' });
await ctx.addInitScript(() => { try { localStorage.setItem('fatafalta.pwa.ios-guide', String(Date.now())); } catch (e) {} });
await ctx.route(/onrender\.com|fatafalta\.com/, r => r.abort());
const p = await ctx.newPage();
await p.goto('http://localhost:3001/login', { waitUntil: 'networkidle' });
await p.fill('input[type=email]', 'eleve.test.web@example.com'); await p.fill('input[type=password]', 'TestWeb2026!');
await p.keyboard.press('Enter'); await p.waitForTimeout(3000);
await p.goto('http://localhost:3001/preparation/ENSEA-AS/MATH-LNEXP/niveau/1', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
const text = await p.innerText('main');
const s = SOLVE.find((x) => text.includes(x.match));
if (!s) throw new Error('Question inconnue : ' + text.slice(0, 200));
console.log('question :', s.match);
if (s.selects) { const sel = await p.$$('main select'); for (let i = 0; i < sel.length; i++) await sel[i].selectOption({ label: s.selects[i] }); }
if (s.button) await p.locator('main').getByText(s.button, { exact: true }).first().click();
if (s.input) await p.fill('main input', s.input);
if (s.vf) { const groups = await p.$$('main li, main fieldset'); for (let i = 0; i < s.vf.length; i++) await (await groups[i].$(`button:text-is("${s.vf[i]}")`)).click(); }
await p.waitForTimeout(400);
await p.screenshot({ path: OUT + 'exercice-choix.png' });
await p.click('button:has-text("Vérifier")'); await p.waitForTimeout(2000);
await p.screenshot({ path: OUT + 'exercice-corrige.png' }); console.log('ok');
await b.close();
