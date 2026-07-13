import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, Users, MapPin, Clock, DollarSign, Trophy, Link as LinkIcon, CheckCircle } from 'lucide-react';

const DetailModal = ({ isOpen, formation, onClose, compatibilityScore }) => {
  if (!formation) return null;

  const formatPrice = (price) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(price);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-3xl bg-white shadow-2xl max-h-[90vh]"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#E8E3D6] bg-gradient-to-r from-[#F6F4EF] to-[#FAFAFA] p-6">
              <div className="flex-1 pr-4">
                <p className="text-xs font-bold uppercase tracking-widest text-[#8B96A6]">
                  {formation.typeEtablissement} • {formation.ville}
                </p>
                <h2 className="mt-1 text-2xl font-bold text-[#0E1A2B]">{formation.filiere}</h2>
                <p className="mt-1 text-sm text-[#5C6A7D]">{formation.nomEtablissement}</p>
              </div>
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#5C6A7D] hover:bg-[#F0EEEA] hover:text-[#0E1A2B]"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Score and Access Info */}
              <div className="grid grid-cols-2 gap-4">
                {compatibilityScore !== undefined && (
                  <div className="rounded-2xl bg-[#F6F4EF] p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#8B96A6]">Compatibilité</p>
                    <p className="mt-2 text-3xl font-bold text-[#B98A3B]">{compatibilityScore}%</p>
                  </div>
                )}
                <div className="rounded-2xl bg-[#EDF2F7] p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#8B96A6]">Mode d'accès</p>
                  <p className="mt-2 text-lg font-bold text-[#16273F]">{formation.modeAcces}</p>
                </div>
              </div>

              {/* Concours Details (if applicable) */}
              {formation.concours_details && (
                <div className="rounded-2xl border border-[#DCD5C6] bg-[#FFFEF9] p-4">
                  <h3 className="font-bold text-[#0E1A2B] flex items-center gap-2">
                    <Trophy size={18} className="text-[#B98A3B]" />
                    Informations Concours
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-[#5C6A7D]">
                    <li><strong>Matières:</strong> {formation.concours_details.matiere}</li>
                    <li><strong>Date:</strong> {formation.concours_details.date}</li>
                    <li><strong>Durée:</strong> {formation.concours_details.durée}</li>
                  </ul>
                </div>
              )}

              {/* Formation Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Clock className="mt-1 flex-shrink-0 text-[#B98A3B]" size={18} />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#8B96A6]">Durée</p>
                    <p className="mt-1 font-semibold text-[#0E1A2B]">{formation.duree} ans</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <DollarSign className="mt-1 flex-shrink-0 text-[#B98A3B]" size={18} />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#8B96A6]">Coût annuel</p>
                    <p className="mt-1 font-semibold text-[#0E1A2B]">{formatPrice(formation.prix)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Briefcase className="mt-1 flex-shrink-0 text-[#B98A3B]" size={18} />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#8B96A6]">Âge limite</p>
                    <p className="mt-1 font-semibold text-[#0E1A2B]">{formation.ageLimite} ans max</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="mt-1 flex-shrink-0 text-[#B98A3B]" size={18} />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#8B96A6]">Région</p>
                    <p className="mt-1 font-semibold text-[#0E1A2B]">{formation.region}</p>
                  </div>
                </div>
              </div>

              {/* Débouchés Professionnels */}
              <div>
                <h3 className="font-bold text-[#0E1A2B] mb-3 flex items-center gap-2">
                  <Briefcase size={18} className="text-[#B98A3B]" />
                  Débouchés Professionnels
                </h3>
                <div className="flex flex-wrap gap-2">
                  {formation.debouches.map((debouche, idx) => (
                    <span key={idx} className="rounded-lg bg-[#F6F4EF] px-3 py-2 text-sm font-medium text-[#0E1A2B]">
                      {debouche}
                    </span>
                  ))}
                </div>
                {formation.taux_employabilite && (
                  <p className="mt-3 text-sm text-[#5C6A7D]">
                    <strong>Taux d'employabilité:</strong> {formation.taux_employabilite}%
                  </p>
                )}
              </div>

              {/* Stages & Alternance */}
              <div>
                <h3 className="font-bold text-[#0E1A2B] mb-3">Stages & Opportunités</h3>
                <div className="space-y-2 text-sm text-[#5C6A7D]">
                  <p>
                    <strong>Stages:</strong> {formation.stages}
                  </p>
                  <p className="flex items-center gap-2">
                    {formation.alternance ? (
                      <>
                        <CheckCircle size={16} className="text-[#1F7A54]" />
                        <span><strong>Alternance:</strong> Disponible</span>
                      </>
                    ) : (
                      <>
                        <span className="h-4 w-4 rounded-full border-2 border-[#D97706]" />
                        <span><strong>Alternance:</strong> Non disponible</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Bourses & Logement */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-[#DCD5C6] bg-[#FFFEF9] p-4">
                  <h4 className="font-bold text-[#0E1A2B] text-sm mb-2">Bourses</h4>
                  {formation.bourses.disponible ? (
                    <>
                      <p className="text-xs text-[#1F7A54] font-semibold mb-1">✓ Disponibles</p>
                      <p className="text-sm text-[#5C6A7D]">Jusqu'à {formatPrice(formation.bourses.montant)}</p>
                    </>
                  ) : (
                    <p className="text-sm text-[#5C6A7D]">Non disponibles</p>
                  )}
                </div>

                <div className="rounded-2xl border border-[#DCD5C6] bg-[#FFFEF9] p-4">
                  <h4 className="font-bold text-[#0E1A2B] text-sm mb-2">Logement</h4>
                  {formation.logement ? (
                    <p className="text-xs text-[#1F7A54] font-semibold">✓ Disponible</p>
                  ) : (
                    <p className="text-sm text-[#5C6A7D]">Non disponible</p>
                  )}
                </div>
              </div>

              {/* Partenaires */}
              {formation.partenaires && formation.partenaires.length > 0 && (
                <div>
                  <h3 className="font-bold text-[#0E1A2B] mb-3 flex items-center gap-2">
                    <Users size={18} className="text-[#B98A3B]" />
                    Partenaires Industriels
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {formation.partenaires.map((partner, idx) => (
                      <span key={idx} className="rounded-lg bg-[#EDF2F7] px-3 py-2 text-sm text-[#16273F]">
                        {partner}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Conditions d'accès */}
              <div className="rounded-2xl border border-[#E8E3D6] bg-[#FAFAFA] p-4">
                <h3 className="font-bold text-[#0E1A2B] mb-3">Conditions d'Accès</h3>
                <div className="space-y-2 text-sm text-[#5C6A7D]">
                  <p>
                    <strong>Séries de BAC acceptées:</strong> {formation.conditions.bacsAcceptes.join(', ')}
                  </p>
                  <div>
                    <strong>Notes minimales requises:</strong>
                    <ul className="mt-1 ml-4 space-y-1">
                      {Object.entries(formation.conditions.notesMinimales).map(([subject, minNote]) => (
                        <li key={subject}>
                          • {subject.charAt(0).toUpperCase() + subject.slice(1)}: {minNote}/20
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 border-t border-[#E8E3D6] bg-[#F6F4EF] p-4 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-[#DCD5C6] bg-white py-3 font-semibold text-[#0E1A2B] hover:bg-[#F0EEEA]"
              >
                Fermer
              </button>
              <button className="flex-1 rounded-lg bg-[#B98A3B] py-3 font-semibold text-white hover:bg-[#A67930] flex items-center justify-center gap-2">
                <LinkIcon size={16} />
                Visiter le site
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DetailModal;
