import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../../theme/tokens';

const { brand } = theme;

/**
 * Feuille modale ancrée en bas de l'écran. Un appui sur le fond ou le geste retour la ferme.
 * Utilisée pour les décisions courtes (accès, confirmation) qui ne méritent pas un écran.
 */
const Sheet = ({ visible, onClose, children }) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable accessibilityLabel="Fermer" style={StyleSheet.absoluteFill} onPress={onClose}>
          <View style={styles.backdrop} />
        </Pressable>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, theme.spacing.base) + theme.spacing.sm }]}>
          <View style={styles.handle} />
          {children}
        </View>
      </View>
    </Modal>
  );
};

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

export default Sheet;
