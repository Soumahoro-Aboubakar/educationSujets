import Pressable from '../../components/ui/FeedbackPressable';
import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';

import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Bookmark, ChevronDown, Lightbulb, TriangleAlert } from 'lucide-react-native';
import Text from '../../components/ui/Text';
import core from '../shared/prepCore';
import { type } from '../theme';
import { haptic } from '../feedback';
import RENDERERS from '../exercises';
import { PrepButton } from '../ui/primitives';
import { answerPrompt, CopyMargin, CorrectorNote, useResultAnnouncement } from './StudyPresentation';

/** Gras minimal : **texte** → SemiBold, souligné d'un trait or (termes clés, maquettes E10). */
export const RichText = ({ md, style, size }) => {
  const { styles } = useStyles();
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
  const { styles } = useStyles();
  const Renderer = RENDERERS[exercice.type];
  const [value, setValue] = useState(null);
  const [result, setResult] = useState(null);
  useResultAnnouncement(result ? `${result.correct ? 'Bien vu' : 'Pas tout à fait'}. ${exercice.explication || ''}` : null);
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
        <View accessibilityLiveRegion="polite">
          <CorrectorNote correct={result.correct} title={result.correct ? 'Bien vu' : 'Pas tout à fait'}>
            {exercice.explication ? <Text variant="body" style={styles.miniExpl}>{exercice.explication}</Text> : null}
          </CorrectorNote>
        </View>
      ) : (
        <PrepButton title={complete ? 'Vérifier' : answerPrompt(exercice.type)} variant="secondary" disabled={!complete} onPress={verify} style={styles.miniBtn} />
      )}
    </View>
  );
};

const Example = ({ titre, texte, size }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  const [open, setOpen] = useState(true);
  return (
    <View style={styles.example}>
      <CopyMargin color={brand.inkSoft} />
      <Pressable onPress={() => { haptic.select(); setOpen((o) => !o); }} style={styles.exampleHead} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Lightbulb size={18} color={brand.inkSoft} />
        <Text variant="bodyMedium" style={styles.exampleTitle}>{titre}</Text>
        <ChevronDown size={18} color={brand.burgundy} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </Pressable>
      {open ? <RichText md={texte} size={size} style={styles.exampleText} /> : null}
    </View>
  );
};

/** Mesure la colonne réelle : pleine largeur, puis défilement si les cellules ne tiennent plus. */
const LessonTable = ({ bloc, size }) => {
  const { styles } = useStyles();
  const [width, setWidth] = useState(0);
  const { fontScale } = useWindowDimensions();
  const cellWidth = Math.max(144 * fontScale * size / 17, (width - 2 * StyleSheet.hairlineWidth) / Math.max(1, bloc.entetes.length));
  const overflows = cellWidth * bloc.entetes.length > width + 1;
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.tableWrap}>
      {overflows && width > 0 ? <Text variant="caption" style={styles.tableHint}>Fais défiler le tableau horizontalement</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled style={styles.tableScroll} contentContainerStyle={{ minWidth: '100%' }} accessibilityLabel="Tableau de la leçon" accessibilityHint={overflows ? 'Fais défiler horizontalement pour lire toutes les colonnes' : undefined}>
        <View style={[styles.table, { minWidth: width }]}>
          <View style={[styles.tr, styles.th]}>
            {bloc.entetes.map((h, c) => <Text key={`${h}-${c}`} variant="bodyMedium" style={[styles.td, styles.thText, { width: cellWidth }]}>{h}</Text>)}
          </View>
          {bloc.lignes.map((row, r) => (
            <View key={row.join('|')} style={[styles.tr, r % 2 === 1 && styles.trAlt]}>
              {row.map((cell, c) => <RichText key={`${r}-${c}`} md={cell} size={size - 1} style={[styles.td, { width: cellWidth }, c === 0 && styles.tdFirst]} />)}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

/**
 * Rendu d'un bloc de leçon (§ 9.1).
 * @param onMiniResult (code, correct) — une mini-question ratée signale la notion comme fragile (§ 9.2).
 */
export const LessonBlock = ({ bloc, tint, size = 17, onMiniResult }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  switch (bloc.type) {
    case 'texte':
      return <RichText md={bloc.md} size={size} />;
    case 'titre':
      return <Text variant="h2" style={styles.h2} accessibilityRole="header">{bloc.texte}</Text>;
    case 'aRetenir':
      return (
        <View style={[styles.callout, styles.retain]}>
          <CopyMargin color={brand.goldInk} />
          <View style={styles.calloutHead}><Bookmark size={18} color={brand.goldInk} /><Text style={[styles.annotationTitle, { color: brand.goldInk }]}>{bloc.titre}</Text></View>
          <RichText md={bloc.texte} size={size - 1} />
        </View>
      );
    case 'piege':
      return (
        <View style={[styles.callout, styles.trap]}>
          <CopyMargin />
          <View style={styles.calloutHead}><TriangleAlert size={18} color={brand.burgundy} /><Text style={[styles.annotationTitle, { color: brand.burgundy }]}>{bloc.titre}</Text></View>
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
      return <LessonTable bloc={bloc} size={size} />;
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

const useStyles = createThemedStyles(({ brand, theme, studySurface }) => {
  const styles = StyleSheet.create({
    text: { color: brand.ink },
    bold: { fontFamily: theme.fontFamily.semiBold, textDecorationLine: 'underline', textDecorationColor: brand.goldLight },
    h2: { color: brand.ink, marginTop: 10 },
    callout: { paddingVertical: 12, paddingLeft: 20, paddingRight: 12, gap: 10 },
    calloutHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    annotationTitle: { flex: 1, fontFamily: theme.fontFamily.serifItalic, fontSize: 19, lineHeight: 27 },
    retain: { backgroundColor: brand.goldWash },
    trap: { backgroundColor: brand.burgundyWash },
    example: { backgroundColor: brand.sheet, paddingVertical: 12, paddingLeft: 20, paddingRight: 12, gap: 10 },
    exampleHead: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
    exampleTitle: { flex: 1, color: brand.inkSoft, fontFamily: theme.fontFamily.serifItalic, fontSize: 19, lineHeight: 27 },
    exampleText: { color: brand.inkSoft },
    list: { gap: 8 },
    listRow: { flexDirection: 'row', gap: 10 },
    bullet: { width: 18, textAlign: 'right', fontFamily: theme.fontFamily.bold },
    listText: { flex: 1 },
    tableWrap: { alignSelf: 'stretch' },
    tableHint: { color: brand.inkSoft, marginBottom: 8 },
    tableScroll: { width: '100%' },
    table: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.lineStrong, overflow: 'hidden', backgroundColor: brand.sheet },
    tr: { flexDirection: 'row' },
    th: { backgroundColor: brand.paperDim },
    trAlt: { backgroundColor: studySurface.tableAlternate },
    td: { padding: 12, color: brand.ink, flexShrink: 0 },
    tdFirst: { fontFamily: theme.fontFamily.semiBold },
    thText: { color: brand.inkSoft, fontSize: 13 },
    formula: { alignItems: 'center', paddingVertical: 18, paddingHorizontal: 14, borderRadius: 18, backgroundColor: brand.sheet, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.lineStrong, gap: 6, ...theme.shadows.soft },
    formulaText: { fontFamily: theme.fontFamily.serif, fontVariant: ['lining-nums'], fontSize: 20, lineHeight: 28, color: brand.ink, textAlign: 'center' },
    formulaLegend: { color: brand.inkSoft, textAlign: 'center' },
    mini: { padding: 16, borderRadius: 20, borderWidth: 1.2, borderColor: theme.brand.actionBorder, backgroundColor: brand.sheet, gap: 12, ...theme.shadows.soft },
    miniBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, minHeight: 24, justifyContent: 'center', borderRadius: 12, backgroundColor: brand.burgundySolid },
    miniBadgeText: { color: brand.onInk, fontSize: 10 },
    miniTitle: { color: brand.ink },
    miniExpl: { color: brand.ink },
    miniBtn: { minHeight: 48 },
    recap: { padding: 20, borderRadius: 22, backgroundColor: brand.night, gap: 12, ...theme.shadows.lg },
    recapTitle: { color: brand.goldLight },
    recapRow: { flexDirection: 'row', gap: 12 },
    recapNum: { width: 22, color: brand.goldLight, fontFamily: theme.fontFamily.bold, fontSize: 15, lineHeight: 24 },
    recapText: { flex: 1, color: brand.onInk },
  });
  return { styles };
});
