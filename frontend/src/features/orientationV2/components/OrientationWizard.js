import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2, Compass, RotateCcw, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { CATALOG, VILLES, BAC_TYPES, SUBJECTS_LIST } from '../data/orientationCatalog';
import { evaluateSchoolEligibility, runFieldDiscoveryMode } from '../logic/orientationEngine';
import ResultCard from './ResultCard';
import bgImage from '../../../assets/images/simulator.jpeg';

const profileCards = [
  {
    id: 'auto',
    title: 'Je ne sais pas encore où m’orienter',
    subtitle: 'Pilotage automatique',
    description: 'Le système recommande les meilleures formations à partir de vos notes, de votre ville et des tendances du marché ivoirien.',
    icon: Compass,
    accent: 'from-[#16273F] to-[#2D4A6E]',
    cta: 'Lancer l’orientation automatique'
  },
  {
    id: 'field',
    title: 'Je connais la filière que je veux faire',
    subtitle: 'Filière connue',
    description: 'Vous avez déjà une idée de la formation à suivre et vous souhaitez découvrir les écoles adaptées.',
    icon: Search,
    accent: 'from-[#2D4A6E] to-[#3B6A99]',
    cta: 'Explorer la filière'
  },
  {
    id: 'school',
    title: 'Je connais l’école et la filière que je veux faire',
    subtitle: 'École et filière connues',
    description: 'Vous souhaitez vérifier si votre profil correspond aux critères d’admission d’un établissement précis.',
    icon: ShieldCheck,
    accent: 'from-[#B98A3B] to-[#D8A34E]',
    cta: 'Vérifier mon admissibilité'
  }
];

export default function OrientationWizard() {
  const [step, setStep] = useState(1);
  const [journeyType, setJourneyType] = useState('auto');
  const [profile, setProfile] = useState({
    bacType: '',
    age: '',
    field: '',
    school: '',
    notes: {}
  });
  const [filters, setFilters] = useState({
    ville: 'Toutes',
    typeEtablissement: 'Tous',
    budget: 'Tous'
  });
  const [results, setResults] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(999);
  const [criteriaFilter, setCriteriaFilter] = useState('all');

  const availableFields = useMemo(() =>
    [...new Set(CATALOG.map(formation => formation.filiere))].sort(),
    []
  );

  const availableSchools = useMemo(() =>
    [...new Set(CATALOG.map(formation => formation.nomEtablissement))].sort(),
    []
  );

  const criteriaOptions = [
    { value: 'all', label: 'Toutes les formations' },
    { value: 'eligible', label: 'Éligibles' },
    { value: 'bourse', label: 'Avec bourse' },
    { value: 'logement', label: 'Avec logement' },
    { value: 'alternance', label: 'Avec alternance' },
    { value: 'public', label: 'Établissements publics' },
    { value: 'private', label: 'Établissements privés' }
  ];

  const filteredMatches = useMemo(() => {
    if (!results?.matches?.length) return [];

    const matches = results.matches.filter((item) => {
      switch (criteriaFilter) {
        case 'eligible':
          return item.criteriaSummary?.isEligible;
        case 'bourse':
          return item.bourses?.disponible;
        case 'logement':
          return item.logement;
        case 'alternance':
          return item.alternance;
        case 'public':
          return item.typeEtablissement === 'Public';
        case 'private':
          return item.typeEtablissement === 'Privé';
        default:
          return true;
      }
    });

    return matches.slice(0, displayLimit);
  }, [criteriaFilter, displayLimit, results?.matches]);

  const totalMatches = results?.matches?.length || 0;

  const handleProfileChange = (key, value) => {
    setProfile(p => ({ ...p, [key]: value }));
  };

  const handleNoteChange = (subject, value) => {
    const num = parseFloat(value);
    setProfile(p => ({
      ...p,
      notes: { ...p.notes, [subject]: isNaN(num) ? '' : num }
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
  };

  const isStep1Valid = profile.bacType !== '' && profile.age !== '' && (
    journeyType === 'auto' ||
    (journeyType === 'field' && profile.field.trim() !== '') ||
    (journeyType === 'school' && profile.field.trim() !== '' && profile.school.trim() !== '')
  );
  const isStep2Valid = SUBJECTS_LIST.every(subj => profile.notes[subj.key] !== undefined && profile.notes[subj.key] !== '');

  const goToResults = () => {
    const normalizedProfile = {
      ...profile,
      age: parseInt(profile.age, 10),
      field: profile.field?.trim(),
      school: profile.school?.trim()
    };

    const nextResults = journeyType === 'school'
      ? evaluateSchoolEligibility(normalizedProfile, normalizedProfile.school, normalizedProfile.field)
      : runFieldDiscoveryMode(normalizedProfile, normalizedProfile.field, {
          geographic: filters.ville !== 'Toutes' ? { type: 'ville', value: filters.ville } : undefined,
          typeEtablissement: filters.typeEtablissement !== 'Tous' ? filters.typeEtablissement : undefined,
          budget: filters.budget === 'Tous' ? undefined : filters.budget
        });

    setResults(nextResults);
    setStep(3);
  };

  const summary = useMemo(() => {
    if (!results) return null;
    if (journeyType === 'school') {
      return {
        title: 'Vérification d’admissibilité',
        subtitle: results.schoolName || 'Analyse détaillée'
      };
    }

    const totalFound = results?.total || results?.matches?.length || 0;

    if (journeyType === 'auto') {
      return {
        title: 'Recommandations adaptées à votre profil',
        subtitle: `${totalFound} formation${totalFound > 1 ? 's' : ''} trouvée${totalFound > 1 ? 's' : ''}`
      };
    }

    return {
      title: `Résultats pour “${results.field}”`,
      subtitle: `${totalFound} établissement${totalFound > 1 ? 's' : ''} potentiel${totalFound > 1 ? 's' : ''} trouvé${totalFound > 1 ? 's' : ''}`
    };
  }, [journeyType, results]);

  return (
    <div
      className="relative min-h-screen bg-cover bg-fixed bg-center font-sans text-[#0E1A2B]"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="absolute inset-0 z-0 bg-[#F6F4EF]/95 backdrop-blur-sm" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-20">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#DCD5C6] bg-white/80 px-4 py-2 text-sm font-semibold text-[#16273F] shadow-sm">
            <Sparkles size={16} className="text-[#B98A3B]" />
            Nouvelle expérience d’orientation premium
          </div>
          <h1 className="mb-3 text-3xl font-bold uppercase tracking-widest text-[#16273F]">
            VOTRE AVENIR EN CÔTE D’IVOIRE
          </h1>
          <p className="mx-auto max-w-3xl text-lg font-medium text-[#5C6A7D]">
            Choisissez votre parcours selon votre niveau d’information et recevez des recommandations claires, rassurantes et adaptées.
          </p>
        </div>

        <div className="mx-auto overflow-hidden rounded-[32px] border border-[#DCD5C6] bg-white shadow-2xl">
          <div className="flex flex-wrap justify-between border-b border-[#E8E3D6] bg-[#FAFAFA] p-5 lg:px-10">
            {['Profil', 'Notes au BAC', 'Résultats'].map((label, index) => {
              const num = index + 1;
              const isActive = step === num;
              const isPast = step > num;
              return (
                <div key={label} className={`flex items-center gap-2 ${isActive ? 'text-[#B98A3B]' : isPast ? 'text-[#1F7A54]' : 'text-[#8B96A6]'}`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold ${isActive ? 'border-[#B98A3B] bg-[#F3E7D2]' : isPast ? 'border-[#1F7A54] bg-[#E4F1EA]' : 'border-[#E8E3D6] bg-transparent'}`}>
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
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#8B96A6]">
                      <Sparkles size={16} className="text-[#B98A3B]" />
                      Choisissez votre parcours
                    </div>

                    <div className="block lg:hidden">
                      <label htmlFor="journeyType" className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#8B96A6]">Votre situation</span>
                        <select
                          id="journeyType"
                          value={journeyType}
                          onChange={(e) => setJourneyType(e.target.value)}
                          className="w-full rounded-xl border border-[#DCD5C6] bg-[#FAFAFA] p-4 font-medium transition focus:border-[#B98A3B] focus:outline-none"
                        >
                          {profileCards.map(card => (
                            <option key={card.id} value={card.id}>{card.title}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="hidden lg:grid lg:grid-cols-3 lg:gap-4">
                      {profileCards.map(card => {
                        const Icon = card.icon;
                        const active = journeyType === card.id;
                        return (
                          <motion.button
                            whileHover={{ y: -4, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            key={card.id}
                            type="button"
                            onClick={() => setJourneyType(card.id)}
                            aria-pressed={active}
                            className={`group rounded-[24px] border p-5 text-left shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#B98A3B] ${active ? 'border-[#B98A3B] bg-[#FFF8EC] shadow-lg ring-2 ring-[#F2D7A0]' : 'border-[#E8E3D6] bg-white hover:border-[#CDBA8E] hover:shadow-md'}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className={`inline-flex rounded-2xl bg-gradient-to-br ${card.accent} p-3 text-white shadow-sm`}>
                                <Icon size={20} />
                              </div>
                              <div className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? 'bg-[#16273F] text-white' : 'bg-[#F6F4EF] text-[#5C6A7D]'}`}>
                                {active ? 'Sélectionné' : 'Cliquer'}
                              </div>
                            </div>
                            <h2 className="mt-4 text-lg font-bold text-[#16273F]">{card.title}</h2>
                            <p className="mt-1 text-sm font-semibold text-[#B98A3B]">{card.subtitle}</p>
                            <p className="mt-3 text-sm leading-6 text-[#5C6A7D]">{card.description}</p>
                            <div className={`mt-4 inline-flex items-center gap-2 text-sm font-semibold ${active ? 'text-[#16273F]' : 'text-[#B98A3B]'}`}>
                              <span>{card.cta}</span>
                              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <label htmlFor="bacType" className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#8B96A6]">Série du BAC</span>
                      <select id="bacType" value={profile.bacType} onChange={(e) => handleProfileChange('bacType', e.target.value)} className="w-full rounded-xl border border-[#DCD5C6] bg-[#FAFAFA] p-4 font-medium transition focus:border-[#B98A3B] focus:outline-none">
                        <option value="">Sélectionner</option>
                        {BAC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>

                    <label htmlFor="age" className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#8B96A6]">Âge de l’étudiant</span>
                      <input id="age" type="number" min="15" max="35" value={profile.age} onChange={(e) => handleProfileChange('age', e.target.value)} className="w-full rounded-xl border border-[#DCD5C6] bg-[#FAFAFA] p-4 font-medium transition focus:border-[#B98A3B] focus:outline-none" placeholder="Ex: 19" />
                    </label>

                    <label htmlFor="city" className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#8B96A6]">Ville</span>
                      <select id="city" value={filters.ville} onChange={(e) => handleFilterChange('ville', e.target.value)} className="w-full rounded-xl border border-[#DCD5C6] bg-[#FAFAFA] p-4 font-medium transition focus:border-[#B98A3B] focus:outline-none">
                        {VILLES.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </label>

                    {journeyType === 'field' && (
                      <label htmlFor="fieldInput" className="block">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#8B96A6]">Filière / Formation</span>
                        <select
                          id="fieldInput"
                          value={profile.field}
                          onChange={(e) => handleProfileChange('field', e.target.value)}
                          className="w-full rounded-xl border border-[#DCD5C6] bg-[#FAFAFA] p-4 font-medium transition focus:border-[#B98A3B] focus:outline-none"
                        >
                          <option value="">Sélectionner</option>
                          {availableFields.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </label>
                    )}

                    {journeyType === 'school' && (
                      <>
                        <label htmlFor="fieldInput" className="block">
                          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#8B96A6]">Filière</span>
                          <select
                            id="fieldInput"
                            value={profile.field}
                            onChange={(e) => handleProfileChange('field', e.target.value)}
                            className="w-full rounded-xl border border-[#DCD5C6] bg-[#FAFAFA] p-4 font-medium transition focus:border-[#B98A3B] focus:outline-none"
                          >
                            <option value="">Sélectionner</option>
                            {availableFields.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </label>
                        <label htmlFor="schoolInput" className="block">
                          <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#8B96A6]">École</span>
                          <select
                            id="schoolInput"
                            value={profile.school}
                            onChange={(e) => handleProfileChange('school', e.target.value)}
                            className="w-full rounded-xl border border-[#DCD5C6] bg-[#FAFAFA] p-4 font-medium transition focus:border-[#B98A3B] focus:outline-none"
                          >
                            <option value="">Sélectionner</option>
                            {availableSchools.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </label>
                      </>
                    )}
                  </div>

                  {journeyType === 'auto' && (
                    <div className="rounded-2xl border border-[#E8E3D6] bg-[#FAFAFA] p-5">
                      <div className="flex items-start gap-3">
                        <Compass size={20} className="mt-0.5 text-[#B98A3B]" />
                        <div>
                          <h3 className="text-lg font-bold text-[#16273F]">Orientation automatique</h3>
                          <p className="mt-2 text-sm leading-6 text-[#5C6A7D]">
                            Nous allons comparer vos résultats, votre ville et les tendances du marché ivoirien pour vous proposer les formations les plus pertinentes.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end border-t border-[#E8E3D6] pt-4">
                    <button disabled={!isStep1Valid} onClick={() => setStep(2)} className={`flex items-center gap-2 rounded-xl bg-[#16273F] px-8 py-4 font-semibold text-white transition-opacity ${!isStep1Valid ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}>
                      Suivant <ArrowRight size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <h2 className="text-xl font-bold">2. Vos notes au BAC</h2>
                  <p className="text-sm text-[#5C6A7D]">Saisissez vos notes pour que l’algorithme compare votre profil aux critères d’admission.</p>
                  <div className="grid gap-y-4 gap-x-8 md:grid-cols-2">
                    {SUBJECTS_LIST.map(subject => (
                      <div key={subject.key} className="flex items-center justify-between border-b border-[#E8E3D6] pb-3">
                        <span className="font-semibold text-[#5C6A7D]">{subject.label}</span>
                        <div className="flex items-center gap-2">
                          <input type="number" min="0" max="20" value={profile.notes[subject.key] ?? ''} onChange={(e) => handleNoteChange(subject.key, e.target.value)} className="w-20 rounded-lg border border-[#DCD5C6] bg-[#FAFAFA] p-2 text-right font-bold transition focus:border-[#B98A3B] focus:outline-none" placeholder="..." />
                          <span className="text-xs font-bold text-[#8B96A6]">/20</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 flex justify-between border-t border-[#E8E3D6] pt-4">
                    <button onClick={() => setStep(1)} className="flex items-center gap-2 rounded-xl border border-[#DCD5C6] px-8 py-4 font-semibold text-[#5C6A7D] hover:bg-[#FAFAFA]">Retour</button>
                    <button disabled={!isStep2Valid} onClick={goToResults} className={`flex items-center gap-2 rounded-xl bg-[#B98A3B] px-8 py-4 font-semibold text-white transition-opacity ${!isStep2Valid ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}>
                      Voir mon résultat
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && results && (
                <motion.div key="step3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E3D6] pb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#16273F]">{summary?.title}</h2>
                      <p className="text-sm text-[#5C6A7D]">{summary?.subtitle}</p>
                    </div>
                    <button onClick={() => setStep(1)} className="flex items-center gap-2 text-sm font-semibold text-[#8B96A6] hover:text-[#B98A3B]">
                      <RotateCcw size={16} /> Recommencer
                    </button>
                  </div>

                  {journeyType !== 'school' && results.matches ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E8E3D6] bg-[#FAFAFA] p-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest text-[#8B96A6]">Résultats</p>
                          <p className="text-sm font-semibold text-[#16273F]">{filteredMatches.length} formation{filteredMatches.length > 1 ? 's' : ''} affichée{filteredMatches.length > 1 ? 's' : ''} sur {totalMatches}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 text-sm font-semibold text-[#5C6A7D]">
                            <span>Critère</span>
                            <select value={criteriaFilter} onChange={(e) => setCriteriaFilter(e.target.value)} className="rounded-lg border border-[#DCD5C6] bg-white px-3 py-2 text-sm text-[#16273F] focus:border-[#B98A3B] focus:outline-none">
                              {criteriaOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </label>
                          <label className="flex items-center gap-2 text-sm font-semibold text-[#5C6A7D]">
                            <span>Montrer</span>
                            <select value={displayLimit === 999 ? 'all' : displayLimit} onChange={(e) => setDisplayLimit(e.target.value === 'all' ? 999 : Number(e.target.value))} className="rounded-lg border border-[#DCD5C6] bg-white px-3 py-2 text-sm text-[#16273F] focus:border-[#B98A3B] focus:outline-none">
                              <option value={3}>3</option>
                              <option value={6}>6</option>
                              <option value="all">Toutes</option>
                            </select>
                          </label>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        {filteredMatches.slice(0, 3).map((item, index) => (
                          <div key={item.id || index} className="rounded-2xl border border-[#E8E3D6] bg-[#FAFAFA] p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-[#8B96A6]">{item.nomEtablissement}</p>
                                <h3 className="text-lg font-bold text-[#16273F]">{item.filiere}</h3>
                              </div>
                              <div className="rounded-full bg-[#E8F5E9] px-3 py-1 text-sm font-semibold text-[#1F7A54]">{item.compatibilityScore}%</div>
                            </div>
                            <p className="mt-3 text-sm text-[#5C6A7D]">{item.ville} • {item.typeEtablissement} • {item.prix.toLocaleString('fr-FR')} XOF/an</p>
                            {item.criteriaSummary?.reasons?.length > 0 && (
                              <p className="mt-2 text-sm text-[#B3392C]">⚠️ {item.criteriaSummary.reasons[0]}</p>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="grid gap-6 lg:grid-cols-2">
                        {filteredMatches.map((item, i) => (
                          <ResultCard key={`field-${item.id || i}`} item={item} type={i === 0 ? 'top' : 'secondary'} selectedCity={filters.ville} />
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-6">
                      <div className="rounded-2xl border border-[#E8E3D6] bg-[#FAFAFA] p-5">
                        <div className="flex items-center gap-2 text-lg font-bold text-[#16273F]">
                          <ShieldCheck size={20} className="text-[#B98A3B]" />
                          Verdict : {results.verdict === 'ELIGIBLE' ? 'Éligible' : results.verdict === 'INCONCLUSIVE' ? 'Éligibilité incertaine' : 'Non éligible'}
                        </div>
                        <p className="mt-3 text-sm text-[#5C6A7D]">{results.reasons?.length ? results.reasons[0] : 'Analyse effectuée.'}</p>
                      </div>

                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="rounded-2xl border border-[#E8E3D6] bg-white p-5">
                          <h3 className="text-lg font-bold text-[#16273F]">Critères remplis</h3>
                          <ul className="mt-3 space-y-2 text-sm text-[#5C6A7D]">
                            {results.matchedCriteria?.length ? results.matchedCriteria.map(item => <li key={item} className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 text-[#1F7A54]" />{item}</li>) : <li>Aucun critère rempli.</li>}
                          </ul>
                        </div>
                        <div className="rounded-2xl border border-[#E8E3D6] bg-white p-5">
                          <h3 className="text-lg font-bold text-[#16273F]">Critères manquants</h3>
                          <ul className="mt-3 space-y-2 text-sm text-[#5C6A7D]">
                            {results.missingCriteria?.length ? results.missingCriteria.map(item => <li key={item} className="flex gap-2"><span className="mt-0.5 text-[#B3392C]">•</span>{item}</li>) : <li>Aucun critère manquant.</li>}
                          </ul>
                        </div>
                      </div>

                      {results.alternatives?.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold text-[#16273F]">Établissements ou formations similaires</h3>
                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            {results.alternatives.map((item, index) => (
                              <div key={item.id || index} className="rounded-2xl border border-[#E8E3D6] bg-[#FAFAFA] p-4">
                                <p className="text-xs font-semibold uppercase tracking-widest text-[#8B96A6]">{item.nomEtablissement}</p>
                                <h4 className="text-base font-bold text-[#16273F]">{item.filiere}</h4>
                                <p className="mt-2 text-sm text-[#5C6A7D]">Score de compatibilité : {item.compatibilityScore}%</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
