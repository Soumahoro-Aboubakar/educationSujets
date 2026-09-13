import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { CheckCircle, FileText, Image as ImageIcon, Upload } from 'lucide-react';
import { usePdfWatermark } from '../hooks/usePdfWatermark';
import { generatePdfFromImages } from '../utils/pdfGenerator';
import SelectOrCreate from './SelectOrCreate';

const emptyDocument = { type: 'sujet', title: '', file: null, subject: null };
const messageOf = (error, fallback) => error.response?.data?.error || fallback;

const DynamicDocumentWizard = ({ onNeedStructure, onSuccess }) => {
  const [organisme, setOrganisme] = useState(null);
  const [parcoursTypes, setParcoursTypes] = useState([]);
  const [parcoursType, setParcoursType] = useState(null);
  const [structure, setStructure] = useState(null);
  const [path, setPath] = useState([]);
  const [matiere, setMatiere] = useState(null);
  const [document, setDocument] = useState(emptyDocument);
  const [publicationStatus, setPublicationStatus] = useState('approved');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadMode, setUploadMode] = useState('pdf');
  const [images, setImages] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const { processPdf, isProcessing: watermarking, progress: watermarkProgress, error: watermarkError, resetState } = usePdfWatermark();

  const leaf = path[path.length - 1] || null;
  const canChooseMatter = Boolean(leaf && path.length === structure?.niveaux?.length);
  const stepNames = useMemo(() => structure?.niveaux || [], [structure]);

  const searchOrganismes = async (recherche) => {
    const response = await axios.get('/api/organismes', { params: { recherche, limit: 20 } });
    return response.data.data || [];
  };

  const createOrganisme = async (nom) => {
    const response = await axios.post('/api/organismes', { nom });
    const created = response.data.data;
    onNeedStructure?.(created);
    throw new Error('Organisme créé. Configurez son gabarit avant de poursuivre.');
  };

  const selectOrganisme = async (selected) => {
    setError('');
    setNotice('');
    setOrganisme(selected);
    setParcoursType(null);
    setParcoursTypes([]);
    setPath([]);
    setMatiere(null);
    setDocument(emptyDocument);
    try {
      const parcoursResponse = await axios.get(`/api/organismes/${selected._id}/parcours-types`);
      setParcoursTypes(parcoursResponse.data.data || []);
      const response = await axios.get(`/api/structures/${selected._id}`);
      setStructure(response.data.data?.structure || null);
    } catch (requestError) {
      if (requestError.response?.status === 404) {
        onNeedStructure?.(selected);
        setError('Cet organisme n’a pas encore de gabarit. Configurez sa structure avant de saisir un document.');
      } else setError(messageOf(requestError, 'Impossible de charger le gabarit.'));
    }
  };

  const searchNodes = async (recherche, parentId) => {
    const response = await axios.get('/api/noeuds', { params: { organismeId: organisme._id, parentId: parentId || undefined, recherche, limit: 30 } });
    return response.data.data || [];
  };

  const createNode = async (nom, parentId) => {
    const response = await axios.post('/api/noeuds/trouver-ou-creer', { organismeId: organisme._id, parentId: parentId || null, nom });
    return response.data.data;
  };

  const selectNode = (index, selected) => {
    setPath((current) => [...current.slice(0, index), selected]);
    setMatiere(null);
    setDocument(emptyDocument);
  };

  const searchMatieres = async (recherche) => {
    const response = await axios.get('/api/matieres', { params: { organismeId: organisme._id, recherche, limit: 30 } });
    return response.data.data || [];
  };

  const createMatiere = async (nom) => {
    const response = await axios.post('/api/matieres/trouver-ou-creer', { organismeId: organisme._id, nom });
    return response.data.data;
  };

  const searchSubjects = async (recherche) => {
    const response = await axios.get('/api/documents', { params: { noeudId: leaf._id, matiereId: matiere._id, parcoursTypeId: parcoursType?._id, type: 'sujet', recherche, limit: 50 } });
    return response.data.data || [];
  };

  const selectSubject = (subject) => setDocument((current) => ({ ...current, subject }));

  const handleFile = async (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (selected.type === 'application/pdf') {
      const processed = await processPdf(selected);
      if (processed) setDocument((current) => ({ ...current, file: processed }));
    } else setDocument((current) => ({ ...current, file: selected }));
  };

  const handleImages = (event) => setImages((current) => [...current, ...Array.from(event.target.files || [])]);

  const generatePdf = async () => {
    if (!images.length) return;
    setGenerating(true);
    try {
      const generated = await generatePdfFromImages(images, setGenerationProgress);
      const processed = await processPdf(generated);
      if (processed) setDocument((current) => ({ ...current, file: processed }));
      setUploadMode('pdf');
      setImages([]);
    } catch (generationError) {
      setError(generationError.message || 'Impossible de générer le PDF.');
    } finally {
      setGenerating(false);
      setGenerationProgress(0);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!organisme || !leaf || !matiere || !document.file) return;
    if (parcoursTypes.length > 0 && !parcoursType) return;
    if (document.type === 'correction' && !document.subject) return;
    if (document.type === 'correction' && document.subject.correction) {
      const date = new Date(document.subject.correction.dateAjout || document.subject.correction.createdAt).toLocaleDateString();
      if (!window.confirm(`Cette action remplacera la correction existante du ${date}. Continuer ?`)) return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    const formData = new FormData();
    formData.append('file', document.file, document.file.name);
    formData.append('type', document.type);
    formData.append('noeudId', leaf._id);
    formData.append('matiereId', matiere._id);
    if (parcoursType?._id) formData.append('parcoursTypeId', parcoursType._id);
    if (document.title.trim()) {
      formData.append('titre', document.title.trim());
      formData.append('title', document.title.trim());
    }
    if (document.type === 'sujet') formData.append('publicationStatus', publicationStatus);
    if (document.type === 'correction') formData.append('sujetParentId', document.subject._id);
    try {
      await axios.post('/api/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setNotice(document.type === 'correction'
        ? 'Correction enregistrée et ancienne version remplacée.'
        : publicationStatus === 'approved'
          ? 'Sujet publié : il est désormais visible dans le catalogue mobile.'
          : 'Sujet enregistré comme brouillon.');
      setDocument(emptyDocument);
      resetState();
      onSuccess?.();
    } catch (requestError) {
      setError(messageOf(requestError, 'Impossible d’enregistrer le document.'));
    } finally {
      setSaving(false);
    }
  };

  const resetDocument = () => { setDocument(emptyDocument); setNotice(''); setError(''); };

  return (
    <div className="space-y-6">
      {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}
      {notice && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{notice}</div>}
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-black text-slate-800">Saisie d’un document</h2>
        <p className="mt-1 text-sm text-slate-500">Chaque étape suit le gabarit de l’organisme sélectionné.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <SelectOrCreate label="1. Organisme" placeholder="Rechercher un organisme" value={organisme} onSelect={selectOrganisme} search={searchOrganismes} create={createOrganisme} />
          {parcoursTypes.length > 0 && <SelectOrCreate label="2. Parcours type" placeholder="Rechercher un parcours type" value={parcoursType} onSelect={setParcoursType} search={async (recherche) => parcoursTypes.filter((item) => item.nom.toLocaleLowerCase().includes(recherche.trim().toLocaleLowerCase()))} canCreate={false} />}
          {organisme && !structure && <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-700">Structure à configurer avant de continuer.</p>}
          {structure && stepNames.map((level, index) => <SelectOrCreate key={`${level.type}-${index}`} label={`${index + (parcoursTypes.length > 0 ? 3 : 2)}. Choisissez : ${level.libelleSingulier}`} placeholder={`Rechercher ${level.libelleSingulier.toLowerCase()}`} value={path[index]} onSelect={(selected) => selectNode(index, selected)} search={(query) => searchNodes(query, path[index - 1]?._id)} create={(nom) => createNode(nom, path[index - 1]?._id)} disabled={index > path.length || (parcoursTypes.length > 0 && !parcoursType)} />)}
          {canChooseMatter && <SelectOrCreate label={`${stepNames.length + (parcoursTypes.length > 0 ? 3 : 2)}. Matière`} placeholder="Rechercher une matière" value={matiere} onSelect={setMatiere} search={searchMatieres} create={createMatiere} />}
        </div>
      </div>
      {canChooseMatter && matiere && (
        <form onSubmit={submit} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xl font-black text-slate-800">Document à enregistrer</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {['sujet', 'correction'].map((type) => <button key={type} type="button" onClick={() => setDocument((current) => ({ ...current, type, subject: null }))} className={`rounded-2xl border-2 px-4 py-4 text-left font-black transition ${document.type === type ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}><FileText size={19} className="mb-2" />{type === 'sujet' ? 'Sujet' : 'Correction'}<span className="mt-1 block text-xs font-medium">{type === 'sujet' ? 'Nouveau sujet à valider' : 'Remplacer ou ajouter une correction'}</span></button>)}
          </div>
          {document.type === 'correction' && <div className="mt-5"><SelectOrCreate label="Sujet à corriger" placeholder="Rechercher un sujet existant" value={document.subject} onSelect={selectSubject} search={searchSubjects} canCreate={false} /><p className="mt-2 text-xs text-slate-500">Sélection stricte parmi les sujets de cette matière et de ce niveau.</p>{document.subject?.correction && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">Cette action remplacera la correction existante du {new Date(document.subject.correction.dateAjout || document.subject.correction.createdAt).toLocaleDateString()}.</div>}</div>}
          {document.type === 'sujet' && <><input required value={document.title} onChange={(event) => setDocument((current) => ({ ...current, title: event.target.value }))} placeholder="Titre du sujet" className="mt-5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" /><div className="mt-4 grid gap-3 md:grid-cols-2"><button type="button" onClick={() => setPublicationStatus('approved')} className={`rounded-2xl border-2 px-4 py-3 text-left text-sm font-black transition ${publicationStatus === 'approved' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>Publier maintenant<span className="mt-1 block text-xs font-medium">Visible immédiatement dans le mobile.</span></button><button type="button" onClick={() => setPublicationStatus('draft')} className={`rounded-2xl border-2 px-4 py-3 text-left text-sm font-black transition ${publicationStatus === 'draft' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>Enregistrer en brouillon<span className="mt-1 block text-xs font-medium">Invisible pour les utilisateurs tant qu’il n’est pas publié.</span></button></div></>}
          <div className="mt-5 flex gap-2"><button type="button" onClick={() => setUploadMode('pdf')} className={`rounded-xl px-4 py-2 text-sm font-bold ${uploadMode === 'pdf' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}><Upload size={15} className="mr-1 inline" />PDF</button><button type="button" onClick={() => setUploadMode('images')} className={`rounded-xl px-4 py-2 text-sm font-bold ${uploadMode === 'images' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}><ImageIcon size={15} className="mr-1 inline" />Images</button></div>
          {uploadMode === 'pdf' ? <label className="mt-3 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 p-6 text-sm font-semibold text-slate-600"><Upload size={25} className="mb-2 text-indigo-500" />{document.file?.name || 'Choisir un fichier'}<input type="file" accept={document.type === 'correction' ? '.pdf' : '.pdf,.doc,.docx'} onChange={handleFile} className="hidden" /></label> : <div className="mt-3 rounded-2xl border-2 border-dashed border-slate-300 p-5"><label className="block cursor-pointer text-sm font-semibold text-slate-600"><ImageIcon size={22} className="mr-2 inline text-indigo-500" />Ajouter des images<input type="file" multiple accept="image/jpeg,image/png" onChange={handleImages} className="hidden" /></label>{images.length > 0 && <button type="button" onClick={generatePdf} disabled={generating} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">{generating ? `Génération ${generationProgress}%` : 'Générer et filigraner le PDF'}</button>}</div>}
          {(watermarking || watermarkError) && <p className="mt-2 text-xs font-semibold text-indigo-600">{watermarkError || `Filigrane ${watermarkProgress}%`}</p>}
          <button disabled={saving || !document.file || (parcoursTypes.length > 0 && !parcoursType) || (document.type === 'correction' && !document.subject)} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><CheckCircle size={17} />{saving ? 'Enregistrement…' : document.type === 'sujet' && publicationStatus === 'approved' ? 'Publier le sujet' : 'Enregistrer le document'}</button>
          {notice && <button type="button" onClick={resetDocument} className="ml-3 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600">Ajouter un autre document</button>}
        </form>
      )}
    </div>
  );
};

export default DynamicDocumentWizard;
