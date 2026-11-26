// Complément : page d'un sujet (organisme → parcours → année → document), production, lecture seule.
import { chromium } from 'playwright';
const OUT = new URL('../public/captures/web/', import.meta.url).pathname;
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2, locale: 'fr-FR' });
const p = await ctx.newPage();
const hrefs = () => p.$$eval('a', as => as.map(a => a.getAttribute('href')).filter(Boolean));
await p.goto('https://fatafalta.com/sujets/ensea', { waitUntil: 'networkidle' });
let path = (await hrefs()).find(h => /\/sujets\/ensea\/.*cycle-long/i.test(h)) || (await hrefs()).find(h => h.startsWith('/sujets/ensea/'));
for (let depth = 0; depth < 4; depth++) {
  await p.goto('https://fatafalta.com' + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const hs = await hrefs();
  const doc = hs.find(h => h.includes('/sujets/document/'));
  if (doc) { await p.screenshot({ path: OUT + 'annee.png' }); path = doc; break; }
  path = hs.filter(h => h.startsWith(path + '/')).pop() || hs.find(h => h.startsWith(path + '/'));
  if (!path) break;
}
console.log('doc', path);
await p.goto('https://fatafalta.com' + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
await p.screenshot({ path: OUT + 'document.png' });
await b.close();
