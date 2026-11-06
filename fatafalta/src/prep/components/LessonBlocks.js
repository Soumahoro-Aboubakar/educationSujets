import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { Bookmark, ChevronDown, Lightbulb, TriangleAlert } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import core from '../shared/prepCore';
import { brand, colors, theme, type } from '../theme';
import { haptic } from '../feedback';
import RENDERERS from '../exercises';
import { PrepButton } from '../ui/primitives';

/** Gras minimal : **texte** → SemiBold, souligné d'un trait or (termes clés, maquettes E10). */
export const RichText = ({ md, style, size }) => {
  const parts = String(md).split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text style={[type.reading, size && { fontSize: size, lineHeight: Math.round(size * 1.65) }, styles.text, style]}>
      {parts.map((p, i) => (p.startsWith('**')
        ? <Text key={i} style={styles.bold}>{p.slice(2, -2)}</Text>
        : p))}
    </Text>
  );
};

/** Mini-question « Teste-toi » : non notée, corrigée immédiatement, sans seconde chance (E11). */
const MiniQuestion = ({ exercice, onResult, size }) => {
  const Renderer = RENDERERS[exercice.type];
  const [value, setValue] = useState(null);
  const [result, setResult] = useState(null);
  const complete = core.isComplete(exercice, value);
  const verify = () => {
    const r = core.validate(exercice, value);
    if (r.correct) haptic.success(); else haptic.error();
    setResult({ ...r, cle: exercice.cle });
    onResult?.(r.correct);
  };
  return (
    <View style={styles.mini}>
      <View style={styles.miniBadge}><Text variant="overline" style={styles.miniBadgeText}>Teste-toi</Text></View>
      <Text variant="h3" style={[styles.miniTitle, size && { fontSize: size }]}>{exercice.consigne}</Text>
      {Renderer ? (
        <Renderer exercice={exercice} value={value} onChange={setValue} phase={result ? 'corrected' : 'answer'} correction={result} seed={exercice.code} compact />
      ) : null}
      {result ? (
        <Animated.View entering={FadeIn.duration(240)} style={[styles.miniFeedback, { backgroundColor: result.correct ? colors.successWash : colors.errorWash }]}>
          <Text variant="bodyMedium" style={{ color: result.correct ? colors.success : colors.error }}>{result.correct ? 'Bien vu' : 'Pas tout à fait'}</Text>
          {exercice.explication ? <Text variant="body" style={styles.miniExpl}>{exercice.explication}</Text> : null}
        </Animated.View>
      ) : (
        <PrepButton title="Vérifier" variant="secondary" disabled={!complete} onPress={verify} style={styles.miniBtn} />
      )}
    </View>
  );
};

const Example = ({ titre, texte, size }) => {
  const [open, setOpen] = useState(true);
  return (
    <Animated.View layout={LinearTransition.duration(220)} style={styles.example}>
      <Pressable onPress={() => { haptic.select(); setOpen((o) => !o); }} style={styles.exampleHead} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Lightbulb size={18} color={brand.inkSoft} />
        <Text variant="bodyMedium" style={styles.exampleTitle}>{titre}</Text>
        <ChevronDown size={18} color={brand.burgundy} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </Pressable>
      {open ? <RichText md={texte} size={size} style={styles.exampleText} /> : null}
    </Animated.View>
  );
};

/**
 * Rendu d'un bloc de leçon (§ 9.1).
 * @param onMiniResult (code, correct) — une mini-question ratée signale la notion comme fragile (§ 9.2).
 */
export const LessonBlock = ({ bloc, tint, size = 17, onMiniResult }) => {
  switch (bloc.type) {
    case 'texte':
      return <RichText md={bloc.md} size={size} />;
    case 'titre':
      return <Text variant="h2" style={styles.h2} accessibilityRole="header">{bloc.texte}</Text>;
    case 'aRetenir':
      return (
        <View style={[styles.callout, styles.retain]}>
          <View style={styles.calloutHead}><View style={[styles.calloutIcon, { backgroundColor: brand.sheet }]}><Bookmark size={15} color={brand.goldInk} /></View><Text variant="h3" style={{ color: brand.goldInk }}>{bloc.titre}</Text></View>
          <RichText md={bloc.texte} size={size - 1} />
        </View>
      );
    case 'piege':
      return (
        <View style={[styles.callout, styles.trap]}>
          <View style={styles.calloutHead}><View style={[styles.calloutIcon, { backgroundColor: brand.sheet }]}><TriangleAlert size={15} color={brand.burgundy} /></View><Text variant="h3" style={{ color: brand.burgundy }}>{bloc.titre}</Text></View>
          <RichText md={bloc.texte} size={size - 1} />
        </View>
      );
    case 'exemple':
      return <Example titre={bloc.titre} texte={bloc.texte} size={size - 1} />;
    case 'liste':
      return (
        <View style={styles.list}>
          {bloc.items.map((item, i) => (
            <View key={item} style={styles.listRow}>
              <Text style={[type.reading, styles.bullet, { color: tint || brand.gold }]}>{bloc.ordonnee ? `${i + 1}.` : '•'}</Text>
              <RichText md={item} size={size} style={styles.listText} />
            </View>
          ))}
        </View>
      );
    case 'tableau':
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
          <View style={styles.table}>
            <View style={[styles.tr, styles.th]}>
              {bloc.entetes.map((h) => <Text key={h} variant="overline" style={[styles.td, styles.thText]}>{h}</Text>)}
            </View>
            {bloc.lignes.map((row, r) => (
              <View key={row.join('|')} style={[styles.tr, r % 2 === 1 && styles.trAlt]}>
                {row.map((cell, c) => <RichText key={`${r}-${c}`} md={cell} size={14} style={[styles.td, c === 0 && styles.tdFirst]} />)}
              </View>
            ))}
          </View>
        </ScrollView>
      );
    case 'formule':
      return (
        <View style={styles.formula}>
          <Text style={styles.formulaText}>{bloc.texte}</Text>
          {bloc.legende ? <Text variant="caption" style={styles.formulaLegend}>{bloc.legende}</Text> : null}
        </View>
      );
    case 'miniQuestion':
      return <MiniQuestion exercice={bloc.exercice} size={size} onResult={(ok) => onMiniResult?.(bloc.exercice.code, ok)} />;
    case 'recap':
      return (
        <View style={styles.recap}>
          <Text variant="h2" style={styles.recapTitle}>Ce qu’il faut retenir</Text>
          {bloc.items.map((item, i) => (
            <View key={item} style={styles.recapRow}>
              <Text style={[styles.recapNum, type.tabular]}>{i + 1}</Text>
              <Text variant="body" style={styles.recapText}>{item}</Text>
            </View>
          ))}
        </View>
      );
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  text: { color: brand.ink },
  bold: { fontFamily: theme.fontFamily.semiBold, textDecorationLine: 'underline', textDecorationColor: brand.goldLight },
  h2: { color: brand.ink, marginTop: 10 },
  callout: { padding: 16, borderRadius: 18, gap: 8, borderWidth: StyleSheet.hairlineWidth },
  calloutHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  calloutIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  retain: { backgroundColor: brand.goldWash, borderColor: 'rgba(180,138,72,0.35)' },
  trap: { backgroundColor: brand.burgundyWash, borderColor: 'rgba(108,40,56,0.25)' },
  example: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, backgroundColor: brand.sheet, padding: 16, gap: 10, ...theme.shadows.soft },
  exampleHead: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  exampleTitle: { flex: 1, color: brand.ink },
  exampleText: { color: brand.inkSoft },
  list: { gap: 8 },
  listRow: { flexDirection: 'row', gap: 10 },
  bullet: { width: 18, textAlign: 'right', fontFamily: theme.fontFamily.bold },
  listText: { flex: 1 },
  tableScroll: { marginHorizontal: -4 },
  table: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.lineStrong, overflow: 'hidden', backgroundColor: brand.sheet, minWidth: 320 },
  tr: { flexDirection: 'row' },
  th: { backgroundColor: brand.paperDim },
  trAlt: { backgroundColor: '#FBF9F4' },
  td: { width: 150, padding: 10, color: brand.ink },
  tdFirst: { fontFamily: theme.fontFamily.semiBold },
  thText: { color: brand.inkSoft, fontSize: 10 },
  formula: { alignItems: 'center', paddingVertical: 18, paddingHorizontal: 14, borderRadius: 18, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.lineStrong, gap: 6, ...theme.shadows.soft },
  formulaText: { fontFamily: theme.fontFamily.serif, fontVariant: ['lining-nums'], fontSize: 20, lineHeight: 28, color: brand.ink, textAlign: 'center' },
  formulaLegend: { color: brand.inkSoft, textAlign: 'center' },
  mini: { padding: 16, borderRadius: 20, borderWidth: 1.2, borderColor: 'rgba(108,40,56,0.45)', backgroundColor: brand.sheet, gap: 12, ...theme.shadows.soft },
  miniBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, height: 24, justifyContent: 'center', borderRadius: 12, backgroundColor: brand.burgundy },
  miniBadgeText: { color: brand.onInk, fontSize: 10 },
  miniTitle: { color: brand.ink },
  miniFeedback: { padding: 14, borderRadius: 14, gap: 4 },
  miniExpl: { color: brand.ink },
  miniBtn: { minHeight: 48 },
  recap: { padding: 20, borderRadius: 22, backgroundColor: brand.ink, gap: 12, ...theme.shadows.lg },
  recapTitle: { color: brand.goldLight },
  recapRow: { flexDirection: 'row', gap: 12 },
  recapNum: { width: 22, color: brand.goldLight, fontFamily: theme.fontFamily.bold, fontSize: 15, lineHeight: 24 },
  recapText: { flex: 1, color: brand.onInk },
});
