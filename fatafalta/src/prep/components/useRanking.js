import { useCallback, useEffect, useRef, useState } from 'react';
import prepApi, { isServiceMissing } from '../api';

export const EMPTY_CANDIDATES = [];
export const candidateRank = (candidate) => candidate?.rang ?? candidate?.rangApprox ?? null;

// Les rangs et les curseurs sont ceux du serveur, y compris pour les ex æquo.
export const uniqueCandidates = (rows = []) => {
  const seen = new Set();
  return rows.filter((row) => {
    if (!row?.identite || seen.has(row.identite)) return false;
    seen.add(row.identite);
    return true;
  });
};
export const mergeRankingPage = (current, page, direction) => ({
  ...page,
  candidats: uniqueCandidates(direction === 'before'
    ? [...(page.candidats || []), ...(current.candidats || [])]
    : [...(current.candidats || []), ...(page.candidats || [])]),
  precedent: direction === 'before' ? page.precedent : current.precedent,
  suivant: direction === 'after' ? page.suivant : current.suivant,
});
export const rankingError = (error) => isServiceMissing(error) ? 'missing' : error?.message === 'offline' ? 'network' : error || {};

/** Une instance par programme/période. Les remplacements invalident aussi les pages en vol. */
export const useRanking = (programme, periode) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [paging, setPaging] = useState(null);
  const [pageError, setPageError] = useState(null);
  const [located, setLocated] = useState(0);
  const [revision, setRevision] = useState(0);
  const current = useRef(null);
  const request = useRef(null);
  const epoch = useRef(0);
  const around = useRef(false);

  const load = useCallback(async ({ locate = false, refresh = false } = {}) => {
    const version = ++epoch.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    around.current = locate;
    setLoading(true);
    setRefreshing(refresh);
    setPaging(null);
    setPageError(null);
    setError(null);
    try {
      const result = await prepApi.ranking(programme, periode, { ...(locate ? { autour: 'moi' } : {}), signal: controller.signal });
      if (controller.signal.aborted || version !== epoch.current) return;
      if (!result) throw new Error('Classement vide');
      const next = { ...result, candidats: uniqueCandidates(result.candidats) };
      current.current = next;
      setData(next);
      setRevision((r) => r + 1);
      if (locate) setLocated((n) => n + 1);
    } catch (err) {
      if (!controller.signal.aborted && version === epoch.current) setError(rankingError(err));
    } finally {
      if (version === epoch.current) {
        request.current = null;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [programme, periode]);

  const loadPage = useCallback(async (direction) => {
    const previous = current.current;
    const cursor = direction === 'before' ? previous?.precedent : previous?.suivant;
    // Verrou synchrone : deux onEndReached dans la même frame ne lancent qu'une requête.
    if (!cursor || request.current) return;
    const version = epoch.current;
    const controller = new AbortController();
    request.current = controller;
    setPaging(direction);
    setPageError(null);
    try {
      const page = await prepApi.ranking(programme, periode, {
        [direction === 'before' ? 'avant' : 'apres']: cursor, signal: controller.signal,
      });
      if (controller.signal.aborted || version !== epoch.current) return;
      if (!page) throw new Error('Page vide');
      const next = mergeRankingPage(previous, page, direction);
      // Défense contre un ancien serveur/proxy qui répète son propre curseur.
      const edge = direction === 'before' ? 'precedent' : 'suivant';
      if (next[edge] === cursor) next[edge] = null;
      current.current = next;
      setData(next);
    } catch (err) {
      if (!controller.signal.aborted && version === epoch.current) setPageError(direction);
    } finally {
      if (version === epoch.current) { request.current = null; setPaging(null); }
    }
  }, [programme, periode]);

  // Chargement à l'ouverture et au changement de période seulement : revenir d'un profil conserve
  // les pages déjà chargées et la position de défilement (le pull-to-refresh recharge à la demande).
  useEffect(() => {
    load({ locate: around.current });
    return () => { epoch.current += 1; request.current?.abort(); request.current = null; };
  }, [load]);

  return { data, loading, refreshing, error, paging, pageError, located, revision, load, loadPage };
};

/** Recherche indépendante de la liste : debounce, abort et garde contre un transport tardif. */
export const useCandidateSearch = (programme, periode, query) => {
  const [result, setResult] = useState(null);
  const [revision, setRevision] = useState(0);
  const q = query.trim();
  const valid = [...q].length >= 2;
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    if (!valid) return () => controller.abort();
    const timer = setTimeout(async () => {
      try {
        const out = await prepApi.searchCandidates(programme, q, periode, controller.signal);
        if (!out) throw new Error('Recherche vide');
        if (!controller.signal.aborted) setResult({ q, candidates: uniqueCandidates(out.candidats) });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ q, error: rankingError(error) });
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [q, valid, programme, periode, revision]);
  // Même avant l'effet, aucune ancienne réponse sous une nouvelle saisie.
  return { valid, current: result?.q === q ? result : null, retry: () => setRevision((n) => n + 1) };
};
