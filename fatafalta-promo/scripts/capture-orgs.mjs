// Pages « anciens sujets » des principaux concours (production, lecture seule), ordinateur + mobile,
// et état « exercice corrigé » (local).
import { chromium } from 'playwright';
const OUT = new URL('../public/captures/orgs/', import.meta.url).pathname;
const ORGS = (process.env.ORGS || 'ena,inphb,esatic,infj,ensea,eamac,ens,cafop').split(',');
const b = await chromium.launch({ channel: 'chrome' });
const desk = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2, locale: 'fr-FR' });
const mob = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'fr-FR' });
for (const c of [desk, mob]) await c.addInitScript(() => { try { localStorage.setItem('fatafalta.pwa.ios-guide', String(Date.now())); } catch (e) {} });
const pd = await desk.newPage(), pm = await mob.newPage();
for (const o of ORGS) {
  const u = `https://fatafalta.com/sujets/${o}`;
  await pd.goto(u, { waitUntil: 'networkidle' }); await pd.waitForTimeout(1000);
  const head = (await pd.innerText('main').catch(() => '')).split('\n').filter(Boolean).slice(0, 4).join(' | ');
  console.log(o, '→', head.slice(0, 160));
  await pd.screenshot({ path: `${OUT}${o}-desk.png` });
  await pm.goto(u, { waitUntil: 'networkidle' }); await pm.waitForTimeout(1000);
  await pm.screenshot({ path: `${OUT}${o}-mob.png` });
}
await b.close();
