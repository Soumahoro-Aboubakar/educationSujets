import { PDFDocument } from 'pdf-lib';

/**
 * Generate a PDF from a list of image files
 * @param {File[]} images Array of image Files (JPEG/PNG)
 * @param {Function} [onProgress] Optional callback for progress reporting
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

  return blob;
};

export const generatePdfFromImages = async (images, onProgress) => {
  if (!images || images.length === 0) {
    throw new Error('Aucune image fournie');
  }

  const pdfDoc = await PDFDocument.create();
  let completed = 0;
  let processed = 0;

  for (const file of images) {
    let imageBytes;
    let image;

    try {
      if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
        imageBytes = await file.arrayBuffer();
        image = await pdfDoc.embedJpg(imageBytes);
      } else if (file.type === 'image/png') {
        imageBytes = await file.arrayBuffer();
        image = await pdfDoc.embedPng(imageBytes);
      } else if (file.type.startsWith('image/')) {
        const pngBlob = await convertImageFileToPng(file);
        imageBytes = await pngBlob.arrayBuffer();
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        console.warn(`Type d'image non supporté ignoré: ${file.type}`);
        continue;
      }
    } catch (error) {
      console.warn(`Échec de traitement de l'image ${file.name} (${file.type}):`, error);
      continue;
    }

    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });

    completed += 1;
    processed += 1;
    if (onProgress) {
      onProgress(Math.round((processed / images.length) * 50)); // Generate takes up to 50% of the overall process
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
