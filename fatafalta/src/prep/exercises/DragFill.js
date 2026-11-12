import Pressable from '../../components/ui/FeedbackPressable';
import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { Check } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import { motion, type } from '../theme';
import { haptic, useReduceMotion } from '../feedback';
import { isCorrected, useShake, useShuffled } from './kit';

const MAGNET = 24; // pt : l'emplacement « aimante » l'étiquette en deçà de cette distance

/**
 * Zones de dépôt mesurées en coordonnées fenêtre. Mesurées au début de chaque glisser :
 * la page a pu défiler depuis la mise en page.
 */
const useDropZones = () => {
  const refs = useRef({});
  const rects = useRef({});
  const register = useCallback((id) => (node) => { if (node) refs.current[id] = node; else delete refs.current[id]; }, []);
  const measure = useCallback(() => {
    Object.entries(refs.current).forEach(([id, node]) => {
      node?.measureInWindow?.((x, y, w, h) => { rects.current[id] = { x, y, w, h }; });
    });
  }, []);
  const hitTest = useCallback((px, py) => {
    let best = null;
    Object.entries(rects.current).forEach(([id, r]) => {
      const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
      const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
      const dist = Math.hypot(dx, dy);
      if (dist <= MAGNET && (!best || dist < best.dist)) best = { id, dist };
    });
    return best?.id || null;
  }, []);
  return { register, measure, hitTest };
};

/** Étiquette déplaçable : se soulève (échelle 1,06, ombre, rotation 2°), revient en ressort. */
const DraggableTag = ({ label, onDragStart, onHover, onDrop, onTap, selected, disabled, style, textStyle }) => {
  const { styles } = useStyles();
  const reduce = useReduceMotion();
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const lifted = useSharedValue(0);
  // Les gestes sont mémorisés : ils appellent toujours la dernière version des callbacks.
  const latest = useRef({});
  latest.current = { onDragStart, onHover, onDrop, onTap };

  const callStart = useCallback(() => latest.current.onDragStart?.(), []);
  const callHover = useCallback((x, y) => latest.current.onHover?.(x, y), []);
  const callTap = useCallback(() => latest.current.onTap?.(), []);
  const callDrop = useCallback((pt) => {
    const placed = latest.current.onDrop?.(pt);
    if (placed) { tx.value = 0; ty.value = 0; } else {
      tx.value = withSpring(0, motion.snap);
      ty.value = withSpring(0, motion.snap);
    }
  }, [tx, ty]);

  const pan = useMemo(() => Gesture.Pan()
    .enabled(!disabled)
    .minDistance(4)
    .onStart(() => {
      lifted.value = withTiming(1, { duration: 120 });
      scheduleOnRN(callStart);
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
      scheduleOnRN(callHover, e.absoluteX, e.absoluteY);
    })
    .onEnd((e) => {
      lifted.value = withTiming(0, { duration: 150 });
      scheduleOnRN(callDrop, { x: e.absoluteX, y: e.absoluteY });
    }), [disabled, callStart, callHover, callDrop, lifted, tx, ty]);

  const tap = useMemo(() => Gesture.Tap().enabled(!disabled).onEnd(() => { scheduleOnRN(callTap); }), [disabled, callTap]);
  const gesture = useMemo(() => Gesture.Exclusive(pan, tap), [pan, tap]);

  const animated = useAnimatedStyle(() => ({
    zIndex: lifted.value > 0 ? 50 : 1,
    elevation: lifted.value * 8,
    shadowOpacity: 0.06 + lifted.value * 0.12,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value - (reduce ? 0 : lifted.value * 2) },
      { scale: reduce ? 1 : 1 + lifted.value * 0.06 },
      { rotate: reduce ? '0deg' : `${Math.max(-2, Math.min(2, tx.value / 40)) * lifted.value}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        accessibilityHint="Glisse vers un emplacement, ou touche puis touche l’emplacement"
        style={[styles.tag, selected && styles.tagSelected, style, animated]}
      >
        <Text variant="bodyMedium" style={[styles.tagText, textStyle]}>{label}</Text>
      </Animated.View>
    </GestureDetector>
  );
};

// ═══ Glisser pour compléter (§ 11.2, E14) ═══════════════════════════════
const Hole = ({ register, id, hovered, placed, onPress, status, correctLabel }) => {
  const { STATE_COLORS, colors } = useTheme();
  const { styles } = useStyles();
  const shake = useShake(status === 'faux');
  const st = status ? STATE_COLORS[status === 'vide' ? 'faux' : status] : null;
  return (
    <Animated.View ref={register(id)} collapsable={false} style={shake}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={placed ? `Emplacement rempli : ${placed}` : 'Emplacement vide'}
        style={[styles.hole, placed && styles.holeFilled, hovered && styles.holeHover, st && { borderColor: st.border, backgroundColor: st.bg, borderStyle: 'solid' }]}
      >
        {status && status !== 'juste' && placed ? <Text variant="caption" style={styles.wrongSmall}>{placed}</Text> : null}
        <Text variant="bodyMedium" style={[styles.holeText, st && { color: st.fg }]}>
          {status && status !== 'juste' ? correctLabel : (placed || ' ')}
        </Text>
        {status === 'juste' ? <Check size={14} color={colors.success} strokeWidth={2.2} /> : null}
      </Pressable>
    </Animated.View>
  );
};

export const GlisserRenderer = ({ exercice, value, onChange, phase, correction, seed }) => {
  const { styles } = useStyles();
  const c = exercice.contenu;
  const tags = useShuffled(c.etiquettes, seed);
  const trous = value?.trous || {};
  const corrected = isCorrected(phase);
  const zones = useDropZones();
  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState(null);
  const label = (id) => c.etiquettes.find((e) => e.id === id)?.texte;
  const used = new Set(Object.values(trous));

  const place = (tagId, holeId) => {
    if (!holeId) return false;
    const next = { ...trous };
    Object.keys(next).forEach((h) => { if (next[h] === tagId && !c.reutilisable) delete next[h]; });
    next[holeId] = tagId;
    haptic.select();
    onChange({ trous: next });
    return true;
  };

  const tokens = useMemo(() => {
    const list = [];
    c.segments.forEach((seg, i) => {
      if (typeof seg === 'object') { list.push({ hole: seg.trou, key: `h${i}` }); return; }
      seg.split(/(\n)/).forEach((part, j) => {
        if (part === '\n') { list.push({ br: true, key: `b${i}-${j}` }); return; }
        part.split(/(?<=\s)/).filter(Boolean).forEach((w, k) => list.push({ word: w, key: `w${i}-${j}-${k}` }));
      });
    });
    return list;
  }, [c.segments]);

  const correctLabelFor = (holeId) => label((correction?.cle?.trous?.[holeId] || exercice.cle?.trous?.[holeId] || [])[0]);

  return (
    <View>
      <View style={styles.textFlow}>
        {tokens.map((t) => {
          if (t.br) return <View key={t.key} style={styles.lineBreak} />;
          if (t.word) return <Text key={t.key} style={[type.reading, styles.flowWord]}>{t.word}</Text>;
          const placed = trous[t.hole] ? label(trous[t.hole]) : null;
          return (
            <Hole
              key={t.key}
              id={t.hole}
              register={zones.register}
              hovered={hover === t.hole}
              placed={placed}
              status={corrected ? correction?.detail?.[t.hole] : null}
              correctLabel={corrected ? correctLabelFor(t.hole) : null}
              onPress={() => {
                if (corrected) return;
                if (selected) { place(selected, t.hole); setSelected(null); return; }
                if (trous[t.hole]) {
                  const next = { ...trous }; delete next[t.hole];
                  haptic.select();
                  onChange({ trous: next });
                }
              }}
            />
          );
        })}
      </View>

      {!corrected ? (
        <View style={styles.reserve} accessibilityLabel="Réserve d’étiquettes">
          {tags.map((tag) => (used.has(tag.id) && !c.reutilisable ? (
            <View key={tag.id} style={[styles.tag, styles.ghost]}><Text variant="bodyMedium" style={[styles.tagText, { opacity: 0 }]}>{tag.texte}</Text></View>
          ) : (
            <DraggableTag
              key={tag.id}
              label={tag.texte}
              selected={selected === tag.id}
              onDragStart={() => { haptic.lift(); zones.measure(); setSelected(null); }}
              onHover={(x, y) => { const z = zones.hitTest(x, y); setHover((h) => (h === z ? h : z)); }}
              onDrop={(pt) => { setHover(null); return place(tag.id, zones.hitTest(pt.x, pt.y)); }}
              onTap={() => { haptic.lift(); setSelected((s) => (s === tag.id ? null : tag.id)); }}
            />
          )))}
        </View>
      ) : null}
    </View>
  );
};

// ═══ Classer dans des catégories (§ 11.6, E17) ══════════════════════════
export const ClasserRenderer = ({ exercice, value, onChange, phase, correction, seed }) => {
  const { fontScale } = useWindowDimensions();
  const { STATE_COLORS, colors } = useTheme();
  const { styles } = useStyles();
  const c = exercice.contenu;
  const cards = useShuffled(c.cartes, seed);
  const placed = value?.cartes || {};
  const corrected = isCorrected(phase);
  const zones = useDropZones();
  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState(null);
  const pile = cards.filter((k) => !placed[k.id]);
  const top = pile[0];

  const drop = (cardId, bin) => {
    if (!bin) return false;
    haptic.select();
    onChange({ cartes: { ...placed, [cardId]: bin } });
    return true;
  };
  const unplace = (cardId) => {
    const next = { ...placed }; delete next[cardId];
    haptic.select();
    onChange({ cartes: next });
  };
  const expected = (cardId) => (correction?.cle?.cartes || exercice.cle?.cartes || {})[cardId];

  return (
    <View>
      <View style={styles.bins}>
        {c.categories.map((cat) => {
          const inBin = cards.filter((k) => placed[k.id] === cat.id);
          const missing = corrected ? cards.filter((k) => expected(k.id) === cat.id && placed[k.id] !== cat.id) : [];
          return (
            <View key={cat.id} ref={zones.register(cat.id)} collapsable={false} style={[c.categories.length <= 3 ? styles.binFlex : styles.binWrap, fontScale >= 1.3 && { width: '100%', flexBasis: '100%' }]}>
              <Pressable
                onPress={() => { if (selected && !corrected) { drop(selected, cat.id); setSelected(null); } }}
                accessibilityRole="button"
                accessibilityLabel={`Catégorie ${cat.nom}, ${inBin.length} carte${inBin.length > 1 ? 's' : ''}`}
                style={[styles.bin, hover === cat.id && styles.binHover, selected && styles.binTarget]}
              >
                <View style={styles.binHead}>
                  <Text variant="overline" style={styles.binTitle} numberOfLines={3}>{cat.nom}</Text>
                  <Text variant="caption" style={[styles.binCount, type.tabular]}>{`${inBin.length} carte${inBin.length > 1 ? 's' : ''}`}</Text>
                </View>
                <View style={styles.pills}>
                  {inBin.map((k) => {
                    const st = corrected ? STATE_COLORS[correction?.detail?.[k.id] === 'juste' ? 'juste' : 'faux'] : null;
                    return (
                      <Pressable key={k.id} disabled={corrected} onPress={() => unplace(k.id)} accessibilityLabel={`${k.texte}, retirer`} style={[styles.pill, st && { backgroundColor: st.bg, borderColor: st.border }]}>
                        <Text variant="caption" style={[styles.pillText, st && { color: st.fg }]} numberOfLines={3}>{k.texte}</Text>
                      </Pressable>
                    );
                  })}
                  {missing.map((k) => (
                    <View key={`m${k.id}`} style={[styles.pill, styles.pillMissing]}>
                      <Text variant="caption" style={[styles.pillText, { color: colors.success }]} numberOfLines={3}>{`→ ${k.texte}`}</Text>
                    </View>
                  ))}
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>

      {!corrected && top ? (
        <View style={styles.pile}>
          {pile.slice(1, 3).reverse().map((k, i) => (
            <View key={k.id} style={[styles.card, styles.cardBehind, { transform: [{ translateY: (2 - i) * 4 }, { scale: 1 - (2 - i) * 0.03 }] }]} />
          ))}
          <DraggableTag
            key={top.id}
            label={top.texte}
            selected={selected === top.id}
            style={styles.card}
            textStyle={styles.cardText}
            onDragStart={() => { haptic.lift(); zones.measure(); setSelected(null); }}
            onHover={(x, y) => { const z = zones.hitTest(x, y); setHover((h) => (h === z ? h : z)); }}
            onDrop={(pt) => { setHover(null); return drop(top.id, zones.hitTest(pt.x, pt.y)); }}
            onTap={() => { haptic.lift(); setSelected((s) => (s === top.id ? null : top.id)); }}
          />
          <Text variant="caption" style={styles.pileCount}>{`${pile.length} carte${pile.length > 1 ? 's' : ''} à classer`}</Text>
        </View>
      ) : null}
    </View>
  );
};

const useStyles = createThemedStyles(({ brand, colors, theme }) => {
  const styles = StyleSheet.create({
    textFlow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 8 },
    flowWord: { color: brand.ink },
    lineBreak: { width: '100%', height: 4 },
    hole: { minWidth: 76, minHeight: 44, paddingVertical: 8, paddingHorizontal: 10, marginHorizontal: 2, borderRadius: 8, borderWidth: 1.5, borderStyle: 'dashed', borderColor: brand.lineStrong, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
    holeFilled: { borderStyle: 'solid', borderColor: brand.burgundy, backgroundColor: brand.sheet },
    holeHover: { borderStyle: 'solid', borderColor: brand.burgundy, backgroundColor: brand.paperDim },
    holeText: { color: brand.ink, fontSize: 15 },
    wrongSmall: { position: 'absolute', top: -16, color: colors.error, textDecorationLine: 'line-through', fontSize: 11 },
    reserve: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 22, padding: 12, borderRadius: 16, backgroundColor: brand.paperDim },
    tag: { minHeight: 44, paddingVertical: 8, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: brand.lineStrong, backgroundColor: brand.sheet, shadowColor: brand.night, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, elevation: 0 },
    tagSelected: { borderColor: brand.burgundy, borderWidth: 2, transform: [{ translateY: -3 }] },
    tagText: { color: brand.ink, fontSize: 15 },
    ghost: { borderStyle: 'dashed', backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0 },
    bins: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    binWrap: { width: '48.5%' },
    binFlex: { flex: 1 },
    bin: { minHeight: 120, padding: 10, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: brand.lineStrong, backgroundColor: brand.sheet },
    binHover: { borderStyle: 'solid', borderColor: brand.burgundy, transform: [{ scale: 1.03 }] },
    binTarget: { borderColor: brand.burgundy },
    binHead: { gap: 2 },
    binTitle: { color: brand.ink, fontSize: 10.5, letterSpacing: 0.3 },
    binCount: { color: brand.inkMuted },
    pills: { gap: 6, marginTop: 8 },
    pill: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: brand.line, backgroundColor: brand.paper },
    pillMissing: { borderStyle: 'dashed', borderColor: colors.success, backgroundColor: 'transparent' },
    pillText: { color: brand.ink, fontSize: 12, lineHeight: 16 },
    pile: { marginTop: 24, alignItems: 'center', minHeight: 100 },
    card: { width: '88%', minHeight: 64, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.sheet, borderWidth: 1, borderColor: brand.lineStrong },
    cardBehind: { position: 'absolute', top: 0, backgroundColor: brand.paperDim },
    cardText: { textAlign: 'center', fontSize: 15.5, fontFamily: theme.fontFamily.semiBold },
    pileCount: { marginTop: 12, color: brand.inkMuted },
  });
  return { styles };
});
