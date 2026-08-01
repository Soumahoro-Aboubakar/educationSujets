import { PDFDocument } from 'pdf-lib';
import {
  getA4PageSizeForImage,
  getContainedImageLayout,
  processImageFileForDocument,
} from './documentImageProcessing';

/**
 * Generate a professional A4-ratio PDF from a list of image files.
 * Images are deskewed when four document corners can be detected. If not,
 * they are inserted on an A4 page with clean padding and no distortion.
 * @param {File[]} images Array of image Files (JPEG/PNG/etc.)
 * @param {Function} [onProgress] Optional callback for progress reporting (0-100)
 * @returns {Promise<File>} The generated PDF File
 */
const convertImageFileToPng = async (file) => {
  const imageBitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error("Impossible de créer le contexte canvas pour l'image");
  }

  ctx.drawImage(imageBitmap, 0, 0);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) {
        resolve(b);
      } else {
        reject(new Error('Échec de la conversion de l’image en PNG.'));
      }
    }, 'image/png');
  });

  if (typeof imageBitmap.close === 'function') {
    imageBitmap.close();
  }

  return blob;
};

const embedPreparedImage = async (pdfDoc, prepared) => {
  const imageBytes = await prepared.blob.arrayBuffer();
  const mimeType = (prepared.mimeType || '').toLowerCase();

  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return pdfDoc.embedJpg(imageBytes);
  }

  if (mimeType === 'image/png') {
    return pdfDoc.embedPng(imageBytes);
  }

  const pngBlob = await convertImageFileToPng(prepared.blob);
  const pngBytes = await pngBlob.arrayBuffer();
  return pdfDoc.embedPng(pngBytes);
};

export const generatePdfFromImages = async (images, onProgress) => {
  if (!images || images.length === 0) {
    throw new Error('Aucune image fournie');
  }

  const pdfDoc = await PDFDocument.create();
  let completed = 0;
  let processed = 0;

  for (const file of images) {
    let image;
    let prepared;

    try {
      if (file.type.startsWith('image/')) {
        prepared = await processImageFileForDocument(file);
        image = await embedPreparedImage(pdfDoc, prepared);
      } else {
        console.warn(`Type d'image non supporté ignoré: ${file.type}`);
        continue;
      }
    } catch (error) {
      console.warn(`Échec de traitement de l'image ${file.name} (${file.type}):`, error);
      continue;
    }

    const imgWidth = prepared?.width || image.width;
    const imgHeight = prepared?.height || image.height;
    const pageSize = getA4PageSizeForImage(imgWidth, imgHeight);
    const layout = getContainedImageLayout(imgWidth, imgHeight, pageSize.width, pageSize.height);
    const page = pdfDoc.addPage([pageSize.width, pageSize.height]);

    page.drawImage(image, layout);

    completed += 1;
    processed += 1;
    if (onProgress) {
      onProgress(Math.round((processed / images.length) * 90));
    }
  }

  if (completed === 0) {
    throw new Error('Aucune image prise en charge trouvée. Veuillez utiliser un format image valide.');
  }

  const pdfBytes = await pdfDoc.save();

  if (onProgress) {
    onProgress(100);
  }

  return new File([pdfBytes], 'document-genere.pdf', { type: 'application/pdf' });
};
