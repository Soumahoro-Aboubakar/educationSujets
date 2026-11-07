const fs = require('fs');
const path = require('path');

/**
 * Journaux clairs, étape par étape, à l'écran ; chaque événement est aussi ajouté à
 * backend/.video-state/journal.jsonl (ignoré par git) pour garder une trace des publications.
 */
const createLog = ({ total = 7, stream = process.stdout, journal = null, quiet = false } = {}) => {
  const tty = stream.isTTY;
  const paint = (code, s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
  const write = (line) => { if (!quiet) stream.write(`${line}\n`); };
  const record = (event) => {
    if (!journal) return;
    try {
      fs.mkdirSync(path.dirname(journal), { recursive: true });
      fs.appendFileSync(journal, `${JSON.stringify({ date: new Date().toISOString(), ...event })}\n`);
    } catch (error) { /* le journal fichier est un plus, jamais bloquant */ }
  };
  const events = [];
  const push = (event) => { events.push(event); record(event); };
  return {
    events,
    etape: (n, titre, detail = '') => { write(`${paint('1;36', `[${n}/${total}]`)} ${paint('1', titre.padEnd(13))} ${detail}`); push({ type: 'etape', n, titre, detail }); },
    info: (detail) => { write(`              ${detail}`); push({ type: 'info', detail }); },
    ok: (detail) => { write(`${paint('32', '✓')} ${detail}`); push({ type: 'ok', detail }); },
    avert: (detail) => { write(`${paint('33', '⚠')} ${detail}`); push({ type: 'avertissement', detail }); },
    erreur: (detail) => { write(`${paint('31', '✗')} ${detail}`); push({ type: 'erreur', detail }); },
    progression: (fait, total) => {
      if (quiet || !tty) return;
      const pct = Math.floor((fait / total) * 100);
      stream.write(`\r              envoi ${String(pct).padStart(3)} % (${(fait / 1048576).toFixed(1)} / ${(total / 1048576).toFixed(1)} Mio)${fait >= total ? '\n' : ''}`);
    },
  };
};

module.exports = { createLog };
