import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BookOpen, Compass, CornerDownLeft, GraduationCap, Layers3, Repeat2, Search, Timer, Trophy } from 'lucide-react';
import { cx } from '../../components/ui';

/*
 * Palette de recherche de la préparation (loupe de l'en-tête, « / », Ctrl/⌘ + K).
 * Elle cherche ce que montre la page : les concours sur /preparation ; les modules, les leçons
 * et les actions dans un programme. Clavier : ↑ ↓ pour choisir, Entrée pour ouvrir, Échap.
 */
const normalize = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const ICONS = { concours: GraduationCap, module: Layers3, lecon: BookOpen, revision: Repeat2, blanc: Timer, test: Compass, classement: Trophy };

/** Entrées de recherche d'un programme : modules, leçons et actions. */
export const programmeEntries = (data) => {
  const code = data?.programme?.code;
  if (!code) return [];
  const out = [
    { id: 'a-rev', kind: 'revision', title: 'Révisions et cahier d’erreurs', meta: 'Action', to: `/preparation/${code}/revisions` },
    { id: 'a-blanc', kind: 'blanc', title: 'Concours blanc', meta: 'Action', to: `/preparation/${code}/concours-blanc` },
    { id: 'a-test', kind: 'test', title: 'Test de niveau', meta: 'Action', to: `/preparation/${code}/test-de-niveau` },
    { id: 'a-classement', kind: 'classement', title: 'Classement', meta: 'Action', to: `/preparation/${code}/classement` },
  ];
  const seen = new Set();
  (data.programme.matieres || []).forEach((m) => (m.modules || []).forEach((ref) => {
    const mod = data.modules?.[ref.code];
    if (!mod || seen.has(ref.code)) return;
    seen.add(ref.code);
    out.push({ id: `m-${ref.code}`, kind: 'module', title: mod.titre, meta: `${m.nom} · ${mod.lecons.length} leçons`, to: `/preparation/${code}?vue=programme#module-${ref.code}` });
    mod.lecons.forEach((l, i) => out.push({ id: `l-${l.code}`, kind: 'lecon', title: l.titre, meta: `${mod.titre} · leçon ${i + 1}${l.video ? ' · vidéo' : ''}`, to: `/preparation/${code}/${ref.code}/lecon/${l.code}` }));
  }));
  return out;
};

/** Entrées de recherche du catalogue : un concours par programme. */
export const catalogueEntries = (catalogue) => (catalogue || []).flatMap((org) => org.cycles.map((c) => ({
  id: `c-${c.programme}`, kind: 'concours', title: c.nom, meta: `${org.sigle || org.nom} · ${c.modulesPublies} module${c.modulesPublies > 1 ? 's' : ''}`, to: `/preparation/${c.programme}`, keywords: `${org.nom} ${org.sigle}`,
})));

const PrepSearch = ({ open, onClose, entries, placeholder }) => {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef(null);
  const list = useRef(null);

  useEffect(() => { if (open) { setQ(''); setActive(0); requestAnimationFrame(() => input.current?.focus()); } }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  const results = useMemo(() => {
    const words = normalize(q).split(/\s+/).filter(Boolean);
    const scored = entries.map((e) => {
      const hay = normalize(`${e.title} ${e.meta} ${e.keywords || ''}`);
      if (words.some((w) => !hay.includes(w))) return null;
      const title = normalize(e.title);
      const score = words.reduce((a, w) => a + (title.startsWith(w) ? 3 : title.includes(w) ? 2 : 1), 0) + (e.kind === 'module' || e.kind === 'concours' ? 0.5 : 0);
      return { ...e, score };
    }).filter(Boolean);
    return (words.length ? scored.sort((a, b) => b.score - a.score) : scored).slice(0, 40);
  }, [entries, q]);

  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => { list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active]);

  const go = (entry) => { if (!entry) return; onClose(); navigate(entry.to); };
  const onKey = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (event.key === 'Enter') { event.preventDefault(); go(results[active]); }
  };

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div key="palette" className="fixed inset-0 z-[70] flex items-start justify-center px-3 pt-[max(12px,env(safe-area-inset-top))] sm:pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
          <button type="button" aria-label="Fermer la recherche" className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={placeholder}
            className="relative flex max-h-[min(640px,80vh)] w-full max-w-[640px] flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-lift"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-3 border-b border-line px-5">
              <Search size={18} className="shrink-0 text-ink-muted" />
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder={`${placeholder}…`}
                aria-label={placeholder}
                aria-controls="prep-search-results"
                aria-activedescendant={results[active] ? `res-${results[active].id}` : undefined}
                className="h-16 min-w-0 flex-1 bg-transparent text-[17px] text-ink outline-none placeholder:text-ink-muted"
                enterKeyHint="go"
              />
              <kbd className="hidden rounded-md border border-line bg-paper px-1.5 py-0.5 text-[11px] font-semibold text-ink-soft sm:block">Échap</kbd>
            </div>
            <ul id="prep-search-results" ref={list} role="listbox" className="overflow-y-auto p-2">
              {results.length ? results.map((e, i) => {
                const Icon = ICONS[e.kind] || Search;
                return (
                  <li key={e.id} id={`res-${e.id}`} role="option" aria-selected={i === active} data-index={i}>
                    <button
                      type="button"
                      onMouseMove={() => setActive(i)}
                      onClick={() => go(e)}
                      className={cx('flex w-full items-center gap-3.5 rounded-2xl px-3 py-2.5 text-left transition-colors', i === active ? 'bg-paper' : '')}
                    >
                      <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', i === active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink')}><Icon size={16} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-ink">{e.title}</span>
                        <span className="block truncate text-[13px] text-ink-soft">{e.meta}</span>
                      </span>
                      {i === active ? <CornerDownLeft size={15} className="shrink-0 text-ink-muted" aria-hidden /> : null}
                    </button>
                  </li>
                );
              }) : (
                <li className="px-4 py-10 text-center">
                  <p className="text-[15px] font-semibold text-ink">Aucun résultat</p>
                  <p className="mt-1 text-[13px] text-ink-soft">Essaie un autre mot : un titre de leçon, une matière, un sigle.</p>
                </li>
              )}
            </ul>
            <div className="hidden items-center gap-4 border-t border-line px-5 py-2.5 text-[12px] text-ink-muted sm:flex">
              <span><kbd className="font-sans font-semibold text-ink-soft">↑ ↓</kbd> choisir</span>
              <span><kbd className="font-sans font-semibold text-ink-soft">Entrée</kbd> ouvrir</span>
              <span className="ml-auto tabular-nums">{`${results.length} résultat${results.length > 1 ? 's' : ''}`}</span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export default PrepSearch;
