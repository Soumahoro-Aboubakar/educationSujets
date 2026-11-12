import Pressable from './FeedbackPressable';
import StudyLamp from '../../theme/StudyLamp';
import { useTheme, createThemedStyles } from '../../theme/ThemeProvider';
import React from 'react';
import { Modal, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '../../prep/feedback';

/**
 * Feuille modale ancrée en bas de l'écran. Un appui sur le fond ou le geste retour la ferme.
 * Utilisée pour les décisions courtes (accès, confirmation) qui ne méritent pas un écran.
 */
const Sheet = ({ visible, onClose, children }) => {
  const { theme } = useTheme();
  const { styles } = useStyles();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduce = useReduceMotion();

  return (
    <Modal visible={visible} transparent animationType={reduce ? 'fade' : 'slide'} statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable accessibilityLabel="Fermer" style={StyleSheet.absoluteFill} onPress={onClose}>
          <View style={styles.backdrop} />
        </Pressable>
        <View accessibilityViewIsModal style={[styles.sheet, { maxHeight: height - insets.top - 16, paddingBottom: Math.max(insets.bottom, theme.spacing.base) + theme.spacing.sm }]}>
          <StudyLamp />
          <View style={styles.handle} />
          <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 8 }}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default Sheet;

const useStyles = createThemedStyles(({ brand, theme }) => {
  const styles = StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      flex: 1,
      backgroundColor: brand.backdrop,
    },
    sheet: {
      ...theme.layout.readingFrame,
      paddingHorizontal: theme.layout.gutter,
      paddingTop: theme.spacing.sm,
      backgroundColor: brand.paper,
      borderTopLeftRadius: theme.radius['2xl'],
      borderTopRightRadius: theme.radius['2xl'],
    },
    handle: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      marginBottom: theme.spacing.lg,
      borderRadius: 2,
      backgroundColor: brand.lineStrong,
    },
  });
  return { styles };
});
