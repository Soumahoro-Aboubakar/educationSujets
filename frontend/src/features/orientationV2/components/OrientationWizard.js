import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronDown, CheckCircle2, RotateCcw } from 'lucide-react';
import { VILLES, BAC_TYPES, SUBJECTS_LIST } from '../data/orientationCatalog';
import { runOrientationEngine } from '../logic/orientationEngine';
import ResultCard from './ResultCard';
import bgImage from '../../../assets/images/simulator.jpeg';

export default function OrientationWizard() {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({
    bacType: '',
    age: '',
    notes: {}
  });
  const [filters, setFilters] = useState({
    ville: 'Toutes',
    type: 'Tous',
    budget: 'Tous'
  });
  const [results, setResults] = useState(null);

  const handleProfileChange = (key, value) => {
    setProfile(p => ({ ...p, [key]: value }));
  };

  const handleNoteChange = (subject, value) => {
    // Only accept valid grade values between 0 and 20
    const num = parseFloat(value);
    setProfile(p => ({
      ...p,
      notes: { ...p.notes, [subject]: isNaN(num) ? '' : num }
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
  };

  const isStep1Valid = profile.bacType !== '' && profile.age !== '';
  // Verify if at least basic notes are filled. Here we assume we want all notes filled for simplicity.
  const isStep2Valid = SUBJECTS_LIST.every(subj => profile.notes[subj.key] !== undefined && profile.notes[subj.key] !== '');

  const goToResults = () => {
    const res = runOrientationEngine({ ...profile, age: parseInt(profile.age, 10) }, filters);
    setResults(res);
    setStep(3);
  };

  return (
    <div 
      className="relative min-h-screen bg-cover bg-fixed bg-center font-sans text-[#0E1A2B]"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="absolute inset-0 z-0 bg-[#F6F4EF]/95 backdrop-blur-sm" />
      
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:py-20 text-center">
        <h1 className="mb-3 text-3xl font-bold uppercase tracking-widest text-[#16273F]">
          VOTRE AVENIR EN CÔTE D'IVOIRE
        </h1>
        <p className="mb-10 text-lg font-medium text-[#5C6A7D]">
          Moteur d'orientation V2 : Analysez vos chances et découvrez les formations adaptées.
        </p>

        {/* Wizard Container */}
        <div className="mx-auto overflow-hidden rounded-3xl border border-[#DCD5C6] bg-white shadow-xl">
          {/* Progress Header */}
          <div className="flex justify-between border-b border-[#E8E3D6] p-5 lg:px-10 bg-[#FAFAFA]">
            {['Profil', 'Notes au BAC', 'Résultats'].map((label, index) => {
              const num = index + 1;
              const isActive = step === num;
              const isPast = step > num;
              return (
                <div key={label} className={`flex items-center gap-2 ${isActive ? 'text-[#B98A3B]' : isPast ? 'text-[#1F7A54]' : 'text-[#8B96A6]'}`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold border-2 ${
                    isActive ? 'border-[#B98A3B] bg-[#F3E7D2]' : isPast ? 'border-[#1F7A54] bg-[#E4F1EA]' : 'border-[#E8E3D6] bg-transparent'
                  }`}>
                    {isPast ? <CheckCircle2 size={16} /> : num}
                  </div>
                  <span className="hidden sm:inline font-semibold">{label}</span>
                </div>
              );
            })}
          </div>

          <div className="p-6 text-left sm:p-10">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-bold">1. Votre Profil & Objectifs</h2>
                  <div className="grid gap-6 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#8B96A6]">Série du BAC</span>
                      <select 
                        value={profile.bacType} 
                        onChange={(e) => handleProfileChange('bacType', e.target.value)}
                        className="w-full rounded-xl border border-[#DCD5C6] bg-[#FAFAFA] p-4 font-medium transition focus:border-[#B98A3B] focus:outline-none"
                      >
                        <option value="">Sélectionner</option>
                        {BAC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#8B96A6]">Âge de l'étudiant</span>
                      <input 
                        type="number"
                        min="15"
                        max="35"
                        value={profile.age} 
                        onChange={(e) => handleProfileChange('age', e.target.value)}
                        className="w-full rounded-xl border border-[#DCD5C6] bg-[#FAFAFA] p-4 font-medium transition focus:border-[#B98A3B] focus:outline-none"
                        placeholder="Ex: 19"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#8B96A6]">Filtre Géographique</span>
                      <select 
                        value={filters.ville} 
                        onChange={(e) => handleFilterChange('ville', e.target.value)}
                        className="w-full rounded-xl border border-[#DCD5C6] bg-[#FAFAFA] p-4 font-medium transition focus:border-[#B98A3B] focus:outline-none"
                      >
                        {VILLES.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#8B96A6]">Autopilot : Type</span>
                      <select 
                        value={filters.type} 
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                        className="w-full rounded-xl border border-[#DCD5C6] bg-[#FAFAFA] p-4 font-medium transition focus:border-[#B98A3B] focus:outline-none"
                      >
                        <option value="Tous">Tous (Pilote Automatique)</option>
                        <option value="Public">Établissements Publics UNIQUEMENT</option>
                        <option value="Privé">Établissements Privés UNIQUEMENT</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-8 flex justify-end pt-4 border-t border-[#E8E3D6]">
                    <button
                      disabled={!isStep1Valid}
                      onClick={() => setStep(2)}
                      className={`flex items-center gap-2 rounded-xl bg-[#16273F] px-8 py-4 font-semibold text-white transition-opacity ${!isStep1Valid ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                    >
                      Suivant <ArrowRight size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                   <h2 className="text-xl font-bold">2. Vos Notes au BAC</h2>
                   <p className="text-sm text-[#5C6A7D] mb-4">
                     Saisissez vos notes pour que l'algorithme calcule vos probabilités d'admission.
                   </p>
                   
                   <div className="grid gap-y-4 gap-x-8 md:grid-cols-2">
                     {SUBJECTS_LIST.map(subject => (
                        <div key={subject.key} className="flex items-center justify-between border-b border-[#E8E3D6] pb-3">
                           <span className="font-semibold text-[#5C6A7D]">{subject.label}</span>
                           <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                min="0" 
                                max="20"
                                value={profile.notes[subject.key] ?? ''}
                                onChange={(e) => handleNoteChange(subject.key, e.target.value)}
                                className="w-20 rounded-lg border border-[#DCD5C6] bg-[#FAFAFA] p-2 text-right font-bold transition focus:border-[#B98A3B] focus:outline-none"
                                placeholder="..." 
                              />
                              <span className="text-xs font-bold text-[#8B96A6]">/20</span>
                           </div>
                        </div>
                     ))}
                   </div>

                   <div className="mt-8 flex justify-between pt-4 border-t border-[#E8E3D6]">
                    <button
                      onClick={() => setStep(1)}
                      className="flex items-center gap-2 rounded-xl border border-[#DCD5C6] px-8 py-4 font-semibold text-[#5C6A7D] hover:bg-[#FAFAFA]"
                    >
                      Retour
                    </button>
                    <button
                      disabled={!isStep2Valid}
                      onClick={goToResults}
                      className={`flex items-center gap-2 rounded-xl bg-[#B98A3B] px-8 py-4 font-semibold text-white transition-opacity ${!isStep2Valid ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                    >
                      Analyser mon profil
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && results && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-10"
                >
                  <div className="flex items-center justify-between border-b border-[#E8E3D6] pb-6">
                     <h2 className="text-2xl font-bold">3. Recommandations</h2>
                     <button
                        onClick={() => setStep(1)}
                        className="flex items-center gap-2 text-sm font-semibold text-[#8B96A6] hover:text-[#B98A3B]"
                      >
                        <RotateCcw size={16} /> Recommencer
                      </button>
                  </div>

                  {/* Top Recommandations */}
                  <div>
                    <h3 className="mb-4 text-lg font-bold text-[#1F7A54] flex items-center gap-2">
                       Admissible — Top Recommandations ({results.topRecommendations.length})
                    </h3>
                    <div className="grid gap-6 lg:grid-cols-2">
                      {results.topRecommendations.map((item, i) => (
                        <ResultCard key={`top-${i}`} item={item} type="top" />
                      ))}
                    </div>
                    {results.topRecommendations.length === 0 && (
                      <p className="text-sm text-[#8B96A6]">Aucune filière ne correspond à un score élevé pour le moment.</p>
                    )}
                  </div>

                   {/* Options Secondaires */}
                   {results.secondaryOptions.length > 0 && (
                     <div>
                      <h3 className="mb-4 text-lg font-bold text-[#B98A3B] flex items-center gap-2">
                         Admissible — Options Secondaires ({results.secondaryOptions.length})
                      </h3>
                      <div className="grid gap-6 lg:grid-cols-2">
                        {results.secondaryOptions.map((item, i) => (
                          <ResultCard key={`sec-${i}`} item={item} type="secondary" />
                        ))}
                      </div>
                    </div>
                   )}

                   {/* Rejected */}
                   {results.rejected.length > 0 && (
                     <div>
                      <h3 className="mb-4 text-lg font-bold text-[#B3392C] flex items-center gap-2">
                         Filières Rejetées / Bloquées ({results.rejected.length})
                      </h3>
                      <div className="grid gap-6 lg:grid-cols-2">
                        {results.rejected.map((item, i) => (
                          <ResultCard key={`rej-${i}`} item={item} type="rejected" />
                        ))}
                      </div>
                    </div>
                   )}

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
