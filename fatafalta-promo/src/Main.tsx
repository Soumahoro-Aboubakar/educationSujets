import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, interpolate, useCurrentFrame, continueRender, delayRender } from 'remotion';
import { SCENES, OVERLAP, FPS, TOTAL } from './timeline';
import { Captions } from './components/Captions';
import { S1Hook } from './scenes/S1Hook';
import { S2Reveal } from './scenes/S2Reveal';
import { S3Sujets } from './scenes/S3Sujets';
import { S4Lecon } from './scenes/S4Lecon';
import { S5Progres } from './scenes/S5Progres';
import { S6Blanc } from './scenes/S6Blanc';
import { S7Reve } from './scenes/S7Reve';
import { S8Cta } from './scenes/S8Cta';
import { C } from './theme';

const COMPS = [S1Hook, S2Reveal, S3Sujets, S4Lecon, S5Progres, S6Blanc, S7Reve, S8Cta];

const useFonts = () => {
  const [h] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const faces = [
      new FontFace('Inter', `url(${staticFile('fonts/inter-latin-v20.woff2')})`, { weight: '100 900' }),
      new FontFace('Inter', `url(${staticFile('fonts/inter-latin-ext-v20.woff2')})`, { weight: '100 900', unicodeRange: 'U+0100-024F, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF' }),
    ];
    Promise.all(faces.map((x) => x.load())).then((l) => { l.forEach((x) => (document as any).fonts.add(x)); continueRender(h); });
  }, [h]);
};

/** Musique : baissée pendant la voix (ducking), remontée dans les respirations et à la fin. */
const musicVolume = (f: number) => {
  let speaking = 0;
  for (const s of SCENES) {
    const a = s.voiceAt, b = s.voiceAt + s.voice.duration * FPS;
    speaking = Math.max(speaking, interpolate(f, [a - 8, a, b, b + 12], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  }
  const fadeOut = interpolate(f, [TOTAL - 45, TOTAL], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (0.42 - 0.3 * speaking) * fadeOut;
};

export const Main: React.FC = () => {
  useFonts();
  return (
    <AbsoluteFill style={{ background: C.night }}>
      {SCENES.map((s, i) => {
        const Comp = COMPS[i]; const from = Math.max(0, s.start - (i ? OVERLAP : 0));
        return (
          <Sequence key={i} from={from} durationInFrames={s.frames + (i ? OVERLAP : 0)} name={`Scène ${i + 1}`}>
            <Fade first={i === 0}><Comp scene={s} lead={i ? OVERLAP : 0} /></Fade>
          </Sequence>
        );
      })}
      {SCENES.map((s) => <Sequence key={'v' + s.i} from={s.voiceAt} name={`Voix ${s.i + 1}`}><Audio src={staticFile(s.voice.file)} volume={1} /></Sequence>)}
      <Audio src={staticFile('music/bed.wav')} volume={musicVolume} />
      <Captions />
    </AbsoluteFill>
  );
};

const Fade: React.FC<{ children: React.ReactNode; first: boolean }> = ({ children, first }) => {
  const f = useCurrentFrame();
  const o = first ? 1 : interpolate(f, [0, OVERLAP], [0, 1], { extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};
