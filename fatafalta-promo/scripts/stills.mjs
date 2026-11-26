// Images de contrôle : quelques instants clés par scène, dans les deux formats (demi-résolution).
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'path';
const FRAMES = (process.argv[2] || '20,150,260,400,470,560,640,800,980,1100,1250,1380,1450,1560,1700,1850,2000,2180,2350,2560').split(',').map(Number);
const comps = (process.argv[3] || 'Horizontal,Vertical').split(',');
const out = process.argv[4] || 'out/stills';
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
for (const id of comps) {
  const composition = await selectComposition({ serveUrl, id });
  for (const frame of FRAMES) {
    await renderStill({ serveUrl, composition, frame, output: `${out}/${id}-${String(frame).padStart(4, '0')}.png`, scale: 0.5 });
  }
  console.log('ok', id);
}
