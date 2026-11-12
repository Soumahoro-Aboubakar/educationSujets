const fs = require('node:fs');

const ADVICE = 'Créer un extrait vertical 9:16 (par exemple 1080×1920), MP4 H.264, 23–60 i/s, dans la durée autorisée, puis utiliser --tiktok-fichier ; ou désactiver TikTok avec --sans-tiktok. Le cours complet reste destiné à YouTube/Facebook.';
const invalid = () => { throw new Error(`TikTok : MP4 standard non fragmenté, piste vidéo unique et métadonnées lisibles requis. ${ADVICE}`); };

// Lecture ISO-BMFF native et bornée : aucun ffprobe, binaire ou module supplémentaire.
// Les profils inconnus sont refusés plutôt que de faire confiance à des dimensions déclarées par l'utilisateur.
function probeMp4(file) {
  const fd = fs.openSync(file, 'r');
  const size = fs.fstatSync(fd).size;
  const read = (offset, length) => {
    if (length < 0 || length > 16 * 1024 * 1024 || offset + length > size) invalid();
    const data = Buffer.alloc(length);
    if (fs.readSync(fd, data, 0, length, offset) !== length) invalid();
    return data;
  };
  let boxesVisited = 0;
  const boxes = (start, end) => {
    const result = [];
    while (start < end) {
      if (++boxesVisited > 100000 || end - start < 8) invalid();
      const head = read(start, 8); const type = head.toString('ascii', 4, 8);
      let length = head.readUInt32BE(0); let header = 8;
      if (length === 1) { length = Number(read(start + 8, 8).readBigUInt64BE()); header = 16; }
      else if (length === 0) length = end - start;
      if (!Number.isSafeInteger(length) || length < header || start + length > end) invalid();
      result.push({ type, start: start + header, end: start + length }); start += length;
    }
    return result;
  };
  const child = (parent, type) => {
    const hits = boxes(parent.start, parent.end).filter((b) => b.type === type);
    if (hits.length !== 1) invalid();
    return hits[0];
  };
  const payload = (box) => read(box.start, box.end - box.start);
  const timing = (data) => {
    const version = data[0]; if (![0, 1].includes(version)) invalid();
    const scale = data.readUInt32BE(version === 1 ? 20 : 12);
    const duration = version === 1 ? Number(data.readBigUInt64BE(24)) : data.readUInt32BE(16);
    if (!scale || !Number.isSafeInteger(duration) || duration <= 0) invalid();
    return { scale, duration, seconds: duration / scale };
  };
  try {
    const root = boxes(0, size);
    const ftyp = root.find((b) => b.type === 'ftyp');
    if (!ftyp || root.some((b) => b.type === 'moof') || !root.some((b) => b.type === 'mdat')) invalid();
    const brands = payload(ftyp);
    if (brands.length < 8 || !Array.from({ length: brands.length / 4 }, (_, i) => brands.toString('ascii', i * 4, i * 4 + 4))
      .some((brand) => /^(isom|iso[2-9]|mp4[12]|avc1)$/.test(brand))) invalid();
    const moovs = root.filter((b) => b.type === 'moov'); if (moovs.length !== 1) invalid();
    const moov = moovs[0];
    if (boxes(moov.start, moov.end).some((b) => b.type === 'mvex')) invalid();
    const movie = timing(payload(child(moov, 'mvhd')));
    const videos = boxes(moov.start, moov.end).filter((b) => b.type === 'trak').filter((track) => {
      const hdlr = payload(child(child(track, 'mdia'), 'hdlr'));
      return hdlr.toString('ascii', 8, 12) === 'vide';
    });
    if (videos.length !== 1) invalid();
    const track = videos[0]; const mdia = child(track, 'mdia');
    // Les edit lists complexes peuvent masquer des médias plus longs : profil conservateur.
    const media = timing(payload(child(mdia, 'mdhd')));
    const tkhd = payload(child(track, 'tkhd')); const v = tkhd[0];
    if (![0, 1].includes(v)) invalid();
    const matrix = v === 1 ? 52 : 40; const dim = v === 1 ? 88 : 76;
    const a = tkhd.readInt32BE(matrix); const b = tkhd.readInt32BE(matrix + 4);
    const c = tkhd.readInt32BE(matrix + 12); const d = tkhd.readInt32BE(matrix + 16);
    const straight = Math.abs(a) === 65536 && Math.abs(d) === 65536 && b === 0 && c === 0;
    const rotated = a === 0 && d === 0 && Math.abs(b) === 65536 && Math.abs(c) === 65536;
    if (!straight && !rotated) invalid();
    let width = tkhd.readUInt32BE(dim) / 65536; let height = tkhd.readUInt32BE(dim + 4) / 65536;
    const stbl = child(child(mdia, 'minf'), 'stbl'); const stsd = payload(child(stbl, 'stsd'));
    if (stsd.readUInt32BE(4) !== 1 || stsd.length < 44) invalid();
    const codec = stsd.toString('ascii', 12, 16);
    const encodedWidth = stsd.readUInt16BE(40); const encodedHeight = stsd.readUInt16BE(42);
    if (width !== encodedWidth || height !== encodedHeight) invalid();
    if (rotated) [width, height] = [height, width];
    const stts = payload(child(stbl, 'stts')); const count = stts.readUInt32BE(4);
    if (!count || stts.length !== 8 + count * 8) invalid();
    let samples = 0; let ticks = 0; let minFps = Infinity; let maxFps = 0;
    for (let i = 0; i < count; i += 1) {
      const n = stts.readUInt32BE(8 + i * 8); const delta = stts.readUInt32BE(12 + i * 8);
      if (!n || !delta) invalid();
      samples += n; ticks += n * delta;
      minFps = Math.min(minFps, media.scale / delta); maxFps = Math.max(maxFps, media.scale / delta);
    }
    if (!samples || !Number.isSafeInteger(ticks) || Math.abs(ticks - media.duration) > media.scale) invalid();
    return { container: 'mp4', codec, width, height, durationSec: Math.max(movie.seconds, media.seconds, ticks / media.scale), minFps, maxFps, size };
  } catch (error) {
    if (error.message.startsWith('TikTok :')) throw error;
    invalid();
  } finally { fs.closeSync(fd); }
}
function validateMedia(media, maxDuration = 180) {
  if (!Number.isFinite(maxDuration) || maxDuration <= 0 || maxDuration > 600) throw new Error('TIKTOK_MAX_DURATION_SEC doit être compris entre 0 et 600.');
  if (media.container !== 'mp4' || !['avc1', 'hvc1', 'hev1'].includes(media.codec)
    || !Number.isFinite(media.durationSec) || media.durationSec <= 0 || media.durationSec > maxDuration
    || !Number.isSafeInteger(media.size) || media.size <= 0 || media.size > 4_000_000_000
    || !Number.isFinite(media.minFps) || !Number.isFinite(media.maxFps) || media.minFps < 23 || media.maxFps > 60
    || ![media.width, media.height].every((n) => Number.isInteger(n) && n >= 360 && n <= 4096)
    || media.height <= media.width) {
    throw new Error(`TikTok : format vertical, dimensions 360–4096 px, 23–60 i/s, MP4 H.264/H.265, ≤4 Go et durée ≤${maxDuration} s requis. ${ADVICE}`);
  }
  return media;
}
module.exports = { probeMp4, validateMedia };
