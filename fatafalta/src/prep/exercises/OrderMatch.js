import Pressable from '../../components/ui/FeedbackPressable';
import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, useAnimatedReaction } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle, Path } from 'react-native-svg';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import { motion, type } from '../theme';
import { haptic, useReduceMotion } from '../feedback';
import { isCorrected, useShuffled } from './kit';

// ═══ Remettre dans l'ordre (§ 11.4, E16) ════════════════════════════════
const ROW = 60;
const GAP = 8;

const OrderRow = ({ item, index, count, positions, onDrop, onMove, selected, onSelect, status, corrected, rang, rowHeight }) => {
  const { STATE_COLORS, brand } = useTheme();
  const { styles } = useStyles();
  const reduce = useReduceMotion();
  const step = rowHeight + GAP;
  const dragging = useSharedValue(0);
  const y = useSharedValue(index * step);
  const startY = useSharedValue(0);
  const latest = useRef({ onDrop });
  latest.current = { onDrop };
  const drop = useCallback(() => latest.current.onDrop(), []);
  const lift = useCallback(() => haptic.lift(), []);

  // Les autres cartes s'écartent en douceur quand l'ordre change.
  useAnimatedReaction(() => positions.value[item.id], (pos, prev) => {
    if (pos !== prev && dragging.value === 0 && pos != null) y.value = reduce ? pos * step : withSpring(pos * step, motion.sheet);
  });
  useEffect(() => { if (!dragging.value) y.value = reduce ? index * step : withSpring(index * step, motion.sheet); }, [index, step, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  const pan = useMemo(() => Gesture.Pan()
    .enabled(!corrected)
    .activateAfterLongPress(250)
    .onStart(() => {
      dragging.value = withTiming(1, { duration: 120 });
      startY.value = y.value;
      scheduleOnRN(lift);
    })
    .onUpdate((e) => {
      y.value = startY.value + e.translationY;
      const target = Math.max(0, Math.min(count - 1, Math.round(y.value / step)));
      const current = positions.value[item.id];
      if (target !== current) {
        const next = { ...positions.value };
        Object.keys(next).forEach((k) => {
          if (k === item.id) return;
          if (current < target && next[k] > current && next[k] <= target) next[k] -= 1;
          if (current > target && next[k] < current && next[k] >= target) next[k] += 1;
        });
        next[item.id] = target;
        positions.value = next;
      }
    })
    .onEnd(() => {
      y.value = reduce ? positions.value[item.id] * step : withSpring(positions.value[item.id] * step, motion.snap);
      dragging.value = withTiming(0, { duration: 150 });
      scheduleOnRN(drop);
    }), [corrected, count, item.id, drop, lift, step, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({
    top: 0,
    zIndex: dragging.value > 0 ? 20 : 1,
    elevation: dragging.value * 8,
    shadowOpacity: 0.05 + dragging.value * 0.12,
    transform: [{ translateY: y.value }, { scale: reduce ? 1 : 1 + dragging.value * 0.04 }],
  }));

  const st = status ? STATE_COLORS[status] : null;
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.orderRow, { height: rowHeight }, selected && styles.orderSelected, st && { borderColor: st.border, backgroundColor: st.bg }, style]}>
        <Pressable
          style={styles.orderPress}
          onPress={() => onSelect(item.id)}
          disabled={corrected}
          accessibilityRole="button"
          accessibilityLabel={`Position ${index + 1} : ${item.texte}`}
          accessibilityHint="Appui long puis glisse pour déplacer, ou touche pour afficher les flèches"
        >
          <View style={[styles.rank, st && { backgroundColor: st.border }]}>
            <Text variant="caption" style={[styles.rankText, type.tabular, st && { color: brand.onInk }]}>{index + 1}</Text>
          </View>
          <Text variant="bodyMedium" style={styles.orderText}>{item.texte}</Text>
          {corrected && status === 'faux' ? <Text variant="caption" style={styles.expected}>{`→ ${rang}`}</Text> : null}
          {!corrected && selected ? (
            <View style={styles.arrows}>
              <Pressable hitSlop={6} disabled={index === 0} onPress={() => onMove(item.id, -1)} accessibilityLabel="Monter" style={styles.arrowBtn}><ArrowUp size={18} color={index === 0 ? brand.lineStrong : brand.ink} /></Pressable>
              <Pressable hitSlop={6} disabled={index === count - 1} onPress={() => onMove(item.id, 1)} accessibilityLabel="Descendre" style={styles.arrowBtn}><ArrowDown size={18} color={index === count - 1 ? brand.lineStrong : brand.ink} /></Pressable>
            </View>
          ) : !corrected ? <GripVertical size={20} color={brand.inkMuted} /> : null}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
};

export const OrdreRenderer = ({ exercice, value, onChange, phase, correction, seed }) => {
  const { styles } = useStyles();
  const { width, fontScale } = useWindowDimensions();
  const [rowLayouts, setRowLayouts] = useState({});
  const measureKey = `${width}:${fontScale}`;
  const rowHeight = Math.max(ROW, ...exercice.contenu.elements.map((e) => rowLayouts[`${measureKey}:${e.id}`] || ROW));
  const step = rowHeight + GAP;
  const c = exercice.contenu;
  const shuffled = useShuffled(c.elements, seed);
  const corrected = isCorrected(phase);
  // Une réponse existe dès l'affichage : l'ordre mélangé est déjà une proposition (Vérifier actif).
  const order = value?.ordre?.length === c.elements.length ? value.ordre : shuffled.map((e) => e.id);
  useEffect(() => { if (!value?.ordre) onChange({ ordre: shuffled.map((e) => e.id) }); }, [shuffled]); // eslint-disable-line react-hooks/exhaustive-deps
  const positions = useSharedValue(Object.fromEntries(order.map((id, i) => [id, i])));
  useEffect(() => { positions.value = Object.fromEntries(order.map((id, i) => [id, i])); }, [order.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  const [selected, setSelected] = useState(null);
  const orderRef = useRef(order);
  orderRef.current = order;

  const commit = () => {
    const pos = positions.value;
    const next = [...orderRef.current].sort((a, b) => pos[a] - pos[b]);
    haptic.select();
    onChange({ ordre: next });
  };
  const move = (id, delta) => {
    const next = [...order];
    const i = next.indexOf(id);
    const j = i + delta;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    haptic.select();
    onChange({ ordre: next });
  };
  const byId = Object.fromEntries(c.elements.map((e) => [e.id, e]));
  const expected = correction?.cle?.ordre || exercice.cle?.ordre || [];

  return (
    <View>
      {c.libelleHaut ? <Text variant="overline" style={styles.edge}>{c.libelleHaut}</Text> : null}
      {/* Mesure invisible de la ligne complète, flèches comprises : pas de texte tronqué au tri. */}
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.orderMeasure}>
        {order.map((id, index) => (
          <View key={`${measureKey}:${id}`} style={[styles.orderPress, { flex: undefined, minHeight: ROW }]}
            onLayout={(e) => {
              const height = Math.ceil(e.nativeEvent.layout.height) + 4;
              const key = `${measureKey}:${id}`;
              setRowLayouts((previous) => previous[key] === height ? previous : { ...previous, [key]: height });
            }}>
            <View style={styles.rank}><Text variant="caption" style={styles.rankText}>{index + 1}</Text></View>
            <Text variant="bodyMedium" style={styles.orderText}>{byId[id].texte}</Text>
            <View style={{ width: 92, height: 44 }} />
          </View>
        ))}
      </View>
      <View style={{ height: order.length * step - GAP }}>
        {order.map((id, index) => (
          <OrderRow
            key={id}
            item={byId[id]}
            rowHeight={rowHeight}
            index={index}
            count={order.length}
            positions={positions}
            onDrop={commit}
            onMove={move}
            selected={selected === id}
            onSelect={(x) => setSelected((s) => (s === x ? null : x))}
            corrected={corrected}
            status={corrected ? (correction?.detail?.[id]?.juste ? 'juste' : 'faux') : null}
            rang={expected.indexOf(id) + 1}
          />
        ))}
      </View>
      {c.libelleBas ? <Text variant="overline" style={[styles.edge, { marginTop: 10 }]}>{c.libelleBas}</Text> : null}
    </View>
  );
};

// ═══ Relier (§ 11.5, E18) ═══════════════════════════════════════════════
const curve = (a, b) => {
  const mx = (a.x + b.x) / 2;
  return `M${a.x} ${a.y} C${mx} ${a.y} ${mx} ${b.y} ${b.x} ${b.y}`;
};

/** Carte de gauche : glisser depuis l'ancrage trace un trait ; toucher la sélectionne. */
const LeftCard = ({ item, linkedLabel, active, disabled, onLayout, onTap, onLongPress, onDragStart, onDragMove, onDragEnd }) => {
  const { styles } = useStyles();
  const latest = useRef({});
  latest.current = { onDragStart, onDragMove, onDragEnd };
  const start = useCallback(() => latest.current.onDragStart(), []);
  const move = useCallback((x, y) => latest.current.onDragMove(x, y), []);
  const end = useCallback((x, y) => latest.current.onDragEnd(x, y), []);
  const pan = useMemo(() => Gesture.Pan()
    .enabled(!disabled)
    .minDistance(8)
    .onStart(() => { scheduleOnRN(start); })
    .onUpdate((e) => { scheduleOnRN(move, e.absoluteX, e.absoluteY); })
    .onEnd((e) => { scheduleOnRN(end, e.absoluteX, e.absoluteY); }), [disabled, start, move, end]);
  return (
    <GestureDetector gesture={pan}>
      <View onLayout={onLayout} collapsable={false}>
        <Pressable
          disabled={disabled}
          onPress={onTap}
          onLongPress={onLongPress}
          accessibilityRole="button"
          accessibilityLabel={`${item.texte}${linkedLabel ? `, relié à ${linkedLabel}` : ''}`}
          accessibilityHint="Glisse vers un élément de droite, ou touche puis touche l’élément de droite"
          style={[styles.matchCard, active && styles.matchActive]}
        >
          <Text variant="bodyMedium" style={styles.matchText}>{item.texte}</Text>
          <View style={[styles.anchor, styles.anchorRight, linkedLabel && styles.anchorOn]} />
        </Pressable>
      </View>
    </GestureDetector>
  );
};

export const RelierRenderer = ({ exercice, value, onChange, phase, correction, seed }) => {
  const { colors, brand } = useTheme();
  const { styles } = useStyles();
  const c = exercice.contenu;
  const gauche = useShuffled(c.gauche, `${seed}:g`);
  const droite = useShuffled(c.droite, `${seed}:d`);
  const paires = value?.paires || {};
  const corrected = isCorrected(phase);
  const [cols, setCols] = useState({ left: 0, right: 0, leftY: 0, rightY: 0 });
  const [cards, setCards] = useState({ left: {}, right: {} });
  const [active, setActive] = useState(null);
  const [drag, setDrag] = useState(null);
  const containerRef = useRef(null);
  const rightRefs = useRef({});
  const windowRects = useRef({});
  const origin = useRef({ x: 0, y: 0 });

  const anchorLeft = (id) => { const r = cards.left[id]; return r ? { x: cols.left + r.x + r.w, y: cols.leftY + r.y + r.h / 2 } : null; };
  const anchorRight = (id) => { const r = cards.right[id]; return r ? { x: cols.right + r.x, y: cols.rightY + r.y + r.h / 2 } : null; };
  const labelOf = (id) => c.droite.find((d) => d.id === id)?.texte;

  const link = (g, d) => {
    const next = { ...paires };
    Object.keys(next).forEach((k) => { if (next[k] === d) delete next[k]; });
    next[g] = d;
    haptic.select();
    onChange({ paires: next });
  };
  const unlink = (g) => {
    if (!paires[g]) return;
    const next = { ...paires }; delete next[g];
    haptic.select();
    onChange({ paires: next });
  };

  const measureForDrag = () => {
    containerRef.current?.measureInWindow?.((x, y) => { origin.current = { x, y }; });
    Object.entries(rightRefs.current).forEach(([id, node]) => node?.measureInWindow?.((x, y, w, h) => { windowRects.current[id] = { x, y, w, h }; }));
  };
  const rightAt = (x, y) => {
    const found = Object.entries(windowRects.current).find(([, r]) => x >= r.x - 20 && x <= r.x + r.w && y >= r.y - 8 && y <= r.y + r.h + 8);
    return found ? found[0] : null;
  };

  const setCard = (side, id) => (e) => {
    const l = e.nativeEvent.layout;
    setCards((p) => ({ ...p, [side]: { ...p[side], [id]: { x: l.x, y: l.y, w: l.width, h: l.height } } }));
  };

  const lines = [];
  Object.entries(paires).forEach(([g, d]) => {
    const a = anchorLeft(g); const b = anchorRight(d);
    if (!a || !b) return;
    const st = corrected ? correction?.detail?.[g] : null;
    lines.push({ key: `${g}-${d}`, d: curve(a, b), color: st === 'juste' ? colors.success : st === 'faux' ? colors.error : brand.burgundy, dashed: st === 'faux', g });
  });
  if (corrected) {
    const cle = correction?.cle?.paires || exercice.cle?.paires || {};
    Object.entries(cle).forEach(([g, d]) => {
      if (paires[g] === d) return;
      const a = anchorLeft(g); const b = anchorRight(d);
      if (a && b) lines.push({ key: `ok-${g}`, d: curve(a, b), color: colors.success, dashed: false, g });
    });
  }

  return (
    <View ref={containerRef} collapsable={false} style={styles.matchRoot}>
      <View style={styles.col} onLayout={(e) => { const { x, y } = e.nativeEvent.layout; setCols((p) => ({ ...p, left: x, leftY: y })); }}>
        {gauche.map((g) => (
          <LeftCard
            key={g.id}
            item={g}
            linkedLabel={paires[g.id] ? labelOf(paires[g.id]) : null}
            active={active === g.id}
            disabled={corrected}
            onLayout={setCard('left', g.id)}
            onTap={() => { haptic.select(); setActive((a) => (a === g.id ? null : g.id)); }}
            onLongPress={() => unlink(g.id)}
            onDragStart={() => { haptic.lift(); measureForDrag(); setActive(null); }}
            onDragMove={(x, y) => setDrag({ g: g.id, x: x - origin.current.x, y: y - origin.current.y })}
            onDragEnd={(x, y) => { setDrag(null); const d = rightAt(x, y); if (d) link(g.id, d); }}
          />
        ))}
      </View>
      <View style={styles.col} onLayout={(e) => { const { x, y } = e.nativeEvent.layout; setCols((p) => ({ ...p, right: x, rightY: y })); }}>
        {droite.map((d) => (
          <View key={d.id} ref={(node) => { rightRefs.current[d.id] = node; }} onLayout={setCard('right', d.id)} collapsable={false}>
            <Pressable
              disabled={corrected}
              onPress={() => { if (active) { link(active, d.id); setActive(null); } }}
              accessibilityRole="button"
              accessibilityLabel={d.texte}
              style={[styles.matchCard, active && styles.matchTarget]}
            >
              <View style={[styles.anchor, styles.anchorLeft, Object.values(paires).includes(d.id) && styles.anchorOn]} />
              <Text variant="bodyMedium" style={styles.matchText}>{d.texte}</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
        {lines.map((l) => (
          <Path key={l.key} d={l.d} stroke={l.color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeDasharray={l.dashed ? '6 6' : undefined} />
        ))}
        {drag && anchorLeft(drag.g) ? (
          <>
            <Path d={curve(anchorLeft(drag.g), drag)} stroke={brand.burgundy} strokeWidth={2.5} fill="none" strokeLinecap="round" />
            <Circle cx={drag.x} cy={drag.y} r={6} fill={brand.burgundy} />
          </>
        ) : null}
      </Svg>
      {!corrected && Object.keys(paires).length ? (
        <Text variant="caption" style={styles.unlinkHint}>Appui long sur un élément de gauche pour effacer son trait.</Text>
      ) : null}
    </View>
  );
};

const useStyles = createThemedStyles(({ brand, theme, colors }) => {
  const styles = StyleSheet.create({
    edge: { color: brand.inkMuted, marginBottom: 10 },
    orderMeasure: { position: 'absolute', top: 0, left: 2, right: 2, opacity: 0 },
    orderRow: { position: 'absolute', left: 0, right: 0, height: ROW, borderRadius: 12, borderWidth: 1, borderColor: brand.line, backgroundColor: brand.sheet, shadowColor: brand.night, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    orderSelected: { borderColor: brand.burgundy, borderWidth: 2 },
    orderPress: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
    rank: { minWidth: 26, minHeight: 26, padding: 4, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.paperDim },
    rankText: { color: brand.ink, fontFamily: theme.fontFamily.bold },
    orderText: { flex: 1, color: brand.ink, fontSize: 14.5, lineHeight: 19 },
    expected: { color: colors.success, fontFamily: theme.fontFamily.bold },
    arrows: { flexDirection: 'row', gap: 4 },
    arrowBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.paperDim },
    matchRoot: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingVertical: 4 },
    unlinkHint: { width: '100%', marginTop: 14, color: brand.inkMuted, textAlign: 'center' },
    col: { width: '44%', gap: 12 },
    matchCard: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: brand.line, backgroundColor: brand.sheet },
    matchActive: { borderColor: brand.burgundy, borderWidth: 2 },
    matchTarget: { borderColor: brand.lineStrong, borderStyle: 'dashed' },
    matchText: { color: brand.ink, fontSize: 13.5, lineHeight: 18 },
    anchor: { position: 'absolute', top: '50%', marginTop: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: brand.lineStrong },
    anchorRight: { right: -6 },
    anchorLeft: { left: -6 },
    anchorOn: { backgroundColor: brand.burgundySolid },
  });
  return { styles };
});
