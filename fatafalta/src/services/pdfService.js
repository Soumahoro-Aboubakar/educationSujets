import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'react-native';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { decode } from 'base64-arraybuffer';

const FATAFALTA_DIR = FileSystem.documentDirectory + 'fatafalta/';
const MAX_DIMENSION = 2000; // px — au-delà, on redimensionne
const JPEG_QUALITY = 0.82;
const CONCURRENCY = 3; // images traitées en parallèle

const initDirectory = async () => {
  try {
    await FileSystem.makeDirectoryAsync(FATAFALTA_DIR, { intermediates: true });
  } catch (e) {
    // Le dossier existe probablement déjà
  }
};

const withTimeout = async (promise, timeoutMs, errorMessage) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

// Récupère les dimensions réelles de l'image (rapide, pas de ré-encodage)
const getImageSize = (uri) =>
  withTimeout(
    new Promise((resolve, reject) => {
      Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
    }),
    8000,
    'Lecture des dimensions de l’image trop longue'
  );

// Limiteur de concurrence : traite plusieurs images en parallèle sans tout saturer
const mapWithConcurrency = async (items, limit, worker) => {
  const results = new Array(items.length);
  let index = 0;

  const runners = new Array(Math.min(limit, items.length)).fill(null).map(async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current], current);
    }
  });

  await Promise.all(runners);
  return results;
};

// Prépare une image : redimensionne uniquement si nécessaire, encode en JPEG (plus rapide/léger que PNG)
const prepareImage = async (uri) => {
  let width, height;
  try {
    ({ width, height } = await getImageSize(uri));
  } catch (e) {
    width = undefined;
    height = undefined;
  }

  const needsResize = width && height && Math.max(width, height) > MAX_DIMENSION;

  const actions = [];
  if (needsResize) {
    const isLandscape = width >= height;
    actions.push({
      resize: isLandscape ? { width: MAX_DIMENSION } : { height: MAX_DIMENSION },
    });
  }

  const result = await withTimeout(
    ImageManipulator.manipulateAsync(uri, actions, {
      compress: JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }),
    15000,
    "Traitement de l'image trop long"
  );

  if (!result.base64) {
    throw new Error("Impossible de convertir l'image");
  }

  return {
    bytes: decode(result.base64),
    width: result.width,
    height: result.height,
  };
};

const applyWatermark = (page) => {
  const { width, height } = page.getSize();
  page.drawText('fatafalta', {
    x: width / 2 - 50,
    y: height / 2,
    size: 60,
    color: rgb(0.8, 0.8, 0.8),
    opacity: 0.3,
    rotate: degrees(-45),
  });
};

export const generatePdfFromImages = async (imageUris, onProgress) => {
  await initDirectory();

  if (!imageUris || imageUris.length === 0) {
    throw new Error('Aucune image fournie');
  }

  let prepared = 0;

  // Étape 1 : redimensionnement + encodage en parallèle (borné) — c'est ici qu'on gagne le plus de temps
  const results = await mapWithConcurrency(imageUris, CONCURRENCY, async (uri) => {
    try {
      const data = await prepareImage(uri);
      prepared += 1;
      if (onProgress) onProgress(Math.round((prepared / imageUris.length) * 70)); // 0-70%
      return data;
    } catch (e) {
      console.warn('Échec de traitement d’une image:', e);
      prepared += 1;
      if (onProgress) onProgress(Math.round((prepared / imageUris.length) * 70));
      return null;
    }
  });

  // Étape 2 : insertion dans le PDF — pdf-lib travaille sur un seul document, donc séquentiel,
  // mais c'est désormais l'étape la moins coûteuse puisque les images sont déjà allégées
  const pdfDoc = await PDFDocument.create();
  let embedded = 0;

  for (const result of results) {
    if (!result) continue;

    let image;
    try {
      image = await withTimeout(pdfDoc.embedJpg(result.bytes), 10000, 'Embedding JPG took too long');
    } catch (e) {
      console.warn("Échec d'insertion d'une image dans le PDF:", e);
      continue;
    }

    const { width, height } = image.scale(1);
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
    applyWatermark(page);

    embedded += 1;
    if (onProgress) onProgress(70 + Math.round((embedded / imageUris.length) * 25)); // 70-95%
  }

  if (embedded === 0) {
    throw new Error('Aucune image prise en charge trouvée. Veuillez utiliser un format image valide.');
  }

  const pdfBytes = await withTimeout(pdfDoc.saveAsBase64(), 30000, 'Sauvegarde du PDF trop longue');
  const outputFileName = `fatafalta_doc_${Date.now()}.pdf`;
  const outputUri = FATAFALTA_DIR + outputFileName;

  await withTimeout(
    FileSystem.writeAsStringAsync(outputUri, pdfBytes, { encoding: FileSystem.EncodingType.Base64 }),
    20000,
    'Écriture du PDF trop longue'
  );

  if (onProgress) onProgress(100);

  return {
    uri: outputUri,
    name: outputFileName,
    mimeType: 'application/pdf',
  };
};