import React, { useEffect, useState } from 'react';
import { Camera, Check, Copy, Compass, Ellipsis, Link2, PlusSquare, ScanLine, Send, Share, Smartphone } from 'lucide-react';
import { Button, Container, Modal } from '../ui';

/*
 * Installer Fatafalta sur iPhone (PWA). Apple n'autorise aucune installation par un bouton : seul le
 * geste Safari « Partager → Sur l'écran d'accueil » existe. Selon le contexte, on affiche donc :
 * - iPhone dans Safari : le guide en trois gestes ;
 * - iPhone dans un autre navigateur ou une application (WhatsApp, Facebook, Instagram…) : ouvrir la
 *   page dans Safari, avec un bouton pour copier le lien ;
 * - ordinateur ou Android : un QR code à scanner avec l'iPhone (il ouvre Safari, guide affiché).
 * Rien n'est affiché dans l'application déjà installée.
 */

export const INSTALL_URL = 'https://fatafalta.com/?installer=iphone';

export const isIos = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(ua) || iPadOs;
};
// Safari lui-même : ni Chrome / Firefox / Edge pour iOS, ni le navigateur intégré d'une application.
export const isIosSafari = () => isIos()
  && /Safari/.test(navigator.userAgent)
  && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|FBAN|FBAV|FB_IAB|Instagram|Line\/|Snapchat|musical_ly|BytedanceWebview|LinkedInApp|Telegram/.test(navigator.userAgent);
export const isStandalone = () => typeof window !== 'undefined'
  && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

// Téléphone ou tablette qui n'est pas un iPhone (Android…) : impossible d'y scanner un QR code affiché.
const isOtherMobile = () => typeof window !== 'undefined'
  && (/Android|Mobi/i.test(navigator.userAgent) || window.matchMedia?.('(pointer: coarse) and (max-width: 900px)').matches);

/** 'ios-safari' | 'ios-other' | 'mobile' (Android…) | 'desktop' */
export const installContext = () => {
  if (isIos()) return isIosSafari() ? 'ios-safari' : 'ios-other';
  return isOtherMobile() ? 'mobile' : 'desktop';
};

// Bouton « ⋯ » de Safari, dessiné : le caractère Unicode n'est pas dans la police du site.
const MoreDots = () => <Ellipsis size={15} strokeWidth={2.4} className="mx-0.5 inline -mt-0.5" aria-label="trois points" />;

const StepIcon = ({ children }) => (
  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper text-ink ring-1 ring-line" aria-hidden>{children}</span>
);

/** Les trois gestes Safari. `tu` : tutoiement (espace de préparation) ; sinon vouvoiement (site public). */
export const IosInstallSteps = ({ tu = false, className = '' }) => (
  <ol className={`grid gap-3 text-[15px] leading-snug text-ink ${className}`}>
    <li className="flex items-center gap-3">
      <StepIcon><Share size={16} /></StepIcon>
      <span>{tu ? 'Touche ' : 'Touchez '}<strong className="font-semibold">Partager</strong> (sur iOS 26&nbsp;: <MoreDots /> en bas à droite, puis <strong className="font-semibold">Partager</strong>)</span>
    </li>
    <li className="flex items-center gap-3">
      <StepIcon><PlusSquare size={16} /></StepIcon>
      <span>{tu ? 'Choisis ' : 'Choisissez '}<strong className="font-semibold">Sur l’écran d’accueil</strong> (au besoin, <strong className="font-semibold">En voir plus</strong>)</span>
    </li>
    <li className="flex items-center gap-3">
      <StepIcon><span className="text-[13px] font-bold">3</span></StepIcon>
      <span>{tu ? 'Touche ' : 'Touchez '}<strong className="font-semibold">Ajouter</strong>, en haut à droite</span>
    </li>
  </ol>
);

const CopyLink = ({ share = false }) => {
  const [copied, setCopied] = useState(false);
  const canShare = share && typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const send = () => navigator.share({ title: 'Installer Fatafalta sur iPhone', url: INSTALL_URL }).catch(() => {});
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_URL);
    } catch (error) {
      // Navigateurs intégrés sans accès au presse-papiers : sélection manuelle du lien affiché.
      const field = document.getElementById('ios-install-link');
      field?.select();
      document.execCommand?.('copy');
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <div className="mt-5 grid gap-2.5">
      <label htmlFor="ios-install-link" className="sr-only">Lien à ouvrir dans Safari</label>
      <input id="ios-install-link" readOnly value={INSTALL_URL} onFocus={(event) => event.target.select()} className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-[14px] text-ink-soft" />
      {canShare ? <Button onClick={send} icon={Send} className="w-full">Envoyer le lien</Button> : null}
      <Button onClick={copy} icon={copied ? Check : Copy} variant={canShare ? 'secondary' : 'primary'} className="w-full">{copied ? 'Lien copié' : 'Copier le lien'}</Button>
    </div>
  );
};

export const IosInstallDialog = ({ open, onClose }) => {
  const [context, setContext] = useState('desktop');
  useEffect(() => { if (open) setContext(installContext()); }, [open]);
  return (
    <Modal open={open} onClose={onClose} title="Installer Fatafalta sur iPhone">
      <div className="flex items-center gap-3">
        <img src="/icons/icon-192.png" alt="" width={48} height={48} className="h-12 w-12 rounded-[12px] shadow-soft" />
        <div>
          <p className="text-[18px] font-bold tracking-[-0.02em] text-ink">Fatafalta sur votre iPhone</p>
          <p className="text-[13px] text-ink-soft">Gratuit · sans App Store · plein écran</p>
        </div>
      </div>

      {context === 'ios-safari' ? (
        <>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-soft">Trois gestes dans Safari, et Fatafalta s’ouvre depuis votre écran d’accueil comme une application.</p>
          <IosInstallSteps className="mt-5" />
          <p className="mt-5 rounded-2xl bg-paper p-3.5 text-[13px] leading-relaxed text-ink-soft">
            Vous ne voyez pas « Sur l’écran d’accueil » ? Cette page est sans doute ouverte depuis une autre application : touchez <Compass size={13} className="inline -mt-0.5" aria-label="l’icône boussole" /> ou « Ouvrir dans Safari », puis recommencez.
          </p>
        </>
      ) : null}

      {context === 'ios-other' ? (
        <>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-soft">
            L’installation ne fonctionne que dans <strong className="font-semibold text-ink">Safari</strong>. Copiez le lien, ouvrez Safari et collez-le dans la barre d’adresse : le guide s’affichera.
          </p>
          <CopyLink />
          <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">Depuis WhatsApp ou Facebook, vous pouvez aussi toucher <MoreDots /> puis « Ouvrir dans Safari » (ou « Ouvrir dans le navigateur »).</p>
        </>
      ) : null}

      {context === 'mobile' ? (
        <>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-soft">
            Ce guide concerne l’<strong className="font-semibold text-ink">iPhone</strong>. Envoyez-vous ce lien (WhatsApp, SMS, e-mail…), puis ouvrez-le dans <strong className="font-semibold text-ink">Safari</strong> sur l’iPhone : le guide d’installation s’affichera.
          </p>
          <CopyLink share />
        </>
      ) : null}

      {context === 'desktop' ? (
        <>
          <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <img src="/images/qr-installer-iphone.svg" alt={`QR code vers ${INSTALL_URL}`} width={168} height={168} className="h-[168px] w-[168px] shrink-0 rounded-2xl border border-line bg-white p-2.5" />
            <ol className="grid gap-3 text-[15px] leading-snug text-ink">
              <li className="flex items-center gap-3"><StepIcon><Camera size={16} /></StepIcon><span>Sur l’iPhone, ouvrez l’<strong className="font-semibold">appareil photo</strong></span></li>
              <li className="flex items-center gap-3"><StepIcon><ScanLine size={16} /></StepIcon><span>Visez ce code : un lien <strong className="font-semibold">fatafalta.com</strong> apparaît</span></li>
              <li className="flex items-center gap-3"><StepIcon><Link2 size={16} /></StepIcon><span>Touchez-le : Safari s’ouvre avec le guide d’installation</span></li>
            </ol>
          </div>
          <p className="mt-5 border-t border-line pt-4 text-[13px] leading-relaxed text-ink-muted">
            Pas d’appareil photo sous la main ? Ouvrez <span className="whitespace-nowrap font-medium text-ink">fatafalta.com/?installer=iphone</span> dans Safari sur l’iPhone.
          </p>
        </>
      ) : null}
    </Modal>
  );
};

/**
 * Section de l'accueil « Fatafalta sur votre iPhone ». Masquée dans l'application installée.
 * L'adresse ?installer=iphone (QR code, lien copié) ouvre directement le guide.
 */
export const IosInstallSection = () => {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (isStandalone()) return;
    setVisible(true);
    if (new URLSearchParams(window.location.search).get('installer') === 'iphone') setOpen(true);
  }, []);
  if (!visible) return null;
  return (
    <section aria-labelledby="ios-install-title" className="pb-12 md:pb-16">
      <Container>
        <div className="flex flex-col gap-5 rounded-3xl border border-line bg-white p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-start gap-4 sm:items-center">
            <img src="/icons/icon-192.png" alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-[14px] shadow-soft" />
            <div className="min-w-0">
              <h2 id="ios-install-title" className="text-[20px] font-bold tracking-[-0.02em] text-ink">Fatafalta sur votre iPhone</h2>
              <p className="mt-1 max-w-xl text-[15px] leading-relaxed text-ink-soft">Installez l’application depuis Safari : une icône sur l’écran d’accueil, en plein écran, sans passer par l’App Store.</p>
            </div>
          </div>
          <Button onClick={() => setOpen(true)} icon={Smartphone} className="shrink-0">Installer sur iPhone</Button>
        </div>
      </Container>
      <IosInstallDialog open={open} onClose={() => setOpen(false)} />
    </section>
  );
};
