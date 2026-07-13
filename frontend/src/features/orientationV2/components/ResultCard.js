import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Landmark, GraduationCap, Clock, Wallet, Briefcase, Home, Users, TrendingUp } from 'lucide-react';
import DetailModal from './DetailModal';

const ResultCard = ({ item, type, onViewDetails }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Styles selon le type
  const isTop = type === 'top';
  const isRejected = type === 'rejected';

  const formatPrice = (price) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(price);

  const handleViewDetails = () => {
    setIsModalOpen(true);
    if (onViewDetails) onViewDetails(item);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md ${
          isRejected ? 'opacity-70 grayscale-[50%]' : 'hover:-translate-y-1'
        }`}
        style={{
          borderColor: isTop ? '#B98A3B' : '#E8E3D6',
          backgroundColor: isRejected ? '#FAFAFA' : '#FFFFFF'
        }}
      >
        {/* Badge Top Recommandation */}
        {isTop && (
          <div className="absolute right-0 top-0 rounded-bl-xl bg-[#B98A3B] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            ⭐ Recommandé
          </div>
        )}

        {/* Content */}
        <div className="p-5 lg:p-6">
          {/* Header : Nom école et Filière */}
          <div className="mb-4 flex items-start gap-4">
            <div className="flex flex-shrink-0 h-12 w-12 items-center justify-center rounded-xl bg-[#F6F4EF] text-[#B98A3B]">
              {item.typeEtablissement === 'Public' ? <Landmark size={24} /> : <Building2 size={24} />}
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8B96A6]">
                {item.nomEtablissement}
              </p>
              <h3 className="text-base lg:text-lg font-bold leading-tight text-[#0E1A2B]">
                {item.filiere}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#5C6A7D]">
                <span className="font-medium px-2 py-1 rounded-md bg-[#F6F4EF]">{item.typeEtablissement}</span>
                <span className="font-medium px-2 py-1 rounded-md bg-[#EDF2F7]">{item.ville}</span>
              </div>
            </div>
          </div>

          {/* Détails : Grille 3 colonnes */}
          <div className="mb-4 grid grid-cols-3 gap-2 lg:gap-3 text-xs lg:text-sm">
            <div className="flex flex-col gap-1 rounded-lg bg-[#F6F4EF] p-2 lg:p-3">
              <div className="flex items-center gap-1 text-[#8B96A6]">
                <Clock size={14} />
                <span className="font-semibold">Durée</span>
              </div>
              <span className="font-bold text-[#0E1A2B]">{item.duree} ans</span>
            </div>

            <div className="flex flex-col gap-1 rounded-lg bg-[#EDF2F7] p-2 lg:p-3">
              <div className="flex items-center gap-1 text-[#8B96A6]">
                <Wallet size={14} />
                <span className="font-semibold">Coût</span>
              </div>
              <span className="font-bold text-[#0E1A2B]">{formatPrice(item.prix)}/an</span>
            </div>

            <div className="flex flex-col gap-1 rounded-lg bg-[#F0E8DC] p-2 lg:p-3">
              <div className="flex items-center gap-1 text-[#8B96A6]">
                <GraduationCap size={14} />
                <span className="font-semibold">Âge max</span>
              </div>
              <span className="font-bold text-[#0E1A2B]">{item.ageLimite} ans</span>
            </div>
          </div>

          {/* Mode d'accès et autres infos rapides */}
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F5E9] px-3 py-1 text-xs font-semibold text-[#1F7A54]">
              {item.modeAcces}
            </span>
            {item.bourses?.disponible && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF3E0] px-3 py-1 text-xs font-semibold text-[#E65100]">
                💰 Bourses
              </span>
            )}
            {item.logement && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F3E5F5] px-3 py-1 text-xs font-semibold text-[#6A1B9A]">
                🏠 Logement
              </span>
            )}
            {item.alternance && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E3F2FD] px-3 py-1 text-xs font-semibold text-[#0D47A1]">
                🔄 Alternance
              </span>
            )}
          </div>

          {/* Taux employabilité (si pas rejeté) */}
          {!isRejected && item.taux_employabilite && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-[#E8F5E9] px-3 py-2 text-xs lg:text-sm">
              <TrendingUp size={16} className="text-[#1F7A54]" />
              <span className="text-[#1F7A54]">
                <strong>{item.taux_employabilite}%</strong> des diplômés employés
              </span>
            </div>
          )}

          {/* Motif de rejet si applicable */}
          {isRejected && (
            <div className="mb-4 rounded-lg bg-[#F7E6E2] p-3 text-xs lg:text-sm font-medium text-[#B3392C]">
              <strong>❌ Critère non rempli:</strong> {item.rejectReason}
            </div>
          )}

          {/* Footer : Compatibilité + Bouton */}
          <div className="flex items-center justify-between border-t border-[#E8E3D6] pt-4 gap-3">
            {!isRejected ? (
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8B96A6]">Compatibilité</p>
                <p className="text-xl lg:text-2xl font-bold text-[#1F7A54]">{item.compatibilityScore}%</p>
              </div>
            ) : (
              <div className="text-xs font-semibold text-[#B3392C]">Actuellement inéligible</div>
            )}
            
            <button
              onClick={handleViewDetails}
              className="rounded-lg bg-[#B98A3B] px-4 lg:px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#A67930] active:scale-95"
              style={{ opacity: isRejected ? 0.5 : 1 }}
              disabled={isRejected}
            >
              Détails
            </button>
          </div>
        </div>
      </motion.div>

      {/* Modal de détails */}
      <DetailModal 
        isOpen={isModalOpen} 
        formation={item} 
        onClose={() => setIsModalOpen(false)} 
        compatibilityScore={item.compatibilityScore}
      />
    </>
  );
};

export default ResultCard;
