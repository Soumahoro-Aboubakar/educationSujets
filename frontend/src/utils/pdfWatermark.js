import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

/**
 * Applique un filigrane "FATAFALTA" sur toutes les pages d'un PDF.
 * Traitement 100% côté client pour préserver la qualité, les vecteurs et les images.
 * 
 * @param {File} file - Le fichier PDF original sélectionné par l'utilisateur.
 * @param {Function} [onProgress] - Callback optionnel pour suivre la progression (0 à 100).
 * @returns {Promise<File>} - Une promesse qui résout avec le nouveau fichier PDF filigrané.
 */
export const addWatermarkToPdf = async (file, onProgress) => {
  try {
    if (onProgress) onProgress(5); // Début du traitement

    // 1. Lire le fichier sous forme de tableau d'octets (ArrayBuffer)
    // Permet un accès direct aux données binaires sans passer par le backend.
    const arrayBuffer = await file.arrayBuffer();
    if (onProgress) onProgress(20); // Fichier chargé en mémoire

    // 2. Charger le document PDF avec pdf-lib
    // ignoreEncryption permet de manipuler certains PDF verrouillés si nécessaire.
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    if (onProgress) onProgress(40); // PDF parsé

    // 3. Intégrer la police Helvetica Bold une seule fois
    // Optimisation mémoire : on intègre la police au niveau du document, pas de la page.
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    if (onProgress) onProgress(50); // Police chargée

    const text = 'FATAFALTA';
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    // 4. Traiter chaque page individuellement
    for (let i = 0; i < totalPages; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();

      // Calculer la diagonale de la page pour déterminer la taille du texte
      // Le texte doit couvrir environ 60% de la diagonale
      const diagonal = Math.sqrt(width * width + height * height);
      const targetTextWidth = diagonal * 0.60;

      // Calculer la taille de police optimale
      // On utilise une taille fictive (ex: 100) pour mesurer la largeur, puis on applique une règle de trois
      const dummySize = 100;
      const dummyWidth = helveticaBoldFont.widthOfTextAtSize(text, dummySize);
      const fontSize = (targetTextWidth * dummySize) / dummyWidth;

      // Mesurer la taille finale du texte pour le centrage
      const textWidth = helveticaBoldFont.widthOfTextAtSize(text, fontSize);
      const textHeight = helveticaBoldFont.heightAtSize(fontSize);

      // Calculer le centre de la page
      const centerX = width / 2;
      const centerY = height / 2;

      // Calculer les coordonnées (x, y) du point d'origine du texte pour qu'une fois tourné à 45°,
      // le centre de son rectangle de délimitation (bounding box) corresponde au centre de la page.
      // Rotation de 45 degrés -> cos(45) = sin(45) = Math.SQRT2 / 2
      const angle = Math.PI / 4; // 45 degrés en radians
      const cosAngle = Math.cos(angle);
      const sinAngle = Math.sin(angle);

      const x = centerX - (textWidth / 2) * cosAngle + (textHeight / 2) * sinAngle;
      const y = centerY - (textWidth / 2) * sinAngle - (textHeight / 2) * cosAngle;

      // 5. Dessiner le filigrane sur la page
      // L'opacité est réglée à 11% (entre 10% et 12%).
      page.drawText(text, {
        x: x,
        y: y,
        size: fontSize,
        font: helveticaBoldFont,
        color: rgb(0.65, 0.65, 0.65), // Gris clair
        opacity: 0.11, // Opacité ~ 11%
        rotate: degrees(45),
      });

      // Mettre à jour la progression (de 50% à 90%)
      if (onProgress) {
        const progressValue = 50 + Math.round(((i + 1) / totalPages) * 40);
        onProgress(progressValue);
      }
    }

    // 6. Sauvegarder le PDF modifié en Uint8Array
    const pdfBytes = await pdfDoc.save();
    if (onProgress) onProgress(95); // Sauvegarde terminée

    // 7. Créer un Blob puis un nouveau File prêt à être envoyé (FormData)
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const watermarkedFile = new File([blob], file.name, {
      type: 'application/pdf',
      lastModified: Date.now(),
    });

    if (onProgress) onProgress(100); // Traitement complet

    return watermarkedFile;
  } catch (error) {
    console.error('Erreur lors de l\'ajout du filigrane :', error);
    throw new Error('Impossible d\'appliquer le filigrane sur le document.');
  }
};
