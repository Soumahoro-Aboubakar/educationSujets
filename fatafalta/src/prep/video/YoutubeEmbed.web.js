import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

/**
 * Lecteur YouTube pour l'aperçu web (Expo web) : iframe officielle pilotée par l'API postMessage.
 * Même interface que YoutubeEmbed.native.js ; sur téléphone c'est la version native qui sert.
 */
const STATES = { '-1': 'unstarted', 0: 'ended', 1: 'playing', 2: 'paused', 3: 'buffering', 5: 'video cued' };

const YoutubeEmbed = forwardRef(({ videoId, width, height, playing, language = 'fr', onStateChange, onReady, onError }, ref) => {
  const frame = useRef(null);
  const time = useRef(0);
  const ready = useRef(false);
  const callbacks = useRef({ onStateChange, onReady, onError });
  callbacks.current = { onStateChange, onReady, onError };

  const command = (func, args = []) => frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');

  useImperativeHandle(ref, () => ({ getCurrentTime: () => Promise.resolve(time.current) }), []);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.source !== frame.current?.contentWindow) return;
      let data;
      try { data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch (error) { return; }
      if ((data?.event === 'onReady' || data?.event === 'initialDelivery') && !ready.current) {
        ready.current = true;
        // Abonnement explicite aux changements d'état (lecture, pause, fin) et aux erreurs.
        command('addEventListener', ['onStateChange']);
        command('addEventListener', ['onError']);
        callbacks.current.onReady?.();
      }
      if (data?.event === 'onStateChange') callbacks.current.onStateChange?.(STATES[data.info] || 'unstarted');
      if (data?.event === 'onError') callbacks.current.onError?.(String(data.info));
      if (data?.event === 'infoDelivery') {
        if (typeof data.info?.currentTime === 'number') time.current = data.info.currentTime;
        if (typeof data.info?.playerState === 'number') callbacks.current.onStateChange?.(STATES[data.info.playerState] || 'unstarted');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => { if (ready.current) command(playing ? 'playVideo' : 'pauseVideo'); }, [playing]);

  const listen = () => {
    // Abonnement aux événements du lecteur (protocole de l'API IFrame).
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: videoId, channel: 'widget' }), '*');
  };

  const params = new URLSearchParams({ enablejsapi: '1', rel: '0', playsinline: '1', iv_load_policy: '3', hl: language, cc_lang_pref: language, origin: window.location.origin });
  return React.createElement('iframe', {
    ref: frame,
    src: `https://www.youtube.com/embed/${videoId}?${params}`,
    width,
    height,
    title: 'Lecteur vidéo YouTube',
    onLoad: listen,
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
    allowFullScreen: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
    style: { border: 0, display: 'block', width, height, backgroundColor: 'transparent' },
  });
});

export default YoutubeEmbed;
