import Pressable from '../../components/ui/FeedbackPressable';
import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Check, PlayCircle, Search } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import OrganismeLogo from '../../components/catalog/OrganismeLogo';

import { haptic } from '../feedback';
import { Badge } from '../ui/primitives';
import { HomeChevron } from './HomePresentation';
import { findVideo, useVideosIndex } from '../video/useVideos';

const SEARCH_THRESHOLD = 6;
const normalize = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Sélection immédiate ; le chevron partagé porte le seul mouvement. */
const Radio = ({ checked }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  return (<View style={[styles.radio, checked && styles.radioFill]} accessible={false}>
    {checked ? <Check size={15} color={brand.onInk} strokeWidth={2.2} /> : null}
  </View>);
};

const Highlight = ({ text, query, style }) => {
  const { styles } = useStyles();
  if (!query) return <Text variant="bodyMedium" style={style}>{text}</Text>;
  const i = normalize(text).indexOf(normalize(query));
  if (i < 0) return <Text variant="bodyMedium" style={style}>{text}</Text>;
  return (
    <Text variant="bodyMedium" style={style}>
      {text.slice(0, i)}
      <Text style={styles.hl}>{text.slice(i, i + query.length)}</Text>
      {text.slice(i + query.length)}
    </Text>
  );
};

const OrganismRow = ({ org, open, onToggle, selected, onSelect, query, videos }) => {
  const { styles } = useStyles();
  const publies = org.cycles.filter((c) => c.publie).length;
  const direct = org.cycles.length === 1 && !org.cycles[0].nom;

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => { haptic.select(); if (direct) onSelect(org.cycles[0]); else onToggle(); }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${org.nom}, ${publies} cycle${publies > 1 ? 's' : ''} disponible${publies > 1 ? 's' : ''}`}
        style={styles.head}
      >
        <OrganismeLogo organisme={{ nom: org.sigle, logo: org.logo, abbreviation: org.sigle }} size={44} />
        <View style={styles.headText}>
          <Text variant="bodyMedium" style={styles.orgName}>{org.sigle}</Text>
          <Text variant="caption" style={styles.muted}>
            {org.nom && org.nom !== org.sigle ? `${org.nom.replace(/^[^-–]+[-–]\s*/, '')} · ` : ''}{`${publies} cycle${publies > 1 ? 's' : ''} disponible${publies > 1 ? 's' : ''}`}
          </Text>
        </View>
        <HomeChevron expanded={open} />
      </Pressable>
      <View style={styles.bodyClip} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}>
        {open ? <View style={styles.bodyInner}>
          <View style={styles.divider} />
          {org.cycles.map((cycle) => {
            const isSel = selected === cycle.programme;
            return (
              <View key={cycle.programme}>
                <Pressable
                  disabled={!cycle.publie}
                  onPress={() => { haptic.success(); onSelect(cycle); }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSel, disabled: !cycle.publie }}
                  accessibilityLabel={`${cycle.nom}${cycle.publie ? '' : ', contenu à venir'}`}
                  style={[styles.cycle, !cycle.publie && styles.cycleOff, isSel && styles.cycleSel]}
                >
                  <View style={styles.cycleText}>
                    <Highlight text={cycle.nom} query={query} style={styles.cycleName} />
                    {cycle.publie && findVideo(videos, 'concours', cycle.programme) ? (
                      // Indicateur : ce concours a une vidéo de présentation.
                      <View style={styles.metaRow}>
                        <Text variant="caption" style={[styles.muted, styles.shrink]}>{`${cycle.modulesPublies} module${cycle.modulesPublies > 1 ? 's' : ''} prêts · ${cycle.matieres} matières`}</Text>
                        <Badge label="Vidéo" tone="ink" icon={PlayCircle} />
                      </View>
                    ) : (
                      <Text variant="caption" style={styles.muted}>
                        {cycle.publie ? `${cycle.modulesPublies} module${cycle.modulesPublies > 1 ? 's' : ''} prêts · ${cycle.matieres} matières` : 'Contenu à venir. Choisis un autre cycle en attendant.'}
                      </Text>
                    )}
                  </View>
                  {cycle.publie ? <Radio checked={isSel} /> : (
                    <Badge label="À venir" tone="neutral" />
                  )}
                </Pressable>
              </View>
            );
          })}
        </View> : null}
      </View>
    </View>
  );
};

/**
 * Accordéon organismes → cycles (§ 6.2). Un seul organisme ouvert à la fois ;
 * la recherche porte aussi sur les cycles et ouvre l'organisme correspondant.
 */
const ContestAccordion = ({ catalogue, selected, onSelect, scrollTo }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  const [open, setOpen] = useState(() => catalogue.find((o) => o.cycles.some((c) => c.programme === selected))?.sigle || null);
  const [query, setQuery] = useState('');
  const videos = useVideosIndex();
  const positions = useRef({});

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return catalogue;
    return catalogue.filter((o) => normalize(`${o.sigle} ${o.nom}`).includes(q) || o.cycles.some((c) => normalize(c.nom).includes(q)));
  }, [catalogue, query]);

  useEffect(() => {
    const q = normalize(query.trim());
    if (!q) return;
    const byCycle = filtered.find((o) => o.cycles.some((c) => normalize(c.nom).includes(q)));
    if (byCycle) setOpen(byCycle.sigle);
  }, [query, filtered]);

  const toggle = (sigle) => {
    setOpen((cur) => (cur === sigle ? null : sigle));
    setTimeout(() => { const y = positions.current[sigle]; if (y != null) scrollTo?.(y); }, 120);
  };

  return (
    <View>
      {catalogue.length > SEARCH_THRESHOLD || query ? (
        <View style={styles.search}>
          <Search size={18} color={brand.inkSoft} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Rechercher un organisme ou un cycle" placeholderTextColor={brand.inkSoft} style={styles.searchInput} accessibilityLabel="Rechercher un organisme ou un cycle" />
        </View>
      ) : null}
      {filtered.length ? filtered.map((org, index) => (
        <View key={org.sigle} onLayout={(e) => { positions.current[org.sigle] = e.nativeEvent.layout.y; }}>
          <OrganismRow
            videos={videos}
            org={org}
            open={open === org.sigle}
            onToggle={() => toggle(org.sigle)}
            selected={selected}
            onSelect={onSelect}
            query={query.trim()}
          />
        </View>
      )) : (
        <View><Text variant="body" style={[styles.muted, { textAlign: 'center', marginTop: 20 }]}>{`Aucun organisme ne correspond à « ${query} ». Essaie un autre nom ou un sigle.`}</Text></View>
      )}
    </View>
  );
};

export default ContestAccordion;

const useStyles = createThemedStyles(({ brand, theme }) => {
  const styles = StyleSheet.create({
    card: { borderBottomWidth: 1, borderColor: brand.line },
    head: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 0 },
    headText: { flex: 1 },
    orgName: { color: brand.ink, fontFamily: theme.fontFamily.serif, fontSize: 18, lineHeight: 23 },
    muted: { color: brand.inkSoft },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    shrink: { flexShrink: 1 },
    bodyClip: { overflow: 'hidden' },
    bodyInner: { paddingBottom: 16 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: brand.line, marginHorizontal: 16, marginBottom: 2 },
    cycle: { minHeight: 60, flexDirection: 'row', alignItems: 'center', marginHorizontal: 0, marginTop: 4, paddingLeft: 14, paddingRight: 12, gap: 12, borderRadius: 14, borderWidth: 1, borderColor: 'transparent' },
    cycleSel: { backgroundColor: brand.burgundyWash, borderColor: brand.burgundy },
    cycleOff: { backgroundColor: brand.paperDim },
    cycleText: { flex: 1, paddingVertical: 8 },
    cycleName: { color: brand.ink },
    hl: { backgroundColor: brand.goldWash, fontFamily: theme.fontFamily.semiBold, color: brand.goldInk },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: brand.lineStrong, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: brand.sheet },
    radioFill: { backgroundColor: brand.burgundySolid, borderRadius: 12 },

    search: { minHeight: 52, marginBottom: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: brand.line, backgroundColor: brand.sheet },
    searchInput: { flex: 1, color: brand.ink, fontFamily: theme.fontFamily.regular, fontSize: 15 },
  });
  return { styles };
});
