import { getUserMessage } from '../../utils/userMessages';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Keyboard, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, ChevronRight, EyeOff, Search, Trophy, UserPlus, X } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import { getProgramme } from '../content';
import usePrep, { useSummary } from '../store';
import prepApi from '../api';
import { brand, GRADIENTS, motion, PODIUM, subjectTint, theme, type } from '../theme';
import { haptic, useReduceMotion } from '../feedback';
import { Avatar, Badge, Card, CornerFold, PaperStack, PrepButton, PressScale, ProgressBar, SectionTitle } from '../ui/primitives';
import ART from '../ui/art';
import { candidateRank, EMPTY_CANDIDATES, rankingError, useCandidateSearch, useRanking } from './useRanking';

const nf = (n) => Number(n || 0).toLocaleString('fr-FR');
const value = (n) => n == null ? '—' : nf(n);
const pct = (n) => n == null ? '—' : `${Math.round(n * 100)} %`;
const rankLabel = (n) => n == null ? 'Rang indisponible' : `${nf(n)}${n === 1 ? 'ᵉʳ' : 'ᵉ'}`;
// « 1 question », « 0 erreur », « 3 erreurs » (règle française : pluriel à partir de 2).
const count = (n, word) => n == null ? `— ${word}s` : `${nf(n)} ${word}${n > 1 ? 's' : ''}`;
const scoreLabel = (n) => n == null ? '—' : nf(Math.round(n));
const PERIODS = [{ key: 'semaine', label: 'Semaine' }, { key: 'mois', label: 'Mois' }, { key: 'tout', label: 'Depuis le début' }];
const periodLabel = (period) => PERIODS.find((p) => p.key === period)?.label || 'Depuis le début';
const keyExtractor = (c) => c.identite;
const KEEP_POSITION = { minIndexForVisible: 1 };
const programmeLabel = (programme) => programme ? `${programme.organisme.sigle} · ${programme.titre}` : 'Préparation';

// Compatibilité avec les états « missing » et « network » du classement.
const rankingMessage = (error, context = 'classement') => {
  const source = error === 'missing' ? { response: { status: 404 } } : error === 'network' ? { code: 'ERR_NETWORK' } : error;
  const { title, message } = getUserMessage(source, context);
  return { title, detail: message };
};

const Loading = ({ label = 'Chargement…' }) => (
  <View style={s.loading} accessibilityRole="progressbar" accessibilityLabel={label}>
    <ActivityIndicator color={brand.burgundy} /><Text variant="caption" style={s.muted}>{label}</Text>
  </View>
);
const Message = ({ title, detail, retry }) => (
  <View style={s.message} accessibilityLiveRegion="polite">
    <Text variant="h3" align="center">{title}</Text>
    {detail ? <Text variant="body" style={s.muted} align="center">{detail}</Text> : null}
    {retry ? <PrepButton title="Réessayer" variant="secondary" onPress={retry} /> : null}
  </View>
);
const BackHeader = ({ navigation, title }) => (
  <View style={s.header}>
    <PressScale onPress={() => navigation.goBack()} style={s.back} accessibilityLabel="Retour">
      <ArrowLeft size={22} color={brand.onInk} />
    </PressScale>
    <Text variant="h2" style={[s.onInk, s.flex]} align="center" accessibilityRole="header">{title}</Text>
    <View style={{ width: 44 }} />
  </View>
);

const CandidateRow = memo(({ candidate: c, open, ownId, reduced }) => {
  const stats = c.stats || {};
  const own = c.moi || c.identite === ownId;
  const summary = [
    stats.questions != null && `${nf(stats.questions)} question${stats.questions > 1 ? 's' : ''}`,
    stats.reussies != null && `${nf(stats.reussies)} réussie${stats.reussies > 1 ? 's' : ''}`,
    stats.erreurs != null && `${nf(stats.erreurs)} erreur${stats.erreurs > 1 ? 's' : ''}`,
    stats.modulesValides != null && `${nf(stats.modulesValides)} module${stats.modulesValides > 1 ? 's' : ''}`,
    stats.serie > 0 && `${nf(stats.serie)} j de série`,
  ].filter(Boolean).join(' · ');
  return (
    <PressScale onPress={() => open(c)} scaleTo={reduced ? 1 : motion.press.scale}
      style={[s.candidate, own && s.candidateOwn]}
      accessibilityLabel={`${own ? 'Toi, ' : ''}${c.pseudonyme}, ${rankLabel(candidateRank(c))}, score ${scoreLabel(c.score)}, ${pct(stats.reussite)} de réussite. ${summary}`}
      accessibilityHint="Ouvrir les résultats du candidat">
      <View style={s.row}>
        <Avatar name={c.pseudonyme} tint={c.avatarTeinte} size={36} />
        <View style={s.flex}>
          <Text variant="bodyMedium" numberOfLines={1}>{own ? `Toi · ${c.pseudonyme}` : c.pseudonyme}</Text>
          <Text variant="caption" style={[s.rank, type.tabular]}>{rankLabel(candidateRank(c))}</Text>
        </View>
        <View style={s.score}>
          <Text style={[type.numeral, s.scoreNumber]}>{scoreLabel(c.score)}</Text>
          <Text variant="caption" style={s.muted}>score</Text>
        </View>
        <View style={s.chevron}><ChevronRight size={18} color={brand.burgundy} /></View>
      </View>
      <Text variant="caption" style={[s.muted, type.tabular]}>{`${pct(stats.reussite)} de réussite${summary ? ` · ${summary}` : ''}`}</Text>
    </PressScale>
  );
});

// Ni place fabriquée à partir de l'index, ni médaille de bronze pour un ex æquo en tête.
const podiumOf = (candidates) => {
  if (candidateRank(candidates[0]) !== 1 || candidates.length < 3) return null;
  const top = candidates.slice(0, 3);
  return top.some((c) => candidateRank(c) > 3 || candidateRank(c) == null) ? null : top;
};
const Podium = memo(({ candidates, open, reduced }) => {
  const top = podiumOf(candidates);
  if (!top) return null;
  return (
    <View style={s.podium}>
      {[top[1], top[0], top[2]].map((c) => {
        const rank = candidateRank(c);
        return (
          <PressScale key={c.identite} onPress={() => open(c)} scaleTo={reduced ? 1 : motion.press.scale}
            style={[s.podiumColumn, { paddingTop: rank === 1 ? 0 : 20 }]}
            accessibilityLabel={`${c.pseudonyme}, ${rankLabel(rank)}, score ${scoreLabel(c.score)}`}>
            <View style={s.laurel}>
              <Image source={ART.laurels[rank - 1]} style={StyleSheet.absoluteFill} resizeMode="contain" accessible={false} />
              <Avatar name={c.pseudonyme} tint={c.avatarTeinte} size={40} />
            </View>
            <Text variant="caption" numberOfLines={1} style={s.podiumName}>{c.pseudonyme}</Text>
            <Text variant="caption" style={[s.muted, type.tabular]}>{scoreLabel(c.score)} pts</Text>
            <View style={[s.podiumPaper, { minHeight: rank === 1 ? 62 : 44 }]}>
              <Text style={[type.numeral, s.podiumRank]}>{rankLabel(rank)}</Text>
              <CornerFold size={18} />
            </View>
          </PressScale>
        );
      })}
    </View>
  );
});

const FollowedCandidates = memo(({ programme, periode, revision, open }) => {
  const followed = usePrep((state) => state.candidatsSuivis?.[programme] || EMPTY_CANDIDATES);
  const remove = usePrep((state) => state.unfollowCandidate);
  const [profiles, setProfiles] = useState({});
  const [retry, setRetry] = useState(0);
  const reduced = useReduceMotion();
  useEffect(() => {
    const controller = new AbortController();
    setProfiles({});
    // Concurrence bornée, même si un parent suit beaucoup de candidats.
    let next = 0;
    const worker = async () => {
      while (next < followed.length && !controller.signal.aborted) {
        const c = followed[next++];
        try {
          const profile = await prepApi.candidate(programme, c.identite, periode, controller.signal);
          if (!profile) throw new Error('Profil vide');
          if (!controller.signal.aborted) setProfiles((prev) => ({ ...prev, [c.identite]: { profile } }));
        } catch (error) {
          if (!controller.signal.aborted) setProfiles((prev) => ({ ...prev, [c.identite]: { error: rankingError(error) } }));
        }
      }
    };
    Array.from({ length: Math.min(4, followed.length) }, () => worker());
    return () => controller.abort();
  }, [followed, programme, periode, revision, retry]);
  if (!followed.length) return null;
  return (
    <View style={s.followed}>
      <SectionTitle>Candidats suivis</SectionTitle>
      <Text variant="caption" style={s.muted}>Enregistrés sur cet appareil.</Text>
      <FlatList horizontal data={followed} keyExtractor={keyExtractor} showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.followedList} initialNumToRender={3}
        renderItem={({ item }) => {
          const entry = profiles[item.identite];
          return (
            <View style={s.followCard}>
              <PressScale onPress={() => open(entry?.profile || item)} scaleTo={reduced ? 1 : motion.press.scale}
                style={s.followOpen} accessibilityLabel={`Voir les résultats de ${item.pseudonyme}`}>
                <View style={s.between}><Text variant="bodyMedium" numberOfLines={1} style={s.flex}>{entry?.profile?.pseudonyme || item.pseudonyme}</Text><View style={s.chevron}><ChevronRight size={16} color={brand.burgundy} /></View></View>
                <Text variant="caption" style={[s.rank, type.tabular]}>{entry?.profile ? `${rankLabel(entry.profile.rang)} · ${scoreLabel(entry.profile.score)} pts` : entry?.error === 'missing' ? 'Profil indisponible. Consulte un autre candidat.' : entry?.error ? 'Rang indisponible. Réessaie un peu plus tard.' : 'Actualisation du rang…'}</Text>
              </PressScale>
              <PressScale onPress={() => { haptic.select(); remove(programme, item.identite); }} scaleTo={reduced ? 1 : motion.press.scale}
                style={s.remove} accessibilityLabel={`Ne plus suivre ${item.pseudonyme}`}>
                <X size={14} color={brand.burgundy} /><Text variant="caption" style={s.rank}>Retirer le suivi</Text>
              </PressScale>
            </View>
          );
        }} />
      {Object.values(profiles).some((entry) => entry.error) ? <PrepButton title="Réessayer" variant="link" onPress={() => setRetry((n) => n + 1)} /> : null}
    </View>
  );
});

const PinnedMe = memo(({ data, loading, error, locate, retry, reduced, bottom }) => {
  const mine = data?.moi;
  const stats = mine?.stats || {};
  return (
    <View style={{ paddingBottom: Math.max(bottom, 8) }}>
      <LinearGradient colors={GRADIENTS.paperVeil} style={s.veil} pointerEvents="none" />
      {mine ? (
        <PressScale onPress={locate} disabled={loading} scaleTo={reduced ? 1 : motion.press.scale} style={s.pinned}
          accessibilityLabel={`Toi, ${rankLabel(data.rang ?? mine.rang)} sur ${nf(data.total)}, score ${scoreLabel(mine.score)}, ${pct(stats.reussite)} de réussite, ${count(stats.questions, 'question')}${stats.reussies != null ? `, ${count(stats.reussies, 'réussie')}` : ''}, ${count(stats.erreurs, 'erreur')}. Me situer`}
          accessibilityHint="Charger les candidats autour de ton rang">
          <View style={s.between}>
            <Badge label="Toi" tone="burgundy" />
            <View style={s.row}>{loading ? <ActivityIndicator size="small" color={brand.burgundy} /> : null}<Text variant="caption" style={s.rank}>Me situer</Text><View style={s.chevron}><ChevronRight size={16} color={brand.burgundy} /></View></View>
          </View>
          <Text style={[type.numeral, s.pinnedRank]}>{rankLabel(data.rang ?? mine.rang)}<Text variant="body" style={s.muted}> sur {nf(data.total)}</Text></Text>
          <Text variant="caption" style={[s.muted, type.tabular]}>{`Score ${scoreLabel(mine.score)} · ${pct(stats.reussite)} de réussite · ${count(stats.questions, 'question')}${stats.reussies != null ? ` · ${count(stats.reussies, 'réussie')}` : ''} · ${count(stats.erreurs, 'erreur')}`}</Text>
          {mine.visible === false ? <View style={s.row}><EyeOff size={14} color={brand.inkSoft} /><Text variant="caption" style={[s.muted, s.flex]}>Ton rang reste privé. Les autres ne te voient pas.</Text></View> : null}
          {error ? <Text variant="caption" style={s.rank}>Rang précédent affiché. Réessaie pour l’actualiser.</Text> : null}
        </PressScale>
      ) : data ? (
        <View style={s.invitation}><Trophy size={20} color={brand.goldInk} /><Text variant="caption" style={[s.muted, s.flex]}>Réponds à ta première question pour entrer au classement.</Text></View>
      ) : loading ? <Loading label="Chargement de ton rang…" /> : <View style={s.invitation}><Text variant="caption" style={[s.muted, s.flex]}>Ton rang est momentanément indisponible. Réessaie dans quelques instants.</Text><PrepButton title="Réessayer" variant="link" onPress={retry} /></View>}
    </View>
  );
});

const SearchResults = memo(({ query, programme, periode, open, ownId, reduced }) => {
  const { valid, current, retry } = useCandidateSearch(programme, periode, query);
  const renderItem = useCallback(({ item }) => <CandidateRow candidate={item} open={open} ownId={ownId} reduced={reduced} />, [open, ownId, reduced]);
  return (
    <FlatList style={s.flex} data={valid ? current?.candidates || EMPTY_CANDIDATES : EMPTY_CANDIDATES}
      keyExtractor={keyExtractor} renderItem={renderItem} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      contentContainerStyle={s.listContent} initialNumToRender={8}
      refreshing={false} onRefresh={retry}
      ListHeaderComponent={<Text variant="caption" style={s.searchHelp}>Parent ? Retrouve ton enfant grâce à son pseudonyme, visible dans son profil. Saisis le début du pseudonyme ou son numéro, par exemple « 1172 ».</Text>}
      ListEmptyComponent={!valid ? <Message title="Quel candidat cherches-tu ?" detail="Saisis au moins 2 caractères." /> : !current ? <Loading label="Recherche des candidats…" /> : current.error ? (
        <Message {...rankingMessage(current.error, 'recherche')} retry={retry} />
      ) : <Message title="Aucun candidat trouvé" detail="Vérifie le pseudonyme ou essaie une autre période. Seuls les profils visibles sont recherchés." />}
      ListFooterComponent={current?.candidates?.length === 20 ? <Text variant="caption" style={s.searchHelp}>20 résultats affichés. Précise le pseudonyme pour affiner.</Text> : null} />
  );
});

const RankingContent = ({ navigation, programmeCode, periode, setPeriode }) => {
  const programme = getProgramme(programmeCode);
  const insets = useSafeAreaInsets();
  const reduced = useReduceMotion();
  const identity = usePrep((state) => state.identite);
  const ranking = useRanking(programmeCode, periode);
  const { data, loading, refreshing, error, paging, pageError, located, revision, load, loadPage } = ranking;
  const [query, setQuery] = useState('');
  const [locationNote, setLocationNote] = useState(null);
  const list = useRef(null);
  const scrollTarget = useRef(null);
  const retryTimer = useRef(null);
  const attempts = useRef(0);
  const headerHeight = useRef(0);
  const candidates = data?.candidats || EMPTY_CANDIDATES;
  // Les trois premiers sont sur le podium : la liste reprend au 4ᵉ, sans doublon.
  const podiumCount = podiumOf(candidates) ? 3 : 0;
  const listRows = useMemo(() => (podiumCount ? candidates.slice(podiumCount) : candidates), [candidates, podiumCount]);
  const ownId = data?.moi?.identite || identity?.id || identity?._id;
  const open = useCallback((candidate) => {
    haptic.select();
    navigation.navigate('PrepCandidate', { programme: programmeCode, identite: candidate.identite, periode, total: data?.total, moi: candidate.moi || candidate.identite === ownId });
  }, [navigation, programmeCode, periode, data?.total, ownId]);
  const renderItem = useCallback(({ item }) => <CandidateRow candidate={item} open={open} ownId={ownId} reduced={reduced} />, [open, ownId, reduced]);
  const tryScroll = useCallback(() => {
    if (scrollTarget.current == null || !list.current) return;
    list.current.scrollToIndex({ index: scrollTarget.current, viewPosition: 0.5, animated: !reduced });
  }, [reduced]);
  useEffect(() => {
    if (!located) return;
    if (!data?.moi) { setLocationNote(null); scrollTarget.current = null; return; }
    const rows = data?.candidats || [];
    let index = rows.findIndex((c) => c.moi || c.identite === data?.moi?.identite);
    if (index < 0 && rows.length) {
      index = rows.findIndex((c) => candidateRank(c) >= data?.rang);
      if (index < 0) index = rows.length - 1;
    }
    setLocationNote(rows.some((c) => c.moi || c.identite === data?.moi?.identite) ? 'Ta ligne est surlignée dans la liste.' : data?.moi?.visible === false ? 'Voici les candidats autour de ton rang privé.' : 'Voici les candidats autour de ton rang. Tu n’apparais pas dans cette période.');
    // Index dans la liste affichée (sans le podium) ; sur le podium, on remonte simplement en haut.
    const offset = podiumOf(rows) ? 3 : 0;
    if (index >= 0 && index < offset) { index = -1; list.current?.scrollToOffset({ offset: 0, animated: !reduced }); }
    else if (index >= 0) index -= offset;
    scrollTarget.current = index >= 0 ? index : null;
    attempts.current = 0;
    retryTimer.current = setTimeout(tryScroll, 100);
    return () => clearTimeout(retryTimer.current);
    // Seule une réponse à « Me situer » déclenche le déplacement, jamais une pagination.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [located, tryScroll]);
  useEffect(() => () => clearTimeout(retryTimer.current), []);
  const locate = useCallback(() => {
    Keyboard.dismiss(); setQuery(''); setLocationNote(null); haptic.select();
    load({ locate: true });
  }, [load]);
  const refresh = useCallback(() => {
    scrollTarget.current = null; setLocationNote(null);
    list.current?.scrollToOffset({ offset: 0, animated: false });
    load({ refresh: true });
  }, [load]);
  const listHeader = useMemo(() => (
    <View onLayout={(event) => { headerHeight.current = event.nativeEvent.layout.height; }}>
      <Text variant="caption" style={s.searchHelp}>Parent ? Recherche le pseudonyme de ton enfant, visible dans son profil.</Text>
      <FollowedCandidates programme={programmeCode} periode={periode} revision={revision} open={open} />
      {error ? <Message {...rankingMessage(error)} detail={`${data ? 'Les derniers résultats restent affichés. ' : ''}${rankingMessage(error).detail}`} retry={() => load()} /> : null}
      <Podium candidates={candidates} open={open} reduced={reduced} />
      <Text variant="caption" style={s.searchHelp}>Scores cumulés · la période filtre les participants actifs.</Text>
      <View style={s.listHeading}><SectionTitle right={data ? `${nf(data.total)} candidats` : undefined}>Les candidats</SectionTitle></View>
      {locationNote ? <Text variant="caption" style={s.searchHelp} accessibilityLiveRegion="polite">{locationNote}</Text> : null}
      {data?.precedent ? <View style={s.pageButton}><PrepButton title="Voir les mieux classés" variant="secondary" loading={paging === 'before'} disabled={loading || Boolean(paging)} onPress={() => loadPage('before')} /></View> : null}
      {pageError === 'before' ? <Message title="Chargement interrompu" detail="Les candidats précédents n’ont pas pu être chargés. Réessaie dans quelques instants." retry={() => loadPage('before')} /> : null}
    </View>
  ), [programmeCode, periode, revision, open, error, data, candidates, reduced, locationNote, paging, pageError, loading, load, loadPage]);
  return (
    <PaperStack header={<BackHeader navigation={navigation} title="Classement" />}>
      <View style={s.controls}>
        <Text variant="caption" style={s.muted}>{programmeLabel(programme)}</Text>
        <View style={s.periods} accessibilityRole="tablist">
          {PERIODS.map((p) => <PressScale key={p.key} accessibilityRole="tab" accessibilityState={{ selected: periode === p.key }}
            scaleTo={reduced ? 1 : motion.press.scale} onPress={() => { if (periode !== p.key) { haptic.select(); setPeriode(p.key); } }} style={[s.period, periode === p.key && s.periodOn]}>
            <Text variant="caption" style={periode === p.key ? s.onInk : s.muted}>{p.label}</Text>
          </PressScale>)}
        </View>
        <View style={s.search}>
          <Search size={20} color={brand.inkSoft} />
          <TextInput value={query} onChangeText={setQuery} maxLength={40} placeholder="Pseudonyme ou numéro" placeholderTextColor={brand.inkSoft}
            style={s.input} accessibilityLabel="Rechercher un candidat par pseudonyme ou numéro" autoCorrect={false} autoCapitalize="none" returnKeyType="search" onSubmitEditing={Keyboard.dismiss} selectionColor={brand.burgundy} />
          {query.length > 0 ? <PressScale onPress={() => setQuery('')} scaleTo={reduced ? 1 : motion.press.scale} style={s.clear} accessibilityLabel="Effacer la recherche"><X size={20} color={brand.burgundy} /></PressScale> : null}
        </View>
      </View>
      {query.length > 0 ? <SearchResults query={query} programme={programmeCode} periode={periode} open={open} ownId={ownId} reduced={reduced} /> : (
        <FlatList ref={list} style={s.flex} data={listRows} renderItem={renderItem} keyExtractor={keyExtractor}
          contentContainerStyle={s.listContent} initialNumToRender={10} maxToRenderPerBatch={8} windowSize={7}
          keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" maintainVisibleContentPosition={KEEP_POSITION}
          onScrollBeginDrag={() => { scrollTarget.current = null; clearTimeout(retryTimer.current); }}
          onScrollToIndexFailed={({ index, averageItemLength }) => {
            if (scrollTarget.current !== index || attempts.current++ >= 6) return;
            list.current?.scrollToOffset({ offset: headerHeight.current + averageItemLength * index, animated: false });
            clearTimeout(retryTimer.current);
            retryTimer.current = setTimeout(tryScroll, 150);
          }}
          refreshing={refreshing} onRefresh={refresh} onEndReachedThreshold={0.35}
          onEndReached={() => { if (!pageError && !error) loadPage('after'); }}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={loading ? <Loading /> : !error && !podiumCount ? <Message title="Aucun candidat pour cette période" detail="Sois parmi les premiers de ton cycle, ou consulte une autre période." /> : null}
          ListFooterComponent={paging === 'after' ? <Loading label="Chargement des candidats suivants…" /> : pageError === 'after' ? <Message title="Chargement interrompu" detail="La suite du classement n’a pas pu être chargée. Réessaie dans quelques instants." retry={() => loadPage('after')} /> : candidates.length > 0 && !data?.suivant ? <Text variant="caption" style={s.searchHelp}>{Object.prototype.hasOwnProperty.call(data, 'suivant') ? 'Tous les candidats visibles sont affichés.' : 'Tu as atteint la fin du classement.'}</Text> : null} />
      )}
      <PinnedMe data={data} loading={loading} error={error} locate={locate} retry={() => load()} reduced={reduced} bottom={insets.bottom} />
    </PaperStack>
  );
};

export const RankingScreen = ({ navigation, route }) => {
  const [periode, setPeriode] = useState('tout');
  const programmeCode = route.params?.programme;
  return <RankingContent key={`${programmeCode}:${periode}`} navigation={navigation} programmeCode={programmeCode} periode={periode} setPeriode={setPeriode} />;
};

export const CandidateScreen = ({ navigation, route }) => {
  const { programme: programmeCode, identite, periode = 'tout' } = route.params;
  const programme = getProgramme(programmeCode);
  const insets = useSafeAreaInsets();
  const reduced = useReduceMotion();
  const mine = useSummary(programmeCode);
  const identity = usePrep((state) => state.identite);
  const followed = usePrep((state) => Boolean(state.candidatsSuivis?.[programmeCode]?.some((c) => c.identite === identite)));
  const follow = usePrep((state) => state.followCandidate);
  const unfollow = usePrep((state) => state.unfollowCandidate);
  const [profile, setProfile] = useState(null);
  const [total, setTotal] = useState(route.params.total ?? null);
  const [totalError, setTotalError] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [comparing, setComparing] = useState(false);
  const own = route.params.moi || identite === (identity?.id || identity?._id);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    setProfile(null); setTotal(route.params.total ?? null); setError(null); setLoading(true); setComparing(false); setTotalError(false);
    prepApi.candidate(programmeCode, identite, periode, controller.signal).then((p) => {
      if (!p) throw new Error('Profil vide');
      if (!controller.signal.aborted) setProfile(p);
    }).catch((err) => { if (!controller.signal.aborted) setError(rankingError(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    // Le contrat du profil ne contient pas de total. Celui-ci est lu pour la même période.
    prepApi.ranking(programmeCode, periode, { limite: 1, signal: controller.signal }).then((r) => {
      if (r?.total == null) throw new Error('Total absent');
      if (!controller.signal.aborted) setTotal(r.total);
    }).catch(() => { if (!controller.signal.aborted) setTotalError(true); });
    return () => controller.abort();
  }, [programmeCode, identite, periode, revision, route.params.total]));
  const retry = () => setRevision((r) => r + 1);
  const stats = profile?.stats || {};
  const canCompare = !own && Boolean(mine && (mine.stats.questions > 0 || mine.modulesValides > 0 || mine.stats.meilleurBlanc != null));
  const compare = profile && mine ? [
    ['Questions répondues', mine.stats.questions || 0, stats.questions || 0, ''],
    ['Modules validés', mine.modulesValides || 0, stats.modulesValides || 0, ''],
    ['Réussite du 1ᵉʳ coup', Math.round((mine.stats.reussite || 0) * 100), Math.round((stats.reussite || 0) * 100), ' %'],
    ['Série record', mine.etat.serie?.record || 0, stats.serieRecord || 0, ' j'],
  ] : [];
  const biggestGap = compare.reduce((best, item) => !best || Math.abs(item[2] - item[1]) / Math.max(1, item[1], item[2]) > Math.abs(best[2] - best[1]) / Math.max(1, best[1], best[2]) ? item : best, null);
  const metrics = [
    [value(stats.questions), 'Questions répondues'],
    ...(stats.reussies != null ? [[nf(stats.reussies), 'Réussies du 1ᵉʳ coup']] : []),
    [value(stats.erreurs), 'Erreurs effectuées'],
    [pct(stats.reussite), 'Taux de réussite'],
    [value(stats.modulesValides), 'Modules validés'],
    [value(stats.raisonnementsValides), 'Raisonnements validés'],
    [`${value(stats.serie)} / ${value(stats.serieRecord)}`, 'Série / record · jours'],
    [stats.meilleurBlanc == null ? '—' : `${nf(stats.meilleurBlanc)} / 20`, 'Meilleur concours blanc'],
  ];
  return (
    <PaperStack header={<BackHeader navigation={navigation} title={own ? 'Ton profil' : 'Profil candidat'} />}>
      <ScrollView contentContainerStyle={[s.profileContent, { paddingBottom: insets.bottom + 24 }]}>
        {loading ? <Loading label="Chargement des résultats…" /> : error ? <Message {...rankingMessage(error, 'profil')} retry={retry} /> : profile ? (
          <>
            <View style={s.profileHero}>
              <Avatar name={profile.pseudonyme} tint={profile.avatarTeinte} size={72} ring={PODIUM[profile.rang - 1] || brand.lineStrong} />
              <Text variant="h1" align="center">{profile.pseudonyme}</Text>
              <Text variant="bodyMedium" style={[s.rank, type.tabular]}>{rankLabel(profile.rang)}{total != null ? ` sur ${nf(total)}` : ''}</Text>
              <Text variant="caption" align="center" style={s.muted}>{programmeLabel(programme)} · {periodLabel(periode)}</Text>
              <Text style={[type.numeral, s.profileScore]}>{scoreLabel(profile.score)}<Text variant="body" style={s.muted}> points</Text></Text>
            </View>
            {totalError ? <Message title="Nombre de participants indisponible" detail={total != null ? 'Le nombre affiché provient du dernier classement consulté. Réessaie pour l’actualiser.' : 'Le nombre de participants n’a pas pu être chargé. Réessaie dans quelques instants.'} retry={retry} /> : null}
            {!own ? <PrepButton title={followed ? 'Ne plus suivre' : 'Suivre'} variant={followed ? 'secondary' : 'primary'} iconLeft={followed ? Check : UserPlus} onPress={() => {
              if (followed) unfollow(programmeCode, identite); else follow(programmeCode, { ...profile, identite });
            }} accessibilityLabel={followed ? `Ne plus suivre ${profile.pseudonyme}` : `Suivre ${profile.pseudonyme} sur cet appareil`} /> : null}
            <SectionTitle style={s.sectionTitle}>{own ? 'Tes résultats' : 'Ses résultats'}</SectionTitle>
            <Text variant="caption" style={s.muted}>Résultats cumulés. La période sélectionne les participants au classement.</Text>
            <Card style={s.metrics}>
              {metrics.map(([number, label]) => <View key={label} style={s.metric} accessible accessibilityLabel={`${label} : ${number}`}>
                <Text variant="body" style={[s.muted, s.flex]}>{label}</Text><Text style={[type.numeral, s.metricNumber]}>{number}</Text>
              </View>)}
            </Card>
            <SectionTitle style={s.sectionTitle}>Matières fortes</SectionTitle>
            {profile.matieresFortes?.length ? <View style={s.subjects}>{profile.matieresFortes.map((subject, index) => {
              const tint = subjectTint(index);
              return <View key={subject} style={[s.subject, { backgroundColor: tint.wash }]}><Text variant="caption" style={{ color: tint.tint }}>{subject}</Text></View>;
            })}</View> : <Text variant="body" style={s.muted}>Les matières fortes apparaîtront avec la progression.</Text>}
            {canCompare ? <>
              <PressScale onPress={() => { haptic.select(); setComparing((c) => !c); }} scaleTo={reduced ? 1 : motion.press.scale}
                accessibilityState={{ expanded: comparing }} style={s.compareButton}>
                <Text variant="bodyMedium" style={[s.rank, s.flex]}>{comparing ? 'Masquer la comparaison' : 'Comparer avec moi'}</Text>
                {comparing ? <X size={20} color={brand.burgundy} /> : <ChevronRight size={20} color={brand.burgundy} />}
              </PressScale>
              {comparing ? <Animated.View entering={FadeIn.duration(reduced ? 150 : 200).easing(motion.enter.easing)} exiting={FadeOut.duration(150)} style={s.comparison}>
                <SectionTitle>{`Toi / ${profile.pseudonyme}`}</SectionTitle>
                {compare.map(([label, a, b, unit]) => <View key={label} style={s.comparisonMetric} accessible accessibilityLabel={`${label} : toi ${nf(a)}${unit}, ${profile.pseudonyme} ${nf(b)}${unit}`}>
                  <Text variant="bodyMedium">{label}</Text>
                  <Text variant="caption" style={[s.muted, type.tabular]}>Toi · {nf(a)}{unit}</Text><ProgressBar value={a / Math.max(a, b, 1)} color={brand.burgundy} />
                  <Text variant="caption" style={[s.muted, type.tabular]}>{profile.pseudonyme} · {nf(b)}{unit}</Text><ProgressBar value={b / Math.max(a, b, 1)} color={brand.gold} />
                </View>)}
                {biggestGap && biggestGap[1] !== biggestGap[2] ? <View style={s.advice}><Trophy size={20} color={brand.goldInk} /><Text variant="body" style={s.flex}>Le plus gros écart relatif : {biggestGap[0].toLowerCase()}. Toi : {nf(biggestGap[1])}{biggestGap[3]} · {profile.pseudonyme} : {nf(biggestGap[2])}{biggestGap[3]}.</Text></View> : <Text variant="body" style={s.muted}>Vous êtes au même niveau sur ces indicateurs.</Text>}
              </Animated.View> : null}
            </> : null}
          </>
        ) : null}
        {error && followed ? <PrepButton title="Retirer le suivi" variant="link" onPress={() => unfollow(programmeCode, identite)} /> : null}
      </ScrollView>
    </PaperStack>
  );
};

const s = StyleSheet.create({
  flex: { flex: 1 },
  muted: { color: brand.inkSoft },
  rank: { color: brand.burgundy },
  onInk: { color: brand.onInk },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  header: { paddingHorizontal: 16, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: brand.inkGlow, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: brand.onInkSoft },
  controls: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 10 },
  periods: { padding: 4, borderRadius: 26, flexDirection: 'row', backgroundColor: brand.paperDim },
  period: { flex: 1, minHeight: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 6 },
  periodOn: { backgroundColor: brand.burgundy },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: brand.lineStrong, backgroundColor: brand.sheet },
  input: { flex: 1, minHeight: 48, paddingVertical: 10, color: brand.ink, fontFamily: theme.fontFamily.regular, fontSize: 15 },
  clear: { width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: 24 },
  searchHelp: { paddingHorizontal: 20, paddingVertical: 12, color: brand.inkSoft },
  listHeading: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  pageButton: { marginHorizontal: 20, marginBottom: 12 },
  candidate: { marginHorizontal: 20, marginBottom: 8, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: brand.line, backgroundColor: brand.sheet, gap: 8, minHeight: 96 },
  candidateOwn: { backgroundColor: brand.goldWash, borderColor: brand.gold },
  score: { alignItems: 'flex-end' },
  scoreNumber: { color: brand.ink, fontSize: 22, lineHeight: 28 },
  chevron: { width: 28, height: 28, borderRadius: 14, backgroundColor: brand.burgundyWash, alignItems: 'center', justifyContent: 'center' },
  loading: { padding: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  message: { padding: 20, gap: 12 },
  podium: { flexDirection: 'row', gap: 8, marginHorizontal: 20, alignItems: 'flex-end', marginTop: 16 },
  podiumColumn: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4 },
  laurel: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
  podiumName: { color: brand.ink, textAlign: 'center', alignSelf: 'stretch' },
  podiumPaper: { alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: brand.lineStrong, borderTopLeftRadius: 14, borderTopRightRadius: 14, backgroundColor: brand.sheet, marginTop: 4 },
  podiumRank: { color: brand.goldInk, fontSize: 24, lineHeight: 30 },
  followed: { gap: 8, paddingTop: 12, paddingHorizontal: 20 },
  followedList: { gap: 10, paddingVertical: 4 },
  followCard: { width: 228, borderWidth: 1, borderColor: brand.line, borderRadius: 16, backgroundColor: brand.sheet, overflow: 'hidden' },
  followOpen: { padding: 12, gap: 8, minHeight: 76 },
  remove: { minHeight: 44, backgroundColor: brand.burgundyWash, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  veil: { position: 'absolute', top: -20, left: 0, right: 0, height: 40 },
  pinned: { marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderWidth: 1, borderColor: brand.lineStrong, backgroundColor: brand.sheet, gap: 4, ...theme.shadows.soft },
  pinnedRank: { fontSize: 26, lineHeight: 34, color: brand.ink },
  invitation: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  profileContent: { padding: 20, gap: 12 },
  profileHero: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  profileScore: { color: brand.ink, fontSize: 36, lineHeight: 44 },
  sectionTitle: { marginTop: 16 },
  metrics: { paddingHorizontal: 16, overflow: 'hidden' },
  metric: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.line },
  metricNumber: { color: brand.ink, fontSize: 22, lineHeight: 28, flexShrink: 1 },
  subjects: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subject: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  compareButton: { marginTop: 20, borderRadius: 16, borderWidth: 1, borderColor: brand.burgundy, minHeight: 52, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: brand.sheet },
  comparison: { gap: 20, paddingTop: 8 },
  comparisonMetric: { gap: 8 },
  advice: { padding: 16, borderRadius: 18, backgroundColor: brand.goldWash, flexDirection: 'row', gap: 10 },
});
