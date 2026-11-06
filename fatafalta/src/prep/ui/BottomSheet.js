import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../../components/ui/Text';
import { brand, motion, theme } from '../theme';
import { useReduceMotion } from '../feedback';
import { PrepButton } from './primitives';

/**
 * Feuille modale (maquettes partie B) : rayon haut 24, fond papier, poignée, voile `backdrop`.
 * Montée en ressort amorti (~300 ms). Glisser vers le bas ferme la feuille, sauf si
 * `onDismissRequest` renvoie false (ex. mini-cours : confirmation « Passer la seconde chance ? »).
 */
const BottomSheet = ({ visible, onClose, onDismissRequest, children, maxHeight = 0.85, dismissible = true, scroll = true, footer }) => {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(height);
  const fade = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      y.value = height;
      fade.value = withTiming(1, { duration: 220 });
      y.value = reduce ? withTiming(0, { duration: 150 }) : withSpring(0, motion.sheet);
    } else if (mounted) {
      fade.value = withTiming(0, { duration: 180 });
      y.value = withTiming(height, { duration: 220, easing: Easing.in(Easing.quad) }, (done) => { if (done) scheduleOnRN(setMounted, false); });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const requestClose = () => {
    if (!dismissible) return;
    if (onDismissRequest && onDismissRequest() === false) {
      y.value = withSpring(0, motion.sheet);
      return;
    }
    onClose?.();
  };

  const pan = useMemo(() => Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => { y.value = Math.max(0, e.translationY); })
    .onEnd((e) => {
      if (e.translationY > 110 || e.velocityY > 900) scheduleOnRN(requestClose);
      else y.value = withSpring(0, motion.sheet);
    }), [dismissible, onDismissRequest, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  if (!mounted) return null;
  const Body = scroll ? ScrollView : View;

  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={requestClose}>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable accessibilityLabel="Fermer" style={StyleSheet.absoluteFill} onPress={requestClose} />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav} pointerEvents="box-none">
          <Animated.View style={[styles.sheet, { maxHeight: height * maxHeight, paddingBottom: Math.max(insets.bottom, 16) + 8 }, sheetStyle]}>
            <GestureDetector gesture={pan}>
              <View style={styles.handleZone} accessibilityRole="adjustable" accessibilityLabel="Poignée de la feuille">
                <View style={styles.handle} />
              </View>
            </GestureDetector>
            <Body style={styles.body} contentContainerStyle={scroll ? styles.bodyContent : undefined} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {children}
            </Body>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
};

/** Dialogue centré (E26) : titre, texte, action principale et lien. */
export const Dialog = ({ visible, title, message, confirmLabel, cancelLabel, onConfirm, onCancel }) => (
  <Modal visible={visible} transparent statusBarTranslucent animationType="fade" onRequestClose={onCancel}>
    <View style={styles.dialogRoot}>
      <View style={styles.dialog} accessibilityViewIsModal>
        <Text variant="h3" style={styles.dialogTitle}>{title}</Text>
        {message ? <Text variant="body" style={styles.dialogText}>{message}</Text> : null}
        <PrepButton title={cancelLabel} onPress={onCancel} style={styles.dialogPrimary} />
        <PrepButton title={confirmLabel} variant="link" onPress={onConfirm} style={styles.dialogLink} />
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: brand.backdrop },
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: brand.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: brand.ink,
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  handleZone: { alignItems: 'center', paddingTop: 10, paddingBottom: 12 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: brand.lineStrong },
  body: { flexGrow: 0 },
  bodyContent: { paddingHorizontal: theme.layout.gutter, paddingBottom: 12 },
  footer: { paddingHorizontal: theme.layout.gutter, paddingTop: 8 },
  dialogRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.backdrop, padding: 24 },
  dialog: { width: '100%', maxWidth: 400, backgroundColor: brand.paper, borderRadius: 20, padding: 24 },
  dialogTitle: { color: brand.ink },
  dialogText: { marginTop: 8, color: brand.inkSoft },
  dialogPrimary: { marginTop: 20 },
  dialogLink: { marginTop: 4 },
});

export default BottomSheet;
