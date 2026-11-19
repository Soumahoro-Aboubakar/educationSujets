import React, { useState } from 'react';
import { Check, ExternalLink, Play } from 'lucide-react';
import { cx } from '../components/ui';
import OrganismeLogo from '../components/catalog/OrganismeLogo';

/*
 * Briques visuelles de l'espace de préparation web. Identité du site : papier, encre, or rare.
 * L'or ne marque que la maîtrise (module validé, niveau réussi) ; l'action est à l'encre.
 */

export const pct = (x) => `${Math.round((x || 0) * 100)} %`;
export const minutesLabel = (sec) => (sec ? `${Math.max(1, Math.round(sec / 60))} min` : '');

/** Barre de maîtrise : encre pendant le travail, or quand c'est acquis. */
export const MasteryBar = ({ value = 0, done = false, className, label }) => (
  <span
    className={cx('relative block h-1.5 overflow-hidden rounded-full bg-line', className)}
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(value * 100)}
    aria-label={label}
  >
    <span
      className={cx('absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-emphasized', done ? 'bg-gold' : 'bg-ink')}
      style={{ width: `${Math.max(value > 0 ? 4 : 0, Math.round(value * 100))}%` }}
    />
  </span>
);

/** Pastille d'une leçon : faite (coche or), commencée (anneau proportionnel encre), à venir (numéro). */
export const LessonMark = ({ state, number, value = 0, size = 28 }) => {
  const box = { width: size, height: size };
  if (state === 'done') {
    return <span style={box} className="flex shrink-0 items-center justify-center rounded-full bg-gold text-white" aria-hidden><Check size={size * 0.52} strokeWidth={3} /></span>;
  }
  if (state === 'progress') {
    const deg = Math.round(Math.max(0.08, value) * 360);
    return (
      <span style={{ ...box, background: `conic-gradient(var(--ink) ${deg}deg, var(--line) 0deg)` }} className="relative flex shrink-0 items-center justify-center rounded-full" aria-hidden>
        <span style={{ width: size - 6, height: size - 6 }} className="flex items-center justify-center rounded-full bg-white text-[11px] font-bold tabular-nums text-ink">{number}</span>
      </span>
    );
  }
  return <span style={box} className="flex shrink-0 items-center justify-center rounded-full border border-line-strong bg-white text-[11px] font-semibold tabular-nums text-ink-soft" aria-hidden>{number}</span>;
};

/**
 * Logo de l'organisme : composant du site (monogramme coloré de secours). Un logo téléversé
 * (« storage:… ») est servi par l'API : /api/organismes/:id/logo.
 */
export const OrgMark = ({ logo, sigle = '', organismeId, size = 36 }) => {
  const url = String(logo || '').startsWith('storage:') && organismeId ? `/api/organismes/${organismeId}/logo` : logo;
  return <OrganismeLogo organisme={{ nom: sigle, alias: sigle, logo: url }} size={size >= 40 ? 'md' : 'sm'} />;
};

/**
 * Vidéo d'une leçon (YouTube, autre chaîne créditée). Économe en données : rien n'est chargé
 * avant le clic, seule la miniature (≈ 15 Ko) s'affiche ; le lecteur officiel arrive au clic,
 * en mode sans cookie. Si l'intégration échoue, le lien YouTube reste disponible.
 */
export const LessonVideo = ({ video, className, compact = false }) => {
  const [playing, setPlaying] = useState(false);
  if (!video?.youtubeId) return null;
  const id = video.youtubeId;
  const src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1&modestbranding=1&hl=fr&cc_lang_pref=fr`;
  return (
    <figure className={cx('overflow-hidden rounded-2xl border border-line bg-white', className)}>
      <div className="relative aspect-video bg-ink">
        {playing ? (
          <iframe
            title={video.title || 'Vidéo de la leçon'}
            src={src}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 flex h-full w-full items-center justify-center focus-visible:outline-none"
            aria-label={`Lire la vidéo : ${video.title || 'vidéo de la leçon'}${video.durationSec ? `, ${minutesLabel(video.durationSec)}` : ''}`}
          >
            <img src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-90 transition-[opacity,transform] duration-500 ease-emphasized group-hover:scale-[1.02] group-hover:opacity-100" />
            <span className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" aria-hidden />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white text-ink shadow-lift transition-transform duration-300 ease-emphasized group-hover:scale-105 group-focus-visible:ring-4 group-focus-visible:ring-gold-light" aria-hidden>
              <Play size={22} fill="currentColor" className="translate-x-0.5" />
            </span>
            {video.durationSec ? <span className="absolute bottom-3 right-3 rounded-md bg-ink/80 px-2 py-0.5 text-xs font-semibold tabular-nums text-white">{minutesLabel(video.durationSec)}</span> : null}
          </button>
        )}
      </div>
      <figcaption className={cx('flex items-start justify-between gap-3', compact ? 'px-4 py-3' : 'px-5 py-4')}>
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold leading-snug text-ink line-clamp-2">{video.title}</span>
          {video.auteur ? <span className="mt-0.5 block text-[13px] text-ink-soft">{`Chaîne YouTube : ${video.auteur}`}</span> : null}
        </span>
        <a
          href={`https://www.youtube.com/watch?v=${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-ink hover:text-ink"
          aria-label="Ouvrir la vidéo sur YouTube"
        >
          <ExternalLink size={15} />
        </a>
      </figcaption>
    </figure>
  );
};
