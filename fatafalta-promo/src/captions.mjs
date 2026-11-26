// Sous-titres : graphie affichée + ponctuation, calées sur les timings mot à mot de la voix.
// Partagé entre la vidéo (Captions.tsx) et l'export SRT (scripts/srt.mjs).
const FIX = { 'B.E.P.C.': 'BEPC', 'Cafop': 'CAFOP', "l'Infass": "l'INFAS", 'I.N.F.J.': 'INFJ', 'E.N.S.': 'ENS', 'Éna': 'ENA', 'I.N.P.H.B.': 'INPHB', 'Ésatic': 'ESATIC' };
const PUNCT = /^[?!:;.,…]+$/;
export function captionWords(voice) {
  // jetons prononcés → graphie affichée
  const spoken = [];
  for (let i = 0; i < voice.words.length; i++) {
    const w = voice.words[i];
    if (w.w === 'fatafalta' && voice.words[i + 1]?.w === 'point') { const end = voice.words[i + 2]; spoken.push({ w: 'fatafalta.com', start: w.start, end: end.end }); i += 2; continue; }
    spoken.push({ ...w, w: FIX[w.w] || w.w });
  }
  // jetons affichés (ponctuation rattachée au mot précédent)
  const disp = [];
  for (const tok of voice.text.split(/\s+/)) { if (PUNCT.test(tok) && disp.length) disp[disp.length - 1] += ' ' + tok; else disp.push(tok); }
  if (disp.length !== spoken.length) throw new Error(`Sous-titres scène ${voice.id} : ${disp.length} mots affichés / ${spoken.length} prononcés`);
  return spoken.map((s, i) => ({ ...s, w: disp[i] }));
}
/** Segments courts (≤ maxWords), coupés après une ponctuation forte ou une virgule. */
export function captionChunks(voice, maxWords = 6) {
  const words = captionWords(voice); const out = []; let cur = [];
  words.forEach((w, i) => {
    cur.push(w);
    let ahead = 0; for (let j = i + 1; j < words.length; j++) { ahead++; if (/[?!.:…,]$/.test(words[j].w)) break; }
    const brk = /[?!.:…]$/.test(w.w) || (/,$/.test(w.w) && cur.length >= 3) || (cur.length >= maxWords && ahead > 2) || cur.length >= maxWords + 3;
    if (brk || i === words.length - 1) { out.push({ words: cur, start: cur[0].start, end: cur[cur.length - 1].end }); cur = []; }
  });
  return out;
}
