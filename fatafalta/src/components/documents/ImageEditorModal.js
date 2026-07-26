import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  Crop as CropIcon,
  Check,
  X,
  RotateCcw as ResetIcon,
} from 'lucide-react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import Text from '../ui/Text';
import theme from '../../theme/tokens';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MIN_CROP_SIZE = 60;

const ImageEditorModal = ({ visible, imageUri, onCancel, onSave }) => {
  const [currentUri, setCurrentUri] = useState(imageUri);
  const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 });
  const [displaySize, setDisplaySize] = useState({ width: SCREEN_WIDTH, height: SCREEN_WIDTH });
  const [containerLayout, setContainerLayout] = useState({ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.3 });
  const [cropMode, setCropMode] = useState(false);
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 200, height: 200 });
  const [busy, setBusy] = useState(false);

  const cropBoxRef = useRef(cropBox);
  cropBoxRef.current = cropBox;
  const dragStartRef = useRef(cropBox);

  // Réinitialise l'état à chaque nouvelle image ouverte
  useEffect(() => {
    if (visible) {
      setCurrentUri(imageUri);
      setCropMode(false);
      setBusy(false);
    }
  }, [visible, imageUri]);

  // Recalcule la taille d'affichage (mode "contain") + la boîte de recadrage par défaut
  useEffect(() => {
    if (!currentUri) return;
    Image.getSize(
      currentUri,
      (w, h) => {
        setNaturalSize({ width: w, height: h });
        const ratio = Math.min(containerLayout.width / w, containerLayout.height / h);
        const dispW = w * ratio;
        const dispH = h * ratio;
        setDisplaySize({ width: dispW, height: dispH });
        const boxSize = Math.min(dispW, dispH) * 0.7;
        setCropBox({
          x: (dispW - boxSize) / 2,
          y: (dispH - boxSize) / 2,
          width: boxSize,
          height: boxSize,
        });
      },
      () => {}
    );
  }, [currentUri, containerLayout]);

  const clampCropBox = (box) => {
    let { x, y, width, height } = box;
    width = Math.max(MIN_CROP_SIZE, Math.min(width, displaySize.width));
    height = Math.max(MIN_CROP_SIZE, Math.min(height, displaySize.height));
    x = Math.max(0, Math.min(x, displaySize.width - width));
    y = Math.max(0, Math.min(y, displaySize.height - height));
    return { x, y, width, height };
  };

  // Déplacer la boîte de recadrage
  const movePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartRef.current = cropBoxRef.current;
      },
      onPanResponderMove: (_, gesture) => {
        const start = dragStartRef.current;
        setCropBox(clampCropBox({ ...start, x: start.x + gesture.dx, y: start.y + gesture.dy }));
      },
    })
  ).current;

  // Redimensionner depuis le coin bas-droit
  const resizePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartRef.current = cropBoxRef.current;
      },
      onPanResponderMove: (_, gesture) => {
        const start = dragStartRef.current;
        setCropBox(
          clampCropBox({
            ...start,
            width: start.width + gesture.dx,
            height: start.height + gesture.dy,
          })
        );
      },
    })
  ).current;

  const rotate = async (degrees) => {
    setBusy(true);
    try {
      const result = await ImageManipulator.manipulateAsync(
        currentUri,
        [{ rotate: degrees }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );
      setCurrentUri(result.uri);
    } catch (e) {
      console.warn('Rotation échouée', e);
      Alert.alert('Erreur', "Impossible de faire pivoter l'image");
    } finally {
      setBusy(false);
    }
  };

  const flipHorizontal = async () => {
    setBusy(true);
    try {
      const result = await ImageManipulator.manipulateAsync(
        currentUri,
        [{ flip: ImageManipulator.FlipType.Horizontal }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );
      setCurrentUri(result.uri);
    } catch (e) {
      console.warn('Miroir échoué', e);
      Alert.alert('Erreur', "Impossible d'appliquer le miroir");
    } finally {
      setBusy(false);
    }
  };

  const applyCrop = async () => {
    setBusy(true);
    try {
      const scaleX = naturalSize.width / displaySize.width;
      const scaleY = naturalSize.height / displaySize.height;
      const cropData = {
        originX: Math.round(cropBox.x * scaleX),
        originY: Math.round(cropBox.y * scaleY),
        width: Math.round(cropBox.width * scaleX),
        height: Math.round(cropBox.height * scaleY),
      };
      const result = await ImageManipulator.manipulateAsync(
        currentUri,
        [{ crop: cropData }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );
      setCurrentUri(result.uri);
      setCropMode(false);
    } catch (e) {
      console.warn('Recadrage échoué', e);
      Alert.alert('Erreur', "Impossible de recadrer l'image");
    } finally {
      setBusy(false);
    }
  };

  const resetImage = () => {
    setCurrentUri(imageUri);
    setCropMode(false);
  };

  if (!imageUri) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerButton} disabled={busy}>
            <X size={24} color={theme.colors.textInverse} />
          </TouchableOpacity>
          <Text variant="h3" color={theme.colors.textInverse}>Modifier l'image</Text>
          <TouchableOpacity
            onPress={() => onSave(currentUri)}
            style={styles.headerButton}
            disabled={busy}
          >
            <Check size={24} color={theme.colors.textInverse} />
          </TouchableOpacity>
        </View>

        {/* Zone d'édition */}
        <View
          style={styles.editorArea}
          onLayout={(e) => setContainerLayout(e.nativeEvent.layout)}
        >
          <View style={{ width: displaySize.width, height: displaySize.height }}>
            <Image
              source={{ uri: currentUri }}
              style={{ width: displaySize.width, height: displaySize.height }}
              resizeMode="contain"
            />

            {cropMode && (
              <>
                {/* Masque assombri autour de la boîte de recadrage */}
                <View style={[styles.mask, { top: 0, left: 0, right: 0, height: cropBox.y }]} />
                <View
                  style={[
                    styles.mask,
                    { top: cropBox.y, left: 0, width: cropBox.x, height: cropBox.height },
                  ]}
                />
                <View
                  style={[
                    styles.mask,
                    {
                      top: cropBox.y,
                      left: cropBox.x + cropBox.width,
                      right: 0,
                      height: cropBox.height,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.mask,
                    { top: cropBox.y + cropBox.height, left: 0, right: 0, bottom: 0 },
                  ]}
                />

                {/* Boîte de recadrage déplaçable */}
                <View
                  {...movePanResponder.panHandlers}
                  style={[
                    styles.cropBox,
                    { left: cropBox.x, top: cropBox.y, width: cropBox.width, height: cropBox.height },
                  ]}
                >
                  {/* Poignée de redimensionnement */}
                  <View {...resizePanResponder.panHandlers} style={styles.resizeHandle} />
                </View>
              </>
            )}
          </View>
        </View>

        {/* Barre d'outils */}
        <View style={styles.toolbar}>
          {cropMode ? (
            <>
              <TouchableOpacity style={styles.toolButton} onPress={() => setCropMode(false)} disabled={busy}>
                <X size={22} color={theme.colors.textInverse} />
                <Text variant="caption" color={theme.colors.textInverse}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolButton} onPress={applyCrop} disabled={busy}>
                <Check size={22} color={theme.colors.primary} />
                <Text variant="caption" color={theme.colors.primary}>Valider</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.toolButton} onPress={() => rotate(-90)} disabled={busy}>
                <RotateCcw size={22} color={theme.colors.textInverse} />
                <Text variant="caption" color={theme.colors.textInverse}>Pivoter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolButton} onPress={() => rotate(90)} disabled={busy}>
                <RotateCw size={22} color={theme.colors.textInverse} />
                <Text variant="caption" color={theme.colors.textInverse}>Pivoter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolButton} onPress={flipHorizontal} disabled={busy}>
                <FlipHorizontal size={22} color={theme.colors.textInverse} />
                <Text variant="caption" color={theme.colors.textInverse}>Miroir</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolButton} onPress={() => setCropMode(true)} disabled={busy}>
                <CropIcon size={22} color={theme.colors.textInverse} />
                <Text variant="caption" color={theme.colors.textInverse}>Recadrer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolButton} onPress={resetImage} disabled={busy}>
                <ResetIcon size={22} color={theme.colors.textInverse} />
                <Text variant="caption" color={theme.colors.textInverse}>Réinitialiser</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: { padding: 8 },
  editorArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mask: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  cropBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#fff',
  },
  resizeHandle: {
    position: 'absolute',
    right: -14,
    bottom: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  toolButton: { alignItems: 'center', gap: 4, padding: 6 },
});

export default ImageEditorModal;