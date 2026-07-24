import { PDFDocument } from 'pdf-lib';

/**
 * Generate a PDF from a list of image files
 * @param {File[]} images Array of image Files (JPEG/PNG)
 * @param {Function} [onProgress] Optional callback for progress reporting
 * @returns {Promise<File>} The generated PDF File
 */
export const generatePdfFromImages = async (images, onProgress) => {
  if (!images || images.length === 0) {
    throw new Error('Aucune image fournie');
  }

  const pdfDoc = await PDFDocument.create();
  let completed = 0;

  for (const file of images) {
    const imageBytes = await file.arrayBuffer();
    let image;
    
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
      image = await pdfDoc.embedJpg(imageBytes);
    } else if (file.type === 'image/png') {
      image = await pdfDoc.embedPng(imageBytes);
    } else {
      console.warn(`Type d'image non supporté ignoré: ${file.type}`);
      continue;
    }

    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });

    completed++;
    if (onProgress) {
      onProgress(Math.round((completed / images.length) * 50)); // Generate takes up to 50% of the overall process
    }
  }

  const pdfBytes = await pdfDoc.save();
  
  if (onProgress) {
    onProgress(100);
  }

  return new File([pdfBytes], 'document-genere.pdf', { type: 'application/pdf' });
};
