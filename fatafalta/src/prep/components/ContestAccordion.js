import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedProps, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { ChevronRight, Search } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import OrganismeLogo from '../../components/catalog/OrganismeLogo';
import { brand, colors, motion, theme } from '../theme';
import { haptic, useReduceMotion } from '../feedback';
import { Badge } from '../ui/primitives';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const SEARCH_THRESHOLD = 6;
const normalize = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Radio qui se remplit (snap) puis coche qui se dessine (draw 250 ms). */
const Radio = ({ checked }) => {
  const reduce = useReduceMotion();
  const fill = useSharedValue(checked ? 1 : 0);
  const draw = useSharedValue(checked ? 1 : 0);
  useEffect(() => {
    fill.value = reduce ? (checked ? 1 : 0) : withSpring(checked ? 1 : 0, motion.snap);
    draw.value = reduce ? (checked ? 1 : 0) : withTiming(checked ? 1 : 0, { duration: 250 });
  }, [checked, reduce, fill, draw]);
  const dot = useAnimatedStyle(() => ({ transform: [{ scale: fill.value }] }));
  const check = useAnimatedProps(() => ({ strokeDashoffset: 14 * (1 - draw.value) }));
  return (
    <View style={styles.radio}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.radioFill, dot]} />
      <Svg width={14} height={14} viewBox="0 0 14 14">
        <AnimatedPath d="M3 7.2L5.8 10L11 4.5" stroke="#FFF" strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="14 14" animatedProps={check} />
      </Svg>
    </View>
  );
};

const Highlight = ({ text, query, style }) => {
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

const OrganismRow = ({ org, open, onToggle, selected, onSelect, query, onNotify, index }) => {
  const reduce = useReduceMotion();
  const [contentH, setContentH] = useState(0);
  const progress = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    progress.value = reduce ? withTiming(open ? 1 : 0, { duration: 120 }) : withSpring(open ? 1 : 0, { ...motion.sheet, overshootClamping: true });
  }, [open, reduce, progress]);
  const body = useAnimatedStyle(() => ({ height: contentH * progress.value, opacity: Math.min(1, progress.value * 1.6) }));
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${progress.value * 90}deg` }] }));
  const card = useAnimatedStyle(() => ({ borderColor: progress.value > 0.5 ? 'rgba(108,40,56,0.55)' : brand.line, borderWidth: 1 + progress.value * 0.3 }));
  const publies = org.cycles.filter((c) => c.publie).length;
  const direct = org.cycles.length === 1 && !org.cycles[0].nom;

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * motion.stagger).duration(320)} style={[styles.card, open && theme.shadows.soft, card]}>
      <Pressable
        onPress={() => { haptic.select(); if (direct) onSelect(org.cycles[0]); else onToggle(); }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${org.nom}, ${publies} cycle${publies > 1 ? 's' : ''} disponible${publies > 1 ? 's' : ''}`}
        style={styles.head}
      >
        <OrganismeLogo organisme={{ nom: org.sigle, logo: org.logo, abbreviation: org.sigle }} size={44} />
        <View style={styles.headText}>
          <Text variant="bodyMedium" style={styles.orgName} numberOfLines={1}>{org.sigle}</Text>
          <Text variant="caption" style={styles.muted} numberOfLines={1}>
            {org.nom && org.nom !== org.sigle ? `${org.nom.replace(/^[^-–]+[-–]\s*/, '')} · ` : ''}{`${publies} cycle${publies > 1 ? 's' : ''} en préparation`}
          </Text>
        </View>
        <Animated.View style={chevron}><ChevronRight size={18} color={brand.burgundy} strokeWidth={2.2} /></Animated.View>
      </Pressable>
      <Animated.View style={[styles.bodyClip, body]}>
        <View style={styles.bodyInner} onLayout={(e) => setContentH(e.nativeEvent.layout.height)}>
          <View style={styles.divider} />
          {org.cycles.map((cycle, i) => {
            const isSel = selected === cycle.programme;
            return (
              <Animated.View key={cycle.programme} entering={open ? FadeInDown.delay(i * 35).duration(240) : undefined}>
                <Pressable
                  disabled={!cycle.publie}
                  onPress={() => { haptic.success(); onSelect(cycle); }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSel, disabled: !cycle.publie }}
                  accessibilityLabel={`${cycle.nom}${cycle.publie ? '' : ', bientôt disponible'}`}
                  style={[styles.cycle, isSel && styles.cycleSel, !cycle.publie && styles.cycleOff]}
                >
                  <View style={styles.cycleText}>
                    <Highlight text={cycle.nom} query={query} style={styles.cycleName} />
                    <Text variant="caption" style={styles.muted}>
                      {cycle.publie ? `${cycle.modulesPublies} module${cycle.modulesPublies > 1 ? 's' : ''} prêts · ${cycle.matieres} matières` : 'Bientôt disponible'}
                    </Text>
                  </View>
                  {cycle.publie ? <Radio checked={isSel} /> : (
                    <Pressable onPress={() => onNotify?.(cycle)} hitSlop={8}><Text variant="caption" style={styles.notify}>Me prévenir</Text></Pressable>
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

/**
 * Accordéon organismes → cycles (§ 6.2). Un seul organisme ouvert à la fois ;
 * la recherche porte aussi sur les cycles et ouvre l'organisme correspondant.
 */
const ContestAccordion = ({ catalogue, selected, onSelect, scrollTo }) => {
  const [open, setOpen] = useState(() => catalogue.find((o) => o.cycles.some((c) => c.programme === selected))?.sigle || null);
  const [query, setQuery] = useState('');
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
    <View style={{ gap: 10 }}>
      {catalogue.length > SEARCH_THRESHOLD || query ? (
        <View style={styles.search}>
          <Search size={18} color={brand.inkMuted} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Rechercher un organisme ou un cycle" placeholderTextColor={brand.inkMuted} style={styles.searchInput} accessibilityLabel="Rechercher un organisme ou un cycle" />
        </View>
      ) : null}
      {filtered.length ? filtered.map((org, index) => (
        <View key={org.sigle} onLayout={(e) => { positions.current[org.sigle] = e.nativeEvent.layout.y; }}>
          <OrganismRow
            org={org}
            index={index}
            open={open === org.sigle}
            onToggle={() => toggle(org.sigle)}
            selected={selected}
            onSelect={onSelect}
            query={query.trim()}
          />
        </View>
      )) : (
        <Animated.View entering={FadeIn}><Text variant="body" style={[styles.muted, { textAlign: 'center', marginTop: 20 }]}>{`Aucun organisme ne correspond à « ${query} »`}</Text></Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: brand.sheet, borderRadius: 18, overflow: 'hidden', ...theme.shadows.sm },
  head: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16 },
  headText: { flex: 1 },
  orgName: { color: brand.ink, fontFamily: theme.fontFamily.serif, fontSize: 18, lineHeight: 23 },
  muted: { color: brand.inkSoft },
  bodyClip: { overflow: 'hidden' },
  bodyInner: { position: 'absolute', left: 0, right: 0, top: 0, paddingBottom: 10 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: brand.line, marginHorizontal: 16, marginBottom: 2 },
  cycle: { minHeight: 60, flexDirection: 'row', alignItems: 'center', marginHorizontal: 8, marginTop: 4, paddingLeft: 66, paddingRight: 12, gap: 12, borderRadius: 14, borderWidth: 1, borderColor: 'transparent' },
  cycleSel: { backgroundColor: brand.burgundyWash, borderColor: 'rgba(108,40,56,0.35)' },
  cycleOff: { opacity: 0.45 },
  cycleText: { flex: 1, paddingVertical: 8 },
  cycleName: { color: brand.ink },
  hl: { backgroundColor: brand.goldWash, fontFamily: theme.fontFamily.semiBold, color: brand.goldInk },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: brand.lineStrong, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: brand.sheet },
  radioFill: { backgroundColor: brand.burgundy, borderRadius: 12 },
  notify: { color: brand.burgundy },
  search: { height: 50, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: brand.line, backgroundColor: brand.sheet, ...theme.shadows.sm },
  searchInput: { flex: 1, color: brand.ink, fontFamily: theme.fontFamily.regular, fontSize: 15 },
});

export default ContestAccordion;
