import { useState, useCallback } from 'react';
import { addWatermarkToPdf } from '../utils/pdfWatermark';

/**
 * Hook personnalisé pour gérer l'ajout de filigrane sur un PDF.
 * Fournit l'état de progression, les erreurs et la fonction d'exécution.
 */
export const usePdfWatermark = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  /**
   * Fonction principale pour traiter le PDF.
   * @param {File} file - Le fichier PDF à traiter.
   * @returns {Promise<File|null>} Le fichier filigrané ou null en cas d'erreur.
   */
  const processPdf = useCallback(async (file) => {
    if (!file) {
      setError('Aucun fichier sélectionné.');
      return null;
    }

    if (file.type !== 'application/pdf') {
      setError('Veuillez sélectionner un fichier PDF valide.');
      return null;
    }

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      // Appel de l'utilitaire de traitement PDF avec callback de progression
      const watermarkedFile = await addWatermarkToPdf(file, setProgress);
      return watermarkedFile;
    } catch (err) {
      setError(err.message || 'Une erreur est survenue lors du traitement du PDF.');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    processPdf,
    isProcessing,
    progress,
    error,
    resetState: () => {
      setIsProcessing(false);
      setProgress(0);
      setError(null);
    }
  };
};
