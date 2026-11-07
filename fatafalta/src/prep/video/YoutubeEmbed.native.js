import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import YoutubePlayer from 'react-native-youtube-iframe';

/**
 * Lecteur YouTube intégré (iOS / Android) : lecteur officiel IFrame dans une WebView
 * (react-native-youtube-iframe). Le lecteur reste entier et visible : aucune couche de
 * l'application ne recouvre ses commandes (règles d'intégration de YouTube).
 *
 * Interface commune avec YoutubeEmbed.web.js :
 *   props  videoId, width, height, playing, language, onStateChange(etat), onReady(), onError(code)
 *   ref    getCurrentTime() → Promise<secondes>
 */
const YoutubeEmbed = forwardRef(({ videoId, width, height, playing, language = 'fr', onStateChange, onReady, onError }, ref) => {
  const player = useRef(null);
  useImperativeHandle(ref, () => ({
    getCurrentTime: () => player.current?.getCurrentTime?.() ?? Promise.resolve(0),
  }), []);
  return (
    <YoutubePlayer
      ref={player}
      videoId={videoId}
      width={width}
      height={height}
      play={playing}
      onChangeState={onStateChange}
      onReady={onReady}
      onError={onError}
      initialPlayerParams={{ rel: false, playerLang: language, cc_lang_pref: language, iv_load_policy: 3 }}
      webViewStyle={{ backgroundColor: 'transparent', opacity: 0.99 }}
      webViewProps={{
        allowsFullscreenVideo: true,
        // Page qui ne charge pas (hors ligne, réseau coupé) : on bascule sur l'état « réessayer ».
        onError: () => onError?.('reseau'),
        onHttpError: () => onError?.('reseau'),
      }}
    />
  );
});

export default YoutubeEmbed;
