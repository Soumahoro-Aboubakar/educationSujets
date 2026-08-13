import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'react-native';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { decode } from 'base64-arraybuffer';

const FATAFALTA_DIR = FileSystem.documentDirectory + 'fatafalta/';
// Seuil relevé : les photos de smartphones modernes font couramment 4000px+
// sur le plus grand côté. Un seuil trop bas forçait un redimensionnement
// quasi systématique et donc une perte de netteté sur (presque) toutes les images.
const MAX_DIMENSION = 6000; // px — au-delà seulement, on redimensionne
const JPEG_QUALITY = 0.98;
const CONCURRENCY = 3; // images traitées en parallèle
// DPI cible pour la mise en page du PDF : évite des pages "1 pixel = 1 point"
// (72 DPI) qui donnent une impression de flou à l'impression/zoom, alors que
// les pixels de l'image sont pourtant intacts.
const TARGET_DPI = 200;
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

const getA4PageSizeForImage = (width, height) => (
  width > height
    ? { width: A4_HEIGHT, height: A4_WIDTH }
    : { width: A4_WIDTH, height: A4_HEIGHT }
);

const getContainedImageLayout = (imageWidth, imageHeight, pageWidth, pageHeight) => {
  const scale = Math.min(pageWidth / imageWidth, pageHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;

  return {
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  };
};

// Taille maximale acceptée pour un PDF importé depuis l'appareil.
// Au-delà, le chargement base64 + le parsing pdf-lib consomment trop de
// mémoire pour Expo Go (et pour beaucoup d'appareils bas/moyen de gamme),
// ce qui provoque un crash natif (OOM) plutôt qu'une erreur JS propre.
export const MAX_IMPORTED_PDF_SIZE_BYTES = 25 * 1024 * 1024; // 25 Mo

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

// Détecte le format réel d'une image à partir de ses octets magiques
// (plus fiable que l'extension de l'URI, qui peut être absente/trompeuse
// notamment sur les URIs de type content:// ou ph://).
const detectImageFormat = (bytes) => {
  const view = new Uint8Array(bytes);
  if (view.length >= 3 && view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff) {
    return 'jpg';
  }
  if (
    view.length >= 8 &&
    view[0] === 0x89 &&
    view[1] === 0x50 &&
    view[2] === 0x4e &&
    view[3] === 0x47
  ) {
    return 'png';
  }
  return null; // format non reconnu directement -> il faudra passer par manipulateAsync
};

// Prépare une image :
// - si elle est déjà dans les dimensions cibles ET dans un format supporté
//   nativement (JPEG/PNG), on la lit telle quelle SANS réencodage, pour ne
//   perdre aucune qualité.
// - sinon (trop grande, ou format non reconnu type HEIC/WEBP), on passe par
//   ImageManipulator pour redimensionner et/ou convertir en JPEG.
const prepareImage = async (uri) => {
  let width, height;
  try {
    ({ width, height } = await getImageSize(uri));
  } catch (e) {
    width = undefined;
    height = undefined;
  }

  const needsResize = width && height && Math.max(width, height) > MAX_DIMENSION;

  if (!needsResize) {
    try {
      const base64 = await withTimeout(
        FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 }),
        15000,
        "Lecture de l'image trop longue"
      );
      const bytes = decode(base64);
      const format = detectImageFormat(bytes);

      if (format) {
        // Image déjà dans un format exploitable et de taille correcte :
        // on la garde bit-à-bit, aucune perte supplémentaire.
        return { bytes, width, height, format };
      }
      // Format non reconnu (ex: HEIC/WEBP) -> on tombe dans le traitement
      // via manipulateAsync ci-dessous pour obtenir un JPEG valide.
    } catch (e) {
      // En cas d'échec de lecture brute, on retente via manipulateAsync
    }
  }

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
    format: 'jpg',
  };
};

const applyWatermark = (page) => {
  const { width, height } = page.getSize();
  const text = 'Fatafalta';
  // Taille proportionnelle à la largeur pour être toujours grand
  const size = width * 0.22;
  // Approximation de la largeur du texte (caractères moyens * taille)
  const textWidth = size * text.length * 0.55;

  // Angle de la diagonale
  const angle = Math.atan2(height, width) * (180 / Math.PI);

  page.drawText(text, {
    x: width / 2 - (textWidth / 2) * Math.cos(angle * Math.PI / 180),
    y: height / 2 - (textWidth / 2) * Math.sin(angle * Math.PI / 180),
    size: size,
    color: rgb(0.8, 0.8, 0.8),
    opacity: 0.35,
    rotate: degrees(angle),
  });
};

// Embarque l'image dans le PDF en respectant son format réel (JPEG ou PNG),
// au lieu de forcer systématiquement embedJpg.
const embedImage = async (pdfDoc, result) => {
  if (result.format === 'png') {
    return withTimeout(pdfDoc.embedPng(result.bytes), 10000, 'Embedding PNG took too long');
  }
  return withTimeout(pdfDoc.embedJpg(result.bytes), 10000, 'Embedding JPG took too long');
};

// Convertit des pixels en points PDF sur la base d'un DPI cible, pour avoir
// des pages à taille physique cohérente (ex: proche d'un A4 pour un scan de
// document) plutôt que des pages géantes calées 1 pixel = 1 point.
const pixelsToPoints = (pixels) => (pixels / TARGET_DPI) * 72;

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
      image = await embedImage(pdfDoc, result);
    } catch (e) {
      console.warn("Échec d'insertion d'une image dans le PDF:", e);
      continue;
    }

    const { width: imgWidth, height: imgHeight } = image.scale(1);
    const pageSize = getA4PageSizeForImage(imgWidth, imgHeight);
    const layout = getContainedImageLayout(imgWidth, imgHeight, pageSize.width, pageSize.height);

    const page = pdfDoc.addPage([pageSize.width, pageSize.height]);
    page.drawImage(image, layout);
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

// Vérifie la taille du fichier AVANT toute lecture/décodage lourd.
// C'est ce contrôle qui manquait : sans lui, un PDF de 50-100 Mo était
// chargé intégralement en base64 puis en ArrayBuffer puis parsé par
// pdf-lib, ce qui pouvait multiplier par 5-6x la consommation mémoire
// et provoquer un crash natif (OOM) plutôt qu'une erreur JS gérable.
  /*
const assertImportedPdfSizeIsSafe = async (fileUri) => {
  let info;
  try {
    info = await FileSystem.getInfoAsync(fileUri, { size: true });
  } catch (e) {
    throw new Error("Impossible de lire les informations du fichier PDF");
  }

  if (!info.exists) {
    throw new Error('Le fichier sélectionné est introuvable');
  }

  if (typeof info.size === 'number' && info.size > MAX_IMPORTED_PDF_SIZE_BYTES) {
    const sizeMb = (info.size / (1024 * 1024)).toFixed(1);
    const maxMb = Math.round(MAX_IMPORTED_PDF_SIZE_BYTES / (1024 * 1024));
    throw new Error(
      `Ce PDF est trop volumineux (${sizeMb} Mo, maximum ${maxMb} Mo). ` +
      'Veuillez importer un fichier plus léger.'
    );
  }
};*/

const assertImportedPdfSizeIsSafe = async (fileUri) => {
  let info;
  try {
    info = await FileSystem.getInfoAsync(fileUri, { size: true });
  } catch (e) {
    // Sur Android avec content://, getInfoAsync peut parfois échouer 
    // sans pour autant empêcher readAsStringAsync de fonctionner.
    console.warn("Impossible de lire les informations du fichier PDF via getInfoAsync:", e);
    return; 
  }

  if (!info.exists) {
    throw new Error('Le fichier sélectionné est introuvable');
  }

  if (typeof info.size === 'number' && info.size > MAX_IMPORTED_PDF_SIZE_BYTES) {
    const sizeMb = (info.size / (1024 * 1024)).toFixed(1);
    const maxMb = Math.round(MAX_IMPORTED_PDF_SIZE_BYTES / (1024 * 1024));
    throw new Error(
      `Ce PDF est trop volumineux (${sizeMb} Mo, maximum ${maxMb} Mo). ` +
      'Veuillez importer un fichier plus léger.'
    );
  }
};


// Bug Android/Expo connu (y compris en SDK 54, particulièrement sous Expo
// Go) : accéder à l'URI de cache produite par expo-document-picker échoue
// parfois avec "Location ... isn't readable" — que ce soit via
// readAsStringAsync OU copyAsync — alors même que getInfoAsync confirme que
// le fichier existe. Deux causes possibles :
//  1) Race condition : la promesse du picker se résout avant que la copie
//     native vers le cache ne soit totalement flushée sur disque.
//  2) Restriction propre au sandbox d'Expo Go (host.exp.exponent), qui peut
//     diverger d'un build autonome (dev client / APK) sur l'accès fichier.
// On mitige (1) avec un court délai + une nouvelle tentative. Si l'échec
// persiste, on le signale clairement : c'est probablement (2), qui ne se
// corrige pas côté JS mais en testant sur un dev build.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const copyPickedFileLocally = async (fileUri) => {
  const localUri = `${FATAFALTA_DIR}import_${Date.now()}.pdf`;
  const attempt = () =>
    withTimeout(
      FileSystem.copyAsync({ from: fileUri, to: localUri }),
      20000,
      'Copie du PDF trop longue'
    );

  try {
    await attempt();
    return localUri;
  } catch (firstError) {
    console.warn('Copie locale du PDF importé — échec (1ère tentative):', fileUri, firstError);
  }

  // Deuxième tentative après un court délai, au cas où il s'agissait d'une
  // simple course entre la fin de la copie native du picker et notre accès.
  await sleep(400);
  try {
    await attempt();
    return localUri;
  } catch (secondError) {
    console.warn('Copie locale du PDF importé — échec (2e tentative):', fileUri, secondError);
    throw new Error(
      "Impossible d'accéder au fichier sélectionné, même après nouvelle tentative. " +
      "Ce comportement est un problème connu d'Expo Go sur certains appareils/versions Android. " +
      "Si le problème persiste, essayez de tester avec un development build (npx expo run:android) " +
      "plutôt que dans Expo Go, ou sélectionnez le fichier depuis le stockage local plutôt que " +
      "depuis une application/cloud tierce."
    );
  }
};

const readPdfBytes = async (fileUri) => {
  try {
    const fileBase64 = await withTimeout(
      FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 }),
      30000,
      'Lecture du PDF trop longue'
    );
    return decode(fileBase64);
  } catch (readError) {
    console.warn('Lecture directe du PDF échouée, tentative de copie locale:', fileUri, readError);
    const localUri = await copyPickedFileLocally(fileUri);
    try {
      const fileBase64 = await withTimeout(
        FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 }),
        30000,
        'Lecture du PDF depuis la copie locale trop longue'
      );
      return decode(fileBase64);
    } finally {
      FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
    }
  }
};

/*
export const applyWatermarkToExistingPdf = async (fileUri) => {
  await initDirectory();

  // 1) Garde-fou de taille, avant toute opération coûteuse
  await assertImportedPdfSizeIsSafe(fileUri);

  // 2) Copie locale préalable (contournement du bug "isn't readable"),
  //    puis lecture + décodage de cette copie. On isole `fileBase64` dans
  //    son propre scope : une fois `decode()` exécuté, la chaîne base64
  //    devient éligible au garbage collection dès que possible, au lieu
  //    de rester vivante aussi longtemps que `pdfBytes`.
  const localUri = await copyPickedFileLocally(fileUri);

  let pdfBytes;
  try {
    pdfBytes = await (async () => {
      const fileBase64 = await withTimeout(
        FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 }),
        30000,
        'Lecture du PDF trop longue'
      );
      return decode(fileBase64);
    })();
  } catch (e) {
    console.warn('Lecture du PDF importé (copie locale) — erreur détaillée:', localUri, e);
    throw new Error(`Impossible de lire le fichier PDF (${e.message || 'raison inconnue'})`);
  } finally {
    // Nettoyage de la copie temporaire, qu'elle ait réussi ou échoué à être lue.
    FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
  }

  // 3) Chargement pdf-lib. `updateMetadata: false` évite un travail de
  //    ré-écriture de métadonnées inutile pour notre cas d'usage (simple
  //    ajout d'un filigrane), ce qui réduit légèrement l'empreinte mémoire
  //    et le temps de traitement.
  let pdfDoc;
  try {
    pdfDoc = await withTimeout(
      PDFDocument.load(pdfBytes, { updateMetadata: false }),
      30000,
      'Analyse du PDF trop longue'
    );
  } catch (e) {
    throw new Error(
      "Ce fichier n'a pas pu être ouvert : il est peut-être corrompu, protégé par mot de passe, ou dans un format non pris en charge."
    );
  } finally {
    // On n'a plus besoin des octets bruts une fois le document chargé en
    // mémoire par pdf-lib : on libère la référence pour aider le GC.
    pdfBytes = null;
  }

  const pages = pdfDoc.getPages();

  // Garde-fou supplémentaire : un très grand nombre de pages multiplie le
  // travail de dessin de texte et la taille du document reconstruit.
  const MAX_PAGES = 300;
  if (pages.length > MAX_PAGES) {
    throw new Error(
      `Ce PDF contient trop de pages (${pages.length}, maximum ${MAX_PAGES}).`
    );
  }

  for (const page of pages) {
    applyWatermark(page);
  }

  const modifiedPdfBytes = await withTimeout(pdfDoc.saveAsBase64(), 30000, 'Sauvegarde du PDF trop longue');
  const outputFileName = `fatafalta_doc_${Date.now()}.pdf`;
  const outputUri = FATAFALTA_DIR + outputFileName;

  await withTimeout(
    FileSystem.writeAsStringAsync(outputUri, modifiedPdfBytes, { encoding: FileSystem.EncodingType.Base64 }),
    20000,
    'Écriture du PDF trop longue'
  );

  return {
    uri: outputUri,
    name: outputFileName,
    mimeType: 'application/pdf',
  };
};
*/


export const applyWatermarkToExistingPdf = async (fileUri) => {
  await initDirectory();

  // 1) Garde-fou de taille, avant toute opération coûteuse
  await assertImportedPdfSizeIsSafe(fileUri);

  // 2) Lecture sécurisée : d'abord tentative directe, puis fallback par copie locale.
  let pdfBytes;
  try {
    pdfBytes = await readPdfBytes(fileUri);
  } catch (e) {
    console.warn('Lecture sécurisée du PDF échouée:', fileUri, e);
    throw new Error(`Impossible de lire le fichier PDF (${e.message || 'raison inconnue'})`);
  }

  // 3) Chargement pdf-lib.
  let pdfDoc;
  try {
    pdfDoc = await withTimeout(
      PDFDocument.load(pdfBytes, { updateMetadata: false }),
      30000,
      'Analyse du PDF trop longue'
    );
  } catch (e) {
    throw new Error(
      "Ce fichier n'a pas pu être ouvert : il est peut-être corrompu, protégé par mot de passe, ou dans un format non pris en charge."
    );
  } finally {
    pdfBytes = null;
  }

  const pages = pdfDoc.getPages();

  const MAX_PAGES = 300;
  if (pages.length > MAX_PAGES) {
    throw new Error(
      `Ce PDF contient trop de pages (${pages.length}, maximum ${MAX_PAGES}).`
    );
  }

  for (const page of pages) {
    applyWatermark(page);
  }

  const modifiedPdfBytes = await withTimeout(pdfDoc.saveAsBase64(), 30000, 'Sauvegarde du PDF trop longue');
  const outputFileName = `fatafalta_doc_${Date.now()}.pdf`;
  const outputUri = FATAFALTA_DIR + outputFileName;

  await withTimeout(
    FileSystem.writeAsStringAsync(outputUri, modifiedPdfBytes, { encoding: FileSystem.EncodingType.Base64 }),
    20000,
    'Écriture du PDF trop longue'
  );

  return {
    uri: outputUri,
    name: outputFileName,
    mimeType: 'application/pdf',
  };
};
export const cleanTempDirectory = async () => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(FATAFALTA_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(FATAFALTA_DIR, { idempotent: true });
    }
  } catch (e) {
    console.warn("Erreur lors du nettoyage du dossier temporaire", e);
  }
};