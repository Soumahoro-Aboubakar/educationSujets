import Pressable from '../ui/FeedbackPressable';
import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight } from 'lucide-react-native';
import Text from '../ui/Text';

import { CopyMargin } from '../../prep/components/StudyPresentation';

/** Corps défilant commun aux écrans du compte, avec « tirer pour actualiser ». */
export const AccountScroll = ({ children, refreshing = false, onRefresh, bottomInset = 0, tabbed = false }) => {
  const { theme, brand } = useTheme();
  const { styles } = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      // Base 0 : la liste prend la place restante sans comprimer l'en-tête (sinon le titre passe sous la feuille).
      style={styles.scrollView}
      contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) + theme.spacing.xl + bottomInset + (tabbed ? 100 : 0) }]}
      showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? (
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.ink} colors={[brand.ink]} />
      ) : undefined}
    >
      <CopyMargin style={{ left: 10 }} />
      {children}
    </ScrollView>
  );
};

/** Groupe de lignes sous un intitulé discret. */
export const Section = ({ title, action, children, style }) => {
  const { styles } = useStyles();
  return (<View style={[styles.section, style]}>
    {title || action ? (
      <View style={styles.sectionHeader}>
        {title ? <Text variant="h2" accessibilityRole="header" style={styles.sectionTitle}>{title}</Text> : <View />}
        {action}
      </View>
    ) : null}
    <View style={styles.card}>{children}</View>
  </View>);
};

/** Ligne d'information ou de navigation dans une section. */
export const Row = ({ icon: Icon, label, hint, value, trailing, onPress, isLast, danger, loading, disabled }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  const content = (pending = false) => (
    <View style={[styles.row, isLast && styles.rowLast]}>
      {Icon ? (
        <View style={styles.rowIcon}>
          <Icon size={18} color={danger ? brand.burgundy : brand.ink} strokeWidth={2} />
        </View>
      ) : null}
      <View style={styles.rowCopy}>
        <Text variant="bodyMedium" style={[styles.rowLabel, danger && styles.danger]}>{label}</Text>
        {hint ? <Text variant="caption" style={styles.rowHint}>{hint}</Text> : null}
      </View>
      {value !== undefined && value !== null ? (
        <Text variant="bodyMedium" style={styles.rowValue}>{value}</Text>
      ) : null}
      {trailing}
      {onPress ? (
        <View style={styles.chevron}>{pending ? <ActivityIndicator size="small" color={brand.burgundy} /> : <ChevronRight size={15} color={brand.burgundy} strokeWidth={2.2} />}</View>
      ) : null}
    </View>
  );

  if (!onPress) return content();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[label, value, hint].filter(Boolean).join(', ')}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      android_ripple={{ color: brand.pressed }}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {({ pending }) => content(pending)}
    </Pressable>
  );
};

/**
 * Chiffre clé : un seul par écran en grand, les autres en compact.
 */
export const Metric = ({ label, value, compact, paper = false }) => {
  const { brand } = useTheme();
  const { styles } = useStyles();
  return (<View style={compact ? styles.metricCompact : styles.metric}>
    <Text variant="caption" style={compact || paper ? styles.metricLabel : styles.metricLabelOnDark}>{label}</Text>
    <Text style={[compact ? styles.metricValueCompact : styles.metricValue, paper && { color: brand.ink }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
  </View>);
};

const useStyles = createThemedStyles(({ theme, brand }) => {
  const styles = StyleSheet.create({
    scrollView: { flex: 1 },
    scroll: {
      paddingHorizontal: 28,
      paddingTop: theme.spacing.lg,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      flexWrap: 'wrap', gap: 10,
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm,
    },
    sectionTitle: {
      color: brand.ink,
      fontFamily: theme.fontFamily.serif,
    },
    card: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: brand.line,
    },
    row: {
      minHeight: 60,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 10,
      marginHorizontal: 0,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: brand.line,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowIcon: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.sm,
      backgroundColor: brand.paperDim,
    },
    rowCopy: {
      flex: 1,
      minWidth: 110,
    },
    rowLabel: {
      color: brand.ink,
      fontSize: 15,
    },
    rowHint: {
      marginTop: 1,
      color: brand.inkSoft,
      fontFamily: theme.fontFamily.regular,
      fontSize: 13,
    },
    rowValue: {
      maxWidth: '100%',
      flexShrink: 1,
      color: brand.ink,
      fontSize: 14,
    },
    danger: {
      color: brand.burgundy,
    },
    chevron: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: brand.burgundyWash,
    },
    pressed: {
      backgroundColor: brand.pressed,
    },
    metric: {
      paddingTop: 4,
      paddingBottom: 24,
    },
    metricCompact: {
      flex: 1,
      paddingVertical: 16,
      paddingHorizontal: 8,
      minWidth: 110,
    },
    metricLabel: {
      color: brand.inkSoft,
      fontFamily: theme.fontFamily.regular,
    },
    metricLabelOnDark: {
      color: brand.onInkSoft,
      fontFamily: theme.fontFamily.regular,
    },
    metricValue: {
      marginTop: 2,
      color: brand.onInk,
      fontFamily: theme.fontFamily.serif,
      fontVariant: ['lining-nums', 'tabular-nums'],
      fontSize: 34,
      lineHeight: 40,
      letterSpacing: -1,
    },
    metricValueCompact: {
      marginTop: 2,
      color: brand.ink,
      fontFamily: theme.fontFamily.serif,
      fontVariant: ['lining-nums', 'tabular-nums'],
      fontSize: 24,
      lineHeight: 32,
    },
  });
  return { styles };
});
