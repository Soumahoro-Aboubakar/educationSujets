import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight } from 'lucide-react-native';
import Text from '../ui/Text';
import theme from '../../theme/tokens';

const { brand } = theme;

/** Corps défilant commun aux écrans du compte, avec « tirer pour actualiser ». */
export const AccountScroll = ({ children, refreshing = false, onRefresh, bottomInset = 0 }) => {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) + theme.spacing.xl + bottomInset }]}
      showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? (
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.ink} colors={[brand.ink]} />
      ) : undefined}
    >
      {children}
    </ScrollView>
  );
};

/** Groupe de lignes sous un intitulé discret. */
export const Section = ({ title, action, children, style }) => (
  <View style={[styles.section, style]}>
    {title || action ? (
      <View style={styles.sectionHeader}>
        {title ? <Text variant="overline" style={styles.sectionTitle}>{title}</Text> : <View />}
        {action}
      </View>
    ) : null}
    <View style={styles.card}>{children}</View>
  </View>
);

/** Ligne d'information ou de navigation dans une section. */
export const Row = ({ icon: Icon, label, hint, value, trailing, onPress, isLast, danger }) => {
  const content = (
    <View style={[styles.row, isLast && styles.rowLast]}>
      {Icon ? (
        <View style={styles.rowIcon}>
          <Icon size={18} color={danger ? brand.burgundy : brand.ink} strokeWidth={1.8} />
        </View>
      ) : null}
      <View style={styles.rowCopy}>
        <Text variant="bodyMedium" style={[styles.rowLabel, danger && styles.danger]} numberOfLines={1}>{label}</Text>
        {hint ? <Text variant="caption" style={styles.rowHint} numberOfLines={2}>{hint}</Text> : null}
      </View>
      {value !== undefined && value !== null ? (
        <Text variant="bodyMedium" style={styles.rowValue} numberOfLines={1}>{value}</Text>
      ) : null}
      {trailing}
      {onPress && !danger ? <ChevronRight size={17} color={brand.inkMuted} strokeWidth={2} /> : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[label, value, hint].filter(Boolean).join(', ')}
      onPress={onPress}
      android_ripple={{ color: brand.pressed }}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
  );
};

/**
 * Chiffre clé : un seul par écran en grand (dans l'en-tête sombre), les autres en compact.
 */
export const Metric = ({ label, value, compact }) => (
  <View style={compact ? styles.metricCompact : styles.metric}>
    <Text variant="caption" style={compact ? styles.metricLabel : styles.metricLabelOnDark}>{label}</Text>
    <Text style={compact ? styles.metricValueCompact : styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: theme.layout.gutter,
    paddingTop: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    color: brand.inkSoft,
  },
  card: {
    overflow: 'hidden',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: brand.line,
  },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginHorizontal: theme.spacing.base,
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
    maxWidth: '45%',
    color: brand.ink,
    fontSize: 14,
  },
  danger: {
    color: brand.burgundy,
  },
  pressed: {
    backgroundColor: brand.pressed,
  },
  metric: {
    paddingVertical: theme.spacing.xs,
  },
  metricCompact: {
    flex: 1,
    padding: theme.spacing.base,
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
    fontFamily: theme.fontFamily.extraBold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1,
  },
  metricValueCompact: {
    marginTop: 2,
    color: brand.ink,
    fontFamily: theme.fontFamily.bold,
    fontSize: 17,
    lineHeight: 22,
  },
});
