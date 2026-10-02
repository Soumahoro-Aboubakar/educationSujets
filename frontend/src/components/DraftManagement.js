import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import axios from 'axios';
import { FileText, Upload, CheckCircle, AlertTriangle, Image as ImageIcon, X, Eye, Clock, User, Trash2, Edit, MapPin, Briefcase, GraduationCap, Calendar, Layers, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePdfWatermark } from '../hooks/usePdfWatermark';
import { generatePdfFromImages } from '../utils/pdfGenerator';
import { addWatermarkToPdf } from '../utils/pdfWatermark';
import AuthContext from '../context/AuthContext';
import CreatableSelect from './CreatableSelect';
import DynamicMetadataFields from './DynamicMetadataFields';

const MAX_PDF_SIZE = 10 * 1024 * 1024;

const EMPTY_DYNAMIC_METADATA = {
  organisme: null, path: [], matiere: null, hasParcoursType: null, parcoursType: null, isNewOrganisme: false,
};

const BATCH_STATUS_LABELS = {
  pending: 'En attente',
  processing: 'Filigrane',
  uploading: 'Envoi',
  success: 'Enregistré',
  error: 'Échec',
};

const isPdfFile = (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  return data?.error || data?.message || (Array.isArray(data?.errors) && data.errors[0]?.msg) || error?.message || fallback;
};

const EMPTY_METADATA_FORM = {
  title: '', description: '', university: '', department: '', level: '', semester: '', category: '', contestType: ''
};

const DraftManagement = ({ filtersData, onOptionCreate }) => {
  const { user } = useContext(AuthContext);
  const [drafts, setDrafts] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const observerTarget = useRef(null);

  const [uploadMode, setUploadMode] = useState('pdf'); // 'pdf' or 'images'
  const [file, setFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfGenerationProgress, setPdfGenerationProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // Sélection multiple : brouillons sans métadonnées, envoyés un par un.
  // { id, file, status, progress, error }
  const [batchFiles, setBatchFiles] = useState([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const batchRunningRef = useRef(false);
  const isBatchMode = batchFiles.length > 0;
  const [dynamicMetadata, setDynamicMetadata] = useState({
    organisme: null,
    path: [],
    matiere: null,
    hasParcoursType: null,
    parcoursType: null,
    isNewOrganisme: false,
  });

  const [editingMetadata, setEditingMetadata] = useState(null);
  const [metadataForm, setMetadataForm] = useState(EMPTY_METADATA_FORM);
  const [editingDynamicMetadata, setEditingDynamicMetadata] = useState(null);
  const [savingMetadata, setSavingMetadata] = useState(false);

  const { processPdf, isProcessing: watermarking, progress: watermarkProgress, error: watermarkError, resetState: resetWatermark } = usePdfWatermark();

  const fetchDrafts = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) setIsFetchingMore(true);
      else setIsFetching(true);

      const res = await axios.get('/api/documents/drafts', { params: { page: pageNum, limit: 12 } });
      const newData = res.data?.data || [];
      const pagination = res.data?.meta?.pagination;

      setDrafts(prev => append ? [...prev, ...newData] : newData);
      setPage(pageNum);
      setHasMore(pagination ? pagination.pages > pageNum : false);
    } catch (error) {
      console.error("Erreur lors de la récupération des brouillons:", error);
    } finally {
      if (append) setIsFetchingMore(false);
      else setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchDrafts(1, false);
  }, [fetchDrafts]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isFetchingMore && !isFetching) {
          fetchDrafts(page + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, isFetching, page, fetchDrafts]);

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    // Permet de re-sélectionner le même fichier après une erreur ou un retrait.
    e.target.value = '';
    if (selectedFiles.length === 0 || batchRunningRef.current) return;

    const rejected = [];
    const seen = new Set();
    const validFiles = [];
    selectedFiles.forEach((f) => {
      const key = `${f.name}:${f.size}:${f.lastModified}`;
      if (!isPdfFile(f)) rejected.push(`${f.name} (pas un PDF)`);
      else if (f.size > MAX_PDF_SIZE) rejected.push(`${f.name} (dépasse 10MB)`);
      else if (seen.has(key)) rejected.push(`${f.name} (doublon)`);
      else {
        seen.add(key);
        validFiles.push(f);
      }
    });

    setErrorMsg(rejected.length > 0 ? `Fichier(s) ignoré(s) : ${rejected.join(', ')}` : '');
    if (validFiles.length === 0) return;

    if (resetWatermark) resetWatermark();

    if (validFiles.length > 1) {
      // Plusieurs PDFs : pas de métadonnées, le filigrane est appliqué à l'envoi.
      setFile(null);
      setDynamicMetadata(EMPTY_DYNAMIC_METADATA);
      setBatchFiles(validFiles.map((f, index) => ({
        id: `${Date.now()}_${index}`,
        file: f,
        status: 'pending',
        progress: 0,
        error: null,
      })));
      return;
    }

    setBatchFiles([]);
    setFile(null);
    const watermarkedPdf = await processPdf(validFiles[0]);
    if (watermarkedPdf) setFile(watermarkedPdf);
  };

  const updateBatchFile = (id, patch) => {
    setBatchFiles(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleRemoveBatchFile = (id) => {
    if (batchRunningRef.current) return;
    setBatchFiles(prev => prev.filter(item => item.id !== id));
  };

  // Envoi séquentiel : le PDF suivant ne part qu'une fois le précédent terminé.
  // Un échec est noté sur le fichier concerné sans bloquer les suivants.
  const handleSaveBatchDrafts = async () => {
    if (batchRunningRef.current) return;
    const queue = batchFiles.filter(item => item.status !== 'success');
    if (queue.length === 0) return;

    batchRunningRef.current = true;
    setBatchRunning(true);
    setErrorMsg('');
    queue.forEach(item => updateBatchFile(item.id, { status: 'pending', progress: 0, error: null }));

    let failedCount = 0;
    for (const item of queue) {
      try {
        updateBatchFile(item.id, { status: 'processing', progress: 0 });
        const watermarkedPdf = await addWatermarkToPdf(item.file, (progress) => {
          updateBatchFile(item.id, { progress: Math.round(progress) });
        });

        updateBatchFile(item.id, { status: 'uploading', progress: 0 });
        const formData = new FormData();
        formData.append('file', watermarkedPdf);
        formData.append('documentType', 'sujet');
        formData.append('metadataStatus', 'false'); // 'false' triggers draft status in backend
        await axios.post('/api/documents', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (event) => {
            if (event.total) updateBatchFile(item.id, { progress: Math.round((event.loaded / event.total) * 100) });
          },
        });

        updateBatchFile(item.id, { status: 'success', progress: 100 });
      } catch (error) {
        console.error(`Erreur d'enregistrement de ${item.file.name}:`, error);
        failedCount += 1;
        updateBatchFile(item.id, { status: 'error', error: getErrorMessage(error, "Échec de l'enregistrement") });
      }
    }

    batchRunningRef.current = false;
    setBatchRunning(false);
    fetchDrafts();

    if (failedCount === 0) {
      setBatchFiles([]);
    } else {
      setErrorMsg(`${queue.length - failedCount} brouillon(s) enregistré(s), ${failedCount} échec(s). Relancez pour renvoyer uniquement les fichiers en échec.`);
    }
  };

  const handleImagesChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles = newFiles.filter(f => f.type === 'image/jpeg' || f.type === 'image/png');
      setImageFiles(prev => [...prev, ...validFiles]);
      setErrorMsg('');
    }
  };

  const handleRemoveImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleGeneratePdfFromImagesBtn = async () => {
    if (imageFiles.length === 0) return;
    try {
      setIsGeneratingPdf(true);
      setErrorMsg('');
      const generatedPdfFile = await generatePdfFromImages(imageFiles, (progress) => {
        setPdfGenerationProgress(Math.round(progress));
      });

      if (generatedPdfFile) {
        const watermarkedPdf = await processPdf(generatedPdfFile);
        if (watermarkedPdf) {
          setFile(watermarkedPdf);
          setBatchFiles([]);
          setUploadMode('pdf');
          setImageFiles([]);
        }
      }
    } catch (error) {
      setErrorMsg("Erreur lors de la génération du PDF");
      console.error(error);
    } finally {
      setIsGeneratingPdf(false);
      setPdfGenerationProgress(0);
    }
  };

  const handleSaveDraft = async () => {
    if (!file) {
      setErrorMsg('Veuillez fournir un fichier.');
      return;
    }

    if (dynamicMetadata.organisme) {
      const leafNode = dynamicMetadata.path?.at(-1);
      if (!leafNode?._id || !dynamicMetadata.matiere?._id) {
        setErrorMsg('Veuillez sélectionner le dernier niveau et la matière.');
        return;
      }
      if (dynamicMetadata.hasParcoursType === null) {
        setErrorMsg('Veuillez indiquer si cet organisme possède un type de parcours.');
        return;
      }
      if (dynamicMetadata.hasParcoursType === true && !dynamicMetadata.parcoursType?._id) {
        setErrorMsg('Veuillez sélectionner ou créer un type de parcours.');
        return;
      }
    }

    setUploading(true);
    setErrorMsg('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', 'sujet');
      formData.append('metadataStatus', 'false'); // 'false' triggers draft status in backend
      if (dynamicMetadata.path?.at(-1)?._id) formData.append('noeudId', dynamicMetadata.path.at(-1)._id);
      if (dynamicMetadata.matiere?._id) formData.append('matiereId', dynamicMetadata.matiere._id);
      if (dynamicMetadata.hasParcoursType !== null) {
        formData.append('hasParcoursType', String(dynamicMetadata.hasParcoursType));
      }
      if (dynamicMetadata.parcoursType?._id) formData.append('parcoursTypeId', dynamicMetadata.parcoursType._id);

      await axios.post('/api/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setFile(null);
      setDynamicMetadata(EMPTY_DYNAMIC_METADATA);
      if (resetWatermark) resetWatermark();
      fetchDrafts();
    } catch (error) {
      console.error("Erreur d'enregistrement:", error);
      setErrorMsg(getErrorMessage(error, "Échec de l'enregistrement du brouillon"));
    } finally {
      setUploading(false);
    }
  };

  const handlePreview = async (doc) => {
    try {
      const res = await axios.get(`/api/documents/${doc._id}/download`);
      const url = res.data?.data?.url || res.data?.url;
      if (url) {
        window.open(url, '_blank');
      } else {
        alert("L'URL de prévisualisation est introuvable.");
      }
    } catch (error) {
      console.error("Erreur de prévisualisation:", error);
      alert("Erreur lors de la génération de l'URL de prévisualisation ou fichier introuvable.");
    }
  };

  const handleEditMetadata = (doc) => {
    if (editingMetadata === doc._id) {
      setEditingMetadata(null);
      setEditingDynamicMetadata(null);
    } else {
      setEditingMetadata(doc._id);
      const dynamicNode = doc.noeudId?._id ? doc.noeudId : null;
      const dynamicOrganismeId = dynamicNode?.organismeId?._id || dynamicNode?.organismeId;
      if (dynamicNode && dynamicOrganismeId) {
        setEditingDynamicMetadata({
          organisme: { _id: dynamicOrganismeId, nom: 'Organisme actuel' },
          path: [dynamicNode],
          matiere: doc.matiereId?._id ? doc.matiereId : null,
          hasParcoursType: Boolean(doc.parcoursTypeId?._id || doc.parcoursTypeId),
          parcoursType: doc.parcoursTypeId?._id ? doc.parcoursTypeId : null,
          isNewOrganisme: false,
        });
      } else {
        setEditingDynamicMetadata({
          organisme: null,
          path: [],
          matiere: null,
          hasParcoursType: null,
          parcoursType: null,
          isNewOrganisme: false,
        });
      }
      setMetadataForm({
        title: doc.title || doc.originalFileName || '',
        description: doc.description || '',
        university: doc.university?._id || doc.university || '',
        department: doc.department?._id || doc.department || '',
        level: doc.level?._id || doc.level || '',
        semester: doc.semester?._id || doc.semester || '',
        category: doc.category?._id || doc.category || '',
        contestType: doc.contestType?._id || doc.contestType || ''
      });
    }
  };

  const handleSaveMetadataForm = async (docId, publish = false) => {
    setSavingMetadata(true);
    try {
      const payload = { ...metadataForm };
      if (editingDynamicMetadata) {
        if (editingDynamicMetadata.path?.at(-1)?._id) {
          payload.noeudId = editingDynamicMetadata.path.at(-1)._id;
        }
        if (editingDynamicMetadata.matiere?._id) {
          payload.matiereId = editingDynamicMetadata.matiere._id;
        }
        if (editingDynamicMetadata.hasParcoursType !== null) {
          payload.hasParcoursType = String(editingDynamicMetadata.hasParcoursType);
        }
        if (editingDynamicMetadata.parcoursType?._id) {
          payload.parcoursTypeId = editingDynamicMetadata.parcoursType._id;
        }
      }
      if (publish) {
        payload.metadataStatus = 'true';
      }

      await axios.put(`/api/documents/${docId}`, payload);

      if (publish) {
        try {
          await axios.put(`/api/documents/${docId}/validate`, { status: 'approved' });
        } catch (e) {
          console.warn("Could not auto-approve published draft:", e);
        }
      }

      setEditingMetadata(null);
      setEditingDynamicMetadata(null);
      fetchDrafts();
    } catch (error) {
      console.error("Erreur d'enregistrement:", error);
      alert("Erreur lors de l'enregistrement des métadonnées.");
    } finally {
      setSavingMetadata(false);
    }
  };

  const handlePublishDraft = async (doc) => {
    if (window.confirm('Voulez-vous vraiment publier ce brouillon ?')) {
      try {
        await axios.put(`/api/documents/${doc._id}`, {
          metadataStatus: 'true'
        });
        try {
          await axios.put(`/api/documents/${doc._id}/validate`, { status: 'approved' });
        } catch (e) {
          console.warn("Could not auto-approve published draft:", e);
        }
        fetchDrafts();
      } catch (error) {
        console.error("Erreur de publication:", error);
        alert("Erreur lors de la publication.");
      }
    }
  };

  const handleDelete = async (docId) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce brouillon ?')) {
      try {
        await axios.delete(`/api/documents/${docId}`);
        fetchDrafts();
      } catch (error) {
        console.error("Erreur suppression brouillon:", error);
        alert('Erreur lors de la suppression.');
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gestion du Brouillons</h2>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/40">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Nouveau Brouillon</h3>

        <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setUploadMode('pdf')}
            disabled={batchRunning}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold border-2 transition-all flex items-center justify-center ${uploadMode === 'pdf'
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 text-slate-500 hover:border-indigo-300 hover:bg-slate-50'
              }`}
          >
            <FileText size={18} className="mr-2" /> Uploader un PDF
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('images')}
            disabled={batchRunning}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold border-2 transition-all flex items-center justify-center ${uploadMode === 'images'
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 text-slate-500 hover:border-indigo-300 hover:bg-slate-50'
              }`}
          >
            <ImageIcon size={18} className="mr-2" /> Créer via Images
          </button>
        </div>

        {uploadMode === 'pdf' ? (
          <>
            <label className={`w-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-[2rem] transition-all cursor-pointer group ${file || isBatchMode ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'} ${watermarking || batchRunning ? 'opacity-70 pointer-events-none' : ''}`}>
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 transition-colors ${file || isBatchMode ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50'}`}>
                {watermarking ? (
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                ) : file || isBatchMode ? (
                  <CheckCircle size={28} />
                ) : (
                  <Upload size={28} />
                )}
              </div>

              {watermarking ? (
                <div className="flex flex-col items-center w-full max-w-[200px]">
                  <span className="text-sm font-bold text-indigo-600 mb-2">Application du filigrane... {watermarkProgress}%</span>
                  <div className="w-full bg-indigo-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${watermarkProgress}%` }} />
                  </div>
                </div>
              ) : (
                <>
                  <span className={`text-sm font-bold text-center px-4 ${file || isBatchMode ? 'text-indigo-700' : 'text-slate-600'}`}>
                    {isBatchMode ? `${batchFiles.length} PDF sélectionnés` : file ? file.name : 'Cliquez ou glissez-déposez un ou plusieurs PDF'}
                  </span>
                  {!file && !isBatchMode && <span className="text-xs font-medium text-slate-400 mt-2">PDF (Filigrané auto) - Max 10MB par fichier</span>}
                </>
              )}

              <input type="file" multiple className="hidden" accept=".pdf,application/pdf" onChange={handleFileChange} disabled={watermarking || batchRunning} />
            </label>
            {watermarkError && (
              <div className="mt-2 text-xs font-bold text-rose-500 flex items-center gap-1.5 ml-1">
                <AlertTriangle size={14} /> {watermarkError}
              </div>
            )}
            {isBatchMode && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-slate-500">
                  Plusieurs fichiers : ils seront enregistrés en brouillon sans métadonnées, un par un. Vous pourrez compléter les métadonnées depuis « Mes Brouillons ».
                </p>
                {batchFiles.map(item => {
                  const active = item.status === 'processing' || item.status === 'uploading';
                  return (
                    <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border ${item.status === 'error' ? 'border-rose-200 bg-rose-50/50' : item.status === 'success' ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
                      <div className="shrink-0">
                        {active ? (
                          <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                        ) : item.status === 'success' ? (
                          <CheckCircle size={20} className="text-emerald-500" />
                        ) : item.status === 'error' ? (
                          <AlertTriangle size={20} className="text-rose-500" />
                        ) : (
                          <FileText size={20} className="text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-700 truncate">{item.file.name}</div>
                        <div className={`text-xs font-medium ${item.status === 'error' ? 'text-rose-500' : 'text-slate-400'}`}>
                          {BATCH_STATUS_LABELS[item.status]}{active ? ` ${item.progress}%` : ''} · {(item.file.size / (1024 * 1024)).toFixed(1)} MB
                          {item.error ? ` — ${item.error}` : ''}
                        </div>
                        {active && (
                          <div className="w-full bg-indigo-100 rounded-full h-1 mt-1.5 overflow-hidden">
                            <div className="bg-indigo-600 h-1 rounded-full transition-all duration-300" style={{ width: `${item.progress}%` }} />
                          </div>
                        )}
                      </div>
                      {!batchRunning && item.status !== 'success' && (
                        <button type="button" onClick={() => handleRemoveBatchFile(item.id)} className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50" aria-label={`Retirer ${item.file.name}`}>
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <label className={`w-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-[2rem] transition-all cursor-pointer group ${imageFiles.length > 0 ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'}`}>
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 transition-colors ${imageFiles.length > 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50'}`}>
                <ImageIcon size={28} />
              </div>
              <span className={`text-sm font-bold text-center px-4 ${imageFiles.length > 0 ? 'text-indigo-700' : 'text-slate-600'}`}>
                {imageFiles.length > 0 ? `${imageFiles.length} image(s) sélectionnée(s)` : 'Cliquez ou glissez-déposez des images'}
              </span>
              <input type="file" multiple accept="image/jpeg,image/png" className="hidden" onChange={handleImagesChange} disabled={isGeneratingPdf} />
            </label>
            {imageFiles.length > 0 && (
              <div className="mt-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  {imageFiles.map((f, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white">
                      <div className="px-3 py-2 text-xs font-medium text-slate-700 truncate w-32">{f.name}</div>
                      <button type="button" onClick={() => handleRemoveImage(i)} className="absolute top-0 right-0 p-1 bg-rose-500 text-white rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleGeneratePdfFromImagesBtn}
                  disabled={isGeneratingPdf}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-70 flex justify-center items-center gap-2"
                >
                  {isGeneratingPdf ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Génération {pdfGenerationProgress}%</>
                  ) : (
                    <>Générer et Filigraner le PDF</>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium flex items-center gap-2">
            <AlertTriangle size={16} /> {errorMsg}
          </div>
        )}

        {isBatchMode ? (
          <button
            onClick={handleSaveBatchDrafts}
            disabled={batchRunning || !batchFiles.some(item => item.status !== 'success')}
            className="w-full py-4 mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
          >
            {batchRunning ? (
              <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enregistrement {batchFiles.filter(item => item.status === 'success' || item.status === 'error').length + 1}/{batchFiles.length}...</>
            ) : batchFiles.some(item => item.status === 'error') ? (
              <><Upload size={18} /> Réessayer les fichiers en échec</>
            ) : (
              <><Upload size={18} /> Enregistrer {batchFiles.length} brouillons</>
            )}
          </button>
        ) : (
          <>
            <DynamicMetadataFields
              value={dynamicMetadata}
              onChange={setDynamicMetadata}
            />

            <button
              onClick={handleSaveDraft}
              disabled={!file || uploading || watermarking || (dynamicMetadata.organisme && dynamicMetadata.hasParcoursType === null)}
              className="w-full py-4 mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
            >
              {uploading ? (
                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enregistrement...</>
              ) : (
                <><Upload size={18} /> Enregistrer en Brouillon</>
              )}
            </button>
          </>
        )}
      </div>

      <div className="mt-10">
        <h3 className="text-xl font-bold text-slate-800 mb-4">Mes Brouillons</h3>
        {isFetching ? (
          <div className="animate-pulse space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-3xl border border-slate-200"></div>
            ))}
          </div>
        ) : drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-3xl border border-slate-100">
            <FileText className="h-10 w-10 text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">Aucun brouillon disponible.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {drafts.map(doc => (
              <div key={doc._id} className="flex flex-col gap-2">
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                      <FileText size={22} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-800 mb-1">{doc.originalFileName || 'Document sans nom'}</h4>
                      <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                        <span className="flex items-center gap-1"><Clock size={12} /> {new Date(doc.createdAt).toLocaleDateString()}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="flex items-center gap-1"><User size={12} /> {doc.uploadedBy?.name || 'Inconnu'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                    <button onClick={() => handleEditMetadata(doc)} className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 font-bold text-sm hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2">
                      <Edit size={16} /> Modifier
                    </button>
                    <button onClick={() => handlePublishDraft(doc)} className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-sm hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2">
                      <Upload size={16} /> Publier
                    </button>
                    <button onClick={() => handlePreview(doc)} className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-slate-50 text-slate-600 font-bold text-sm hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
                      <Eye size={16} /> Voir
                    </button>
                    <button onClick={() => handleDelete(doc._id)} className="flex-none p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                {editingMetadata === doc._id && (
                  <div className="mt-2 mb-4 p-6 bg-white rounded-3xl border border-indigo-100 shadow-lg shadow-indigo-100/50">
                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Edit size={16} className="text-indigo-600" /> Compléter les métadonnées
                    </h4>
                    <div className="space-y-4">
                      {editingDynamicMetadata && (
                        <DynamicMetadataFields
                          value={editingDynamicMetadata}
                          onChange={setEditingDynamicMetadata}
                        />
                      )}
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1 mb-2 block">Titre</label>
                        <input
                          type="text"
                          value={metadataForm.title}
                          onChange={(e) => setMetadataForm({ ...metadataForm, title: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          placeholder="Titre du document"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1 mb-2 block">Description</label>
                        <textarea
                          rows={2}
                          value={metadataForm.description}
                          onChange={(e) => setMetadataForm({ ...metadataForm, description: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                          placeholder="Description"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { key: 'university', dbKey: 'universities', label: 'Université', icon: MapPin, options: filtersData?.universities || [] },
                          { key: 'department', dbKey: 'departments', label: 'Département', icon: Briefcase, options: filtersData?.departments || [] },
                          { key: 'level', dbKey: 'levels', label: 'Niveau', icon: GraduationCap, options: filtersData?.levels || [] },
                          { key: 'semester', dbKey: 'semesters', label: 'Session', icon: Calendar, options: filtersData?.semesters || [] },
                          { key: 'category', dbKey: 'categories', label: 'Catégorie', icon: Layers, options: filtersData?.categories || [] },
                          { key: 'contestType', dbKey: 'contest-types', label: 'Type de concours', icon: FileText, options: filtersData?.contestTypes || [] },
                        ].map(field => (
                          <div key={field.key} className={field.key === 'category' ? 'md:col-span-2' : ''}>
                            <CreatableSelect
                              label={field.label}
                              options={field.options}
                              value={metadataForm[field.key]}
                              onChange={(val) => setMetadataForm({ ...metadataForm, [field.key]: val })}
                              onCreate={(newVal) => {
                                if (onOptionCreate) onOptionCreate(field.key, field.dbKey, newVal);
                              }}
                              placeholder={`Sélectionner ou ajouter ${field.label.toLowerCase()}`}
                              icon={field.icon}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                        <button onClick={() => { setEditingMetadata(null); setEditingDynamicMetadata(null); }} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                          Annuler
                        </button>
                        <button onClick={() => handleSaveMetadataForm(doc._id, false)} disabled={savingMetadata} className="px-5 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold shadow-sm hover:bg-slate-200 transition-colors flex items-center gap-2">
                          {savingMetadata ? <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
                          Sauvegarder
                        </button>
                        <button onClick={() => handleSaveMetadataForm(doc._id, true)} disabled={savingMetadata} className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-colors flex items-center gap-2">
                          {savingMetadata ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload size={16} />}
                          Publier
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {hasMore && (
              <div ref={observerTarget} className="flex justify-center py-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Chargement...</span>
                </div>
              </div>
            )}
            {!hasMore && drafts.length > 0 && (
              <div className="text-center py-6">
                <span className="text-sm font-medium text-slate-400">Fin de la liste</span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default DraftManagement;
