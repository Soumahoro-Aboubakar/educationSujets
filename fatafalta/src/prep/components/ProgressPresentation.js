import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Text from '../../components/ui/Text';
import { ordinal } from '../../utils/ordinal';
import core from '../shared/prepCore';
import { type } from '../theme';
import { PressScale } from '../ui/primitives';

const nf = (n) => Number(n || 0).toLocaleString('fr-FR');
const TABS = [['progression', 'Progression'], ['matieres', 'Matières'], ['activite', 'Activité']];

// Les libellés restent entiers quand la taille du texte augmente.
export const ProgressTabs = ({ value, onChange }) => {
  const { s } = useStyles();
  return (<View style={s.tabs} accessibilityRole="tablist">
    {TABS.map(([key, label]) => (
      <PressScale key={key} accessibilityRole="tab" accessibilityState={{ selected: key === value }}
        hapticOnPress onPress={() => onChange(key)} scaleTo={1} style={[s.tab, key === value && s.tabOn]}>
        <Text variant="caption" style={[s.tabText, key === value && s.tabTextOn]}>{label}</Text>
      </PressScale>
    ))}
  </View>);
};

export const ProgressScoreboard = ({ stats, serie }) => {
  const { s } = useStyles();
  const { width, fontScale } = useWindowDimensions();
  const wrap = width < 350 || fontScale >= 1.3;
  const items = [
    [nf(stats.questions), 'questions'],
    [stats.reussies == null ? '—' : nf(stats.reussies), 'réussies', `Réussies du ${ordinal(1)} coup`],
    [`${Math.round((stats.reussite || 0) * 100)} %`, `réussite au ${ordinal(1)} coup`],
    [nf(serie), `jour${serie > 1 ? 's' : ''} de série`],
  ];
  return (
    <View style={s.board}>
      {items.map(([value, label, spoken], i) => (
        <View key={label} style={[s.stat, wrap && s.statWrap, i > 0 && !(wrap && i === 2) && s.divider]}
          accessible accessibilityLabel={`${spoken || label} : ${value}`}>
          <Text style={[type.numeral, s.number]}>{value}</Text>
          <Text variant="caption" style={s.statLabel}>{label}</Text>
        </View>
      ))}
    </View>
  );
};

// Présentation des minutes déjà disponibles dans l'onglet Activité, sans état ni animation.
export const WeekActivity = ({ etat, today }) => {
  const { brand } = useTheme();
  const { s } = useStyles();
  const { fontScale } = useWindowDimensions();
  const days = Array.from({ length: 7 }, (_, i) => core.addDays(today, i - 6));
  const minutes = days.map((day) => etat.minutesParJour?.[day] || 0);
  const max = Math.max(1, ...minutes);
  const total = minutes.reduce((a, b) => a + b, 0);
  const active = minutes.filter((v) => v > 0).length;
  return (
    <View style={s.week}>
      <View style={s.heading}>
        <Text variant="h2" accessibilityRole="header" style={s.weekTitle}>Ces 7 derniers jours</Text>
        <Text variant="caption" style={[s.total, type.tabular]}>{`${nf(Math.round(total))} min`}</Text>
      </View>
      <Text variant="caption" style={s.muted}>{active ? `${active} jour${active > 1 ? 's' : ''} d’étude · chaque séance compte.` : 'Tes prochaines séances dessineront ton rythme ici.'}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={[s.bars, { minWidth: '100%' }]} accessibilityHint="Fais défiler horizontalement pour lire les sept jours">
        {days.map((day, i) => {
          const date = new Date(`${day}T12:00:00Z`);
          return (
            <View key={day} style={[s.day, { minWidth: Math.ceil(42 * fontScale) }]} accessible
              accessibilityLabel={`${date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} : ${nf(Math.round(minutes[i]))} minutes`}>
              <Text variant="caption" style={[s.minute, type.tabular]}>{nf(Math.round(minutes[i]))}</Text>
              <View style={s.barTrack}>
                <View style={[s.bar, { height: minutes[i] ? Math.max(4, minutes[i] / max * 52) : 1, backgroundColor: minutes[i] ? (i === 6 ? brand.burgundy : brand.inkGlow) : brand.inkSoft }]} />
              </View>
              <Text variant="caption" style={[s.date, type.tabular]}>{`${day.slice(8)}/${day.slice(5, 7)}`}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const useStyles = createThemedStyles(({ brand, theme }) => {
  const s = StyleSheet.create({
    muted: { color: brand.inkSoft },
    tabs: { flexDirection: 'row', flexWrap: 'wrap', padding: 4, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: brand.line, backgroundColor: brand.sheet, gap: 2 },
    tab: { flexGrow: 1, flexBasis: 90, minHeight: 44, justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 10, borderRadius: 11 },
    tabOn: { backgroundColor: brand.burgundySolid },
    tabText: { color: brand.inkSoft, fontFamily: theme.fontFamily.semiBold, textAlign: 'center' },
    tabTextOn: { color: brand.onInk },
    board: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 20, paddingVertical: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.line },
    stat: { flex: 1, alignItems: 'center', gap: 5, paddingHorizontal: 5 },
    statWrap: { flexBasis: '50%', flexGrow: 0 },
    divider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: brand.line },
    number: { color: brand.ink, fontSize: 24, lineHeight: 32, textAlign: 'center' },
    statLabel: { color: brand.inkSoft, fontSize: 12, lineHeight: 17, textAlign: 'center' },
    week: { paddingTop: 20, paddingBottom: 16, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.line },
    heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 12, rowGap: 4 },
    weekTitle: { flexGrow: 1, color: brand.ink, fontSize: 22, lineHeight: 30 },
    total: { color: brand.burgundy, fontFamily: theme.fontFamily.semiBold },
    bars: { flexDirection: 'row', gap: 6, paddingTop: 12 },
    day: { flex: 1, minWidth: 0, alignItems: 'center', gap: 6 },
    minute: { color: brand.inkSoft, fontSize: 12, lineHeight: 17, textAlign: 'center' },
    barTrack: { height: 56, justifyContent: 'flex-end', alignSelf: 'stretch', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: brand.line },
    bar: { width: '52%', maxWidth: 24, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
    date: { color: brand.inkSoft, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  });
  return { s };
});
