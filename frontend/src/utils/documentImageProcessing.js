const A4_HEIGHT_TO_WIDTH = 841.89 / 595.28;
const ANALYSIS_MAX_SIDE = 720;
const PROCESSING_MAX_SIDE = 3600;
const OUTPUT_MAX_LONG_SIDE = 2400;
const MIN_DOCUMENT_AREA_RATIO = 0.12;
const EDGE_INSET_RATIO = 0.006;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const polygonArea = (points) => {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return Math.abs(area) / 2;
};

const orderCorners = (points) => {
  const ordered = new Array(4);

  points.forEach((point) => {
    const sum = point.x + point.y;
    const diff = point.x - point.y;

    if (!ordered[0] || sum < ordered[0].score) ordered[0] = { ...point, score: sum };
    if (!ordered[2] || sum > ordered[2].score) ordered[2] = { ...point, score: sum };
    if (!ordered[1] || diff > ordered[1].score) ordered[1] = { ...point, score: diff };
    if (!ordered[3] || diff < ordered[3].score) ordered[3] = { ...point, score: diff };
  });

  return ordered.map(({ score, ...point }) => point);
};

const insetCorners = (corners, ratio) => {
  const center = corners.reduce(
    (acc, point) => ({ x: acc.x + point.x / corners.length, y: acc.y + point.y / corners.length }),
    { x: 0, y: 0 }
  );

  return corners.map((point) => ({
    x: point.x + (center.x - point.x) * ratio,
    y: point.y + (center.y - point.y) * ratio,
  }));
};

const getScaledSize = (width, height, maxSide) => {
  const side = Math.max(width, height);
  if (side <= maxSide) return { width, height };
  const scale = maxSide / side;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const loadImageBitmap = async (file) => {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file, { imageOrientation: 'from-image' });
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
};

const drawImageToCanvas = (image, targetSize) => {
  const canvas = document.createElement('canvas');
  canvas.width = targetSize.width;
  canvas.height = targetSize.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error("Impossible de preparer le traitement de l'image.");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, targetSize.width, targetSize.height);

  return { canvas, ctx };
};

const getOtsuThreshold = (histogram, totalPixels) => {
  let totalSum = 0;
  for (let value = 0; value < 256; value += 1) {
    totalSum += value * histogram[value];
  }

  let backgroundWeight = 0;
  let backgroundSum = 0;
  let maxVariance = 0;
  let threshold = 180;

  for (let value = 0; value < 256; value += 1) {
    backgroundWeight += histogram[value];
    if (backgroundWeight === 0) continue;

    const foregroundWeight = totalPixels - backgroundWeight;
    if (foregroundWeight === 0) break;

    backgroundSum += value * histogram[value];
    const backgroundMean = backgroundSum / backgroundWeight;
    const foregroundMean = (totalSum - backgroundSum) / foregroundWeight;
    const variance = backgroundWeight * foregroundWeight * (backgroundMean - foregroundMean) ** 2;

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = value;
    }
  }

  return threshold;
};

const getLargestComponentCorners = (mask, width, height) => {
  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  let best = null;

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;

    let head = 0;
    let tail = 0;
    let count = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let tl = { x: 0, y: 0, score: Infinity };
    let tr = { x: 0, y: 0, score: -Infinity };
    let br = { x: 0, y: 0, score: -Infinity };
    let bl = { x: 0, y: 0, score: Infinity };

    queue[tail] = start;
    tail += 1;
    visited[start] = 1;

    while (head < tail) {
      const index = queue[head];
      head += 1;
      count += 1;

      const x = index % width;
      const y = Math.floor(index / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      const sum = x + y;
      const diff = x - y;
      if (sum < tl.score) tl = { x, y, score: sum };
      if (diff > tr.score) tr = { x, y, score: diff };
      if (sum > br.score) br = { x, y, score: sum };
      if (diff < bl.score) bl = { x, y, score: diff };

      const left = index - 1;
      const right = index + 1;
      const up = index - width;
      const down = index + width;

      if (x > 0 && mask[left] && !visited[left]) {
        visited[left] = 1;
        queue[tail] = left;
        tail += 1;
      }
      if (x < width - 1 && mask[right] && !visited[right]) {
        visited[right] = 1;
        queue[tail] = right;
        tail += 1;
      }
      if (y > 0 && mask[up] && !visited[up]) {
        visited[up] = 1;
        queue[tail] = up;
        tail += 1;
      }
      if (y < height - 1 && mask[down] && !visited[down]) {
        visited[down] = 1;
        queue[tail] = down;
        tail += 1;
      }
    }

    if (!best || count > best.count) {
      best = {
        count,
        bounds: { minX, minY, maxX, maxY },
        corners: orderCorners([tl, tr, br, bl]),
      };
    }
  }

  return best;
};

const detectDocumentCorners = (imageData) => {
  const { data, width, height } = imageData;
  const histogram = new Uint32Array(256);
  const gray = new Uint8Array(width * height);

  for (let i = 0, pixel = 0; i < data.length; i += 4, pixel += 1) {
    const value = Math.round(data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722);
    gray[pixel] = value;
    histogram[value] += 1;
  }

  const otsu = getOtsuThreshold(histogram, gray.length);
  const threshold = clamp(otsu + 8, 120, 238);
  const mask = new Uint8Array(gray.length);
  let selected = 0;

  for (let index = 0; index < gray.length; index += 1) {
    const alpha = data[index * 4 + 3];
    if (alpha > 12 && gray[index] >= threshold) {
      mask[index] = 1;
      selected += 1;
    }
  }

  const selectedRatio = selected / gray.length;
  if (selectedRatio < 0.04 || selectedRatio > 0.94) {
    return null;
  }

  const component = getLargestComponentCorners(mask, width, height);
  if (!component) return null;

  const areaRatio = polygonArea(component.corners) / (width * height);
  const componentRatio = component.count / gray.length;
  const boxWidth = component.bounds.maxX - component.bounds.minX;
  const boxHeight = component.bounds.maxY - component.bounds.minY;

  if (
    areaRatio < MIN_DOCUMENT_AREA_RATIO ||
    componentRatio < 0.08 ||
    boxWidth < width * 0.25 ||
    boxHeight < height * 0.25
  ) {
    return null;
  }

  return insetCorners(component.corners, EDGE_INSET_RATIO);
};

const solveHomography = (from, to) => {
  const matrix = [];

  for (let i = 0; i < 4; i += 1) {
    const { x, y } = from[i];
    const { x: u, y: v } = to[i];
    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }

  for (let column = 0; column < 8; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < 8; row += 1) {
      if (Math.abs(matrix[row][column]) > Math.abs(matrix[pivot][column])) {
        pivot = row;
      }
    }

    if (Math.abs(matrix[pivot][column]) < 1e-8) {
      return null;
    }

    [matrix[column], matrix[pivot]] = [matrix[pivot], matrix[column]];
    const divisor = matrix[column][column];

    for (let value = column; value < 9; value += 1) {
      matrix[column][value] /= divisor;
    }

    for (let row = 0; row < 8; row += 1) {
      if (row === column) continue;
      const factor = matrix[row][column];
      for (let value = column; value < 9; value += 1) {
        matrix[row][value] -= factor * matrix[column][value];
      }
    }
  }

  return [
    matrix[0][8],
    matrix[1][8],
    matrix[2][8],
    matrix[3][8],
    matrix[4][8],
    matrix[5][8],
    matrix[6][8],
    matrix[7][8],
    1,
  ];
};

const cubic = (p0, p1, p2, p3, t) => {
  const a0 = -0.5 * p0 + 1.5 * p1 - 1.5 * p2 + 0.5 * p3;
  const a1 = p0 - 2.5 * p1 + 2 * p2 - 0.5 * p3;
  const a2 = -0.5 * p0 + 0.5 * p2;
  return ((a0 * t + a1) * t + a2) * t + p1;
};

const sampleBicubic = (imageData, x, y, channel) => {
  const { data, width, height } = imageData;
  const baseX = Math.floor(x);
  const baseY = Math.floor(y);
  const tx = x - baseX;
  const ty = y - baseY;
  const rows = [];

  for (let row = -1; row <= 2; row += 1) {
    const values = [];
    const py = clamp(baseY + row, 0, height - 1);
    for (let col = -1; col <= 2; col += 1) {
      const px = clamp(baseX + col, 0, width - 1);
      values.push(data[(py * width + px) * 4 + channel]);
    }
    rows.push(cubic(values[0], values[1], values[2], values[3], tx));
  }

  return clamp(Math.round(cubic(rows[0], rows[1], rows[2], rows[3], ty)), 0, 255);
};

const getTargetDocumentSize = (corners) => {
  const [tl, tr, br, bl] = corners;
  const topWidth = distance(tl, tr);
  const bottomWidth = distance(bl, br);
  const leftHeight = distance(tl, bl);
  const rightHeight = distance(tr, br);
  const sourceWidth = Math.max(topWidth, bottomWidth);
  const sourceHeight = Math.max(leftHeight, rightHeight);
  const portrait = sourceHeight >= sourceWidth;
  const sourceLongSide = Math.max(sourceWidth, sourceHeight);
  const longSide = Math.max(600, Math.min(OUTPUT_MAX_LONG_SIDE, Math.round(sourceLongSide)));

  if (portrait) {
    return {
      width: Math.max(1, Math.round(longSide / A4_HEIGHT_TO_WIDTH)),
      height: longSide,
    };
  }

  return {
    width: longSide,
    height: Math.max(1, Math.round(longSide / A4_HEIGHT_TO_WIDTH)),
  };
};

const warpPerspective = (sourceImageData, corners, targetSize) => {
  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = targetSize.width;
  targetCanvas.height = targetSize.height;
  const targetCtx = targetCanvas.getContext('2d');

  if (!targetCtx) {
    throw new Error("Impossible de finaliser le redressement de l'image.");
  }

  const targetImageData = targetCtx.createImageData(targetSize.width, targetSize.height);
  const destination = [
    { x: 0, y: 0 },
    { x: targetSize.width - 1, y: 0 },
    { x: targetSize.width - 1, y: targetSize.height - 1 },
    { x: 0, y: targetSize.height - 1 },
  ];
  const homography = solveHomography(destination, corners);

  if (!homography) {
    return null;
  }

  const [h0, h1, h2, h3, h4, h5, h6, h7] = homography;

  for (let y = 0; y < targetSize.height; y += 1) {
    for (let x = 0; x < targetSize.width; x += 1) {
      const divisor = h6 * x + h7 * y + 1;
      const sourceX = (h0 * x + h1 * y + h2) / divisor;
      const sourceY = (h3 * x + h4 * y + h5) / divisor;
      const index = (y * targetSize.width + x) * 4;

      if (
        sourceX < 0 ||
        sourceY < 0 ||
        sourceX > sourceImageData.width - 1 ||
        sourceY > sourceImageData.height - 1
      ) {
        targetImageData.data[index] = 255;
        targetImageData.data[index + 1] = 255;
        targetImageData.data[index + 2] = 255;
        targetImageData.data[index + 3] = 255;
        continue;
      }

      targetImageData.data[index] = sampleBicubic(sourceImageData, sourceX, sourceY, 0);
      targetImageData.data[index + 1] = sampleBicubic(sourceImageData, sourceX, sourceY, 1);
      targetImageData.data[index + 2] = sampleBicubic(sourceImageData, sourceX, sourceY, 2);
      targetImageData.data[index + 3] = 255;
    }
  }

  targetCtx.putImageData(targetImageData, 0, 0);
  return targetCanvas;
};

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Impossible d'encoder l'image traitee."));
    }, type, quality);
  });

export const processImageFileForDocument = async (file) => {
  const bitmap = await loadImageBitmap(file);
  const sourceSize = getScaledSize(bitmap.width, bitmap.height, PROCESSING_MAX_SIDE);
  const { canvas: sourceCanvas, ctx: sourceCtx } = drawImageToCanvas(bitmap, sourceSize);
  const analysisSize = getScaledSize(sourceSize.width, sourceSize.height, ANALYSIS_MAX_SIDE);
  const { ctx: analysisCtx } = drawImageToCanvas(sourceCanvas, analysisSize);
  const analysisData = analysisCtx.getImageData(0, 0, analysisSize.width, analysisSize.height);
  const detectedCorners = detectDocumentCorners(analysisData);

  if (!detectedCorners) {
    if (typeof bitmap.close === 'function') {
      bitmap.close();
    }

    return {
      blob: file,
      width: bitmap.width,
      height: bitmap.height,
      mimeType: file.type,
      transformed: false,
    };
  }

  const scaleX = sourceSize.width / analysisSize.width;
  const scaleY = sourceSize.height / analysisSize.height;
  const corners = detectedCorners.map((point) => ({ x: point.x * scaleX, y: point.y * scaleY }));
  const targetSize = getTargetDocumentSize(corners);
  const sourceData = sourceCtx.getImageData(0, 0, sourceSize.width, sourceSize.height);
  const transformedCanvas = warpPerspective(sourceData, corners, targetSize);

  if (!transformedCanvas) {
    if (typeof bitmap.close === 'function') {
      bitmap.close();
    }

    return {
      blob: file,
      width: bitmap.width,
      height: bitmap.height,
      mimeType: file.type,
      transformed: false,
    };
  }

  const blob = await canvasToBlob(transformedCanvas, 'image/jpeg', 0.96);

  if (typeof bitmap.close === 'function') {
    bitmap.close();
  }

  return {
    blob,
    width: targetSize.width,
    height: targetSize.height,
    mimeType: 'image/jpeg',
    transformed: true,
  };
};

export const getA4PageSizeForImage = (width, height) =>
  width > height ? { width: 841.89, height: 595.28 } : { width: 595.28, height: 841.89 };

export const getContainedImageLayout = (imageWidth, imageHeight, pageWidth, pageHeight) => {
  const scale = Math.min(pageWidth / imageWidth, pageHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;

  return {
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  };
};
