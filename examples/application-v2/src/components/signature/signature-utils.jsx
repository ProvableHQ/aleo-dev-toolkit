export const provingServiceUrl = "/api/prove";

export const fixed_point_scaling_factor = 16;
export const int_type = "i64";

/**
 * Convert a canvas image into the 28×28 grayscale matrix consumed by the model.
 *
 * The function now supports **both** of the following UI variants:
 *   1. Legacy – black ink on an opaque white canvas.
 *   2. New    – white ink on a *transparent* canvas.
 *
 * It does that by
 *   • Detecting whether the background is mostly transparent.
 *   • Treating fully-transparent pixels as background (value 0).
 *   • Returning high values (≈255) for ink regardless of its colour.
 */
export const processImage = async (image) => {
  // ──────────────────────────────────────────────────────────────────────────
  // 1 · Draw the incoming <img|canvas> onto a temporary 112×112 canvas first
  //     so that the final 28×28 down-sample retains anti-aliased strokes.
  // ──────────────────────────────────────────────────────────────────────────
  const tmp = document.createElement("canvas");
  tmp.width = tmp.height = 112;
  const tCtx = tmp.getContext("2d");
  tCtx.imageSmoothingEnabled = true;
  tCtx.imageSmoothingQuality = "high";
  tCtx.drawImage(image, 0, 0, 112, 112);

  // Final 28×28 canvas
  const fin = document.createElement("canvas");
  fin.width = fin.height = 28;
  const fCtx = fin.getContext("2d");
  fCtx.imageSmoothingEnabled = true;
  fCtx.imageSmoothingQuality = "high";
  fCtx.drawImage(tmp, 0, 0, 28, 28);

  // ──────────────────────────────────────────────────────────────────────────
  // 2 · Analyse pixel data
  // ──────────────────────────────────────────────────────────────────────────
  const { data } = fCtx.getImageData(0, 0, 28, 28); // RGBA flat array

  // Decide if we are on the new transparent canvas (>50 % pixels alpha ≈ 0)
  let transparentCount = 0;
  for (let a = 3; a < data.length; a += 4) {
    if (data[a] < 8) transparentCount++; // treat <8 as fully transparent
  }
  const transparentBG = transparentCount > data.length / 8; // >50 %

  // Output matrix
  const grayscaleData = Array.from(
    { length: 28 },
    () => new Uint8ClampedArray(28)
  );

  // Helper that returns an ink-high value in [0,255]
  const toInkValue = (gray, invert) => {
    return invert
      ? Math.min(255, (255 - gray) * 1.2) // dark ink variant
      : Math.min(255, gray * 1.2); // light ink variant
  };

  // Main loop
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    const row = Math.floor(i / 4 / 28);
    const col = (i / 4) % 28;

    // Transparent pixel on a transparent-BG canvas ⇒ background (0)
    if (transparentBG && a === 0) {
      grayscaleData[row][col] = 0;
      continue;
    }

    const gray = 0.4 * r + 0.4 * g + 0.2 * b; // perceptual weighted gray

    // If we *do* have an opaque background (legacy screen) we invert so that
    // black strokes turn into high values and white background into zero.
    const invert = !transparentBG;
    grayscaleData[row][col] = toInkValue(gray, invert);
  }

  return grayscaleData;
};

export function computeSoftmax(values, scalingFactor = 1) {
  const scaled = values.map((v) => v / scalingFactor);
  const maxVal = Math.max(...scaled);
  const exps = scaled.map((v) => Math.exp(v - maxVal));
  const sumExp = exps.reduce((acc, v) => acc + v, 0);
  return exps.map((v) => v / sumExp);
}

export function convert_proof_to_softmax(executionResponse) {
  const json =
    typeof executionResponse === "string"
      ? JSON.parse(executionResponse)
      : executionResponse;
  const transitions = json.execution?.transitions ?? json.transitions;
  if (!transitions)
    throw new Error("Invalid execution response: no transitions found");

  const SCALE = fixed_point_scaling_factor ** 3;
  const outputs = transitions[0].outputs;

  const outputs_fixed_point = outputs.slice(0, 2).map((o) => {
    return {
      id: o.id,
      type: o.type,
      value: o.value,
    };
  });

  const output_hash = outputs[outputs.length - 1]; // model hash
  console.log("executionResponse", executionResponse);
  console.log("Leo model hash:", output_hash.value);

  const floatVals = outputs_fixed_point.map(
    (o) => Number(String(o.value).replace(int_type, "")) / SCALE
  );
  return computeSoftmax(floatVals);
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper: produce a circular SVG thumbnail out of a 28×28 signature matrix.
// ──────────────────────────────────────────────────────────────────────────────
export const signatureToSVG = (signatureData, size = 48) => {
  const px = size / 28;
  let svg = "";

  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 28; x++) {
      const v = signatureData[y][x];
      if (v > 20) {
        const op = Math.min((v / 255) * 1.2, 1);
        const cx = x * px + px / 2;
        const cy = y * px + px / 2;
        const rad = px * 0.6;
        svg += `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="#4ade80" opacity="${op}" />`;
      }
    }
  }
  return `\n        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">\n            ${svg}\n        </svg>`;
};

export function getBoundingBox(img) {
  const height = img.length;
  const width = img[0].length;

  let rmin = height;
  let rmax = 0;
  let cmin = width;
  let cmax = 0;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (img[row][col] !== 0) {
        // Non-zero pixel
        if (row < rmin) rmin = row;
        if (row > rmax) rmax = row;
        if (col < cmin) cmin = col;
        if (col > cmax) cmax = col;
      }
    }
  }

  // If no non-zero pixels were found, return an empty array
  if (rmax < rmin || cmax < cmin) {
    return [];
  }

  // Extract the bounding box
  const cropped = img
    .slice(rmin, rmax + 1)
    .map((row) => row.slice(cmin, cmax + 1));

  return cropped;
}

export const resizeImage = (image, newSize) => {
  const height = image.length;
  const width = image[0].length;
  const resizedImage = Array.from(
    { length: newSize },
    () => new Uint8ClampedArray(newSize)
  );

  const xScale = width / newSize;
  const yScale = height / newSize;

  for (let i = 0; i < newSize; i++) {
    for (let j = 0; j < newSize; j++) {
      const xStart = Math.floor(j * xScale);
      const yStart = Math.floor(i * yScale);
      const xEnd = Math.floor((j + 1) * xScale);
      const yEnd = Math.floor((i + 1) * yScale);

      let sum = 0;
      let count = 0;

      for (let y = yStart; y < yEnd; y++) {
        for (let x = xStart; x < xEnd; x++) {
          if (y >= 0 && y < height && x >= 0 && x < width) {
            sum += image[y][x];
            count++;
          }
        }
      }

      resizedImage[i][j] = count > 0 ? Math.max(0, Math.round(sum / count)) : 0;
    }
  }

  return resizedImage;
};

function computeIntegralImage(image) {
  const height = image.length;
  const width = image[0].length;
  const integralImage = Array.from({ length: height }, () =>
    new Array(width).fill(0)
  );

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      integralImage[y][x] =
        image[y][x] +
        (integralImage[y][x - 1] || 0) +
        (integralImage[y - 1] ? integralImage[y - 1][x] : 0) -
        (integralImage[y - 1] ? integralImage[y - 1][x - 1] || 0 : 0);
    }
  }

  return integralImage;
}

function sumRegion(integralImage, top_left, bottom_right) {
  const [tl_y, tl_x] = top_left;
  const [br_y, br_x] = bottom_right;

  let total = integralImage[br_y][br_x];
  if (tl_y > 0) total -= integralImage[tl_y - 1][br_x];
  if (tl_x > 0) total -= integralImage[br_y][tl_x - 1];
  if (tl_y > 0 && tl_x > 0) total += integralImage[tl_y - 1][tl_x - 1];

  return total;
}

export function computeHaarFeatures(image) {
  const size = image.length;
  if (size !== image[0].length) {
    throw new Error("The input image must be square.");
  }

  const integralImage = computeIntegralImage(image);
  const features = [];

  for (let i = 0; i < size; i += 3) {
    for (let j = 0; j < size; j += 3) {
      if (i + 6 > size || j + 6 > size) continue;

      // Horizontal feature
      const horizontal_feature_value =
        sumRegion(integralImage, [i, j], [i + 2, j + 5]) -
        sumRegion(integralImage, [i + 3, j], [i + 5, j + 5]);

      // Vertical feature
      const vertical_feature_value =
        sumRegion(integralImage, [i, j], [i + 5, j + 2]) -
        sumRegion(integralImage, [i, j + 3], [i + 5, j + 5]);

      features.push(horizontal_feature_value);
      features.push(vertical_feature_value);
    }
  }

  return features;
}

export function aspectRatio(image, threshold = 0.5) {
  const binImage = image.map((row) =>
    row.map((pixel) => (pixel > threshold ? 1 : 0))
  );
  const rows = binImage.length;
  const cols = binImage[0].length;

  let minRow = rows,
    maxRow = 0,
    minCol = cols,
    maxCol = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (binImage[y][x] === 1) {
        minRow = Math.min(minRow, y);
        maxRow = Math.max(maxRow, y);
        minCol = Math.min(minCol, x);
        maxCol = Math.max(maxCol, x);
      }
    }
  }

  const width = maxCol - minCol + 1;
  const height = maxRow - minRow + 1;

  if (height === 0) return 1.0;
  return width / height;
}

function labelRegions(binImage) {
  const rows = binImage.length;
  const cols = binImage[0].length;
  const labels = Array.from({ length: rows }, () => new Array(cols).fill(0));
  let label = 0;

  function dfs(y, x) {
    if (
      y < 0 ||
      y >= rows ||
      x < 0 ||
      x >= cols ||
      binImage[y][x] === 0 ||
      labels[y][x] > 0
    ) {
      return;
    }

    labels[y][x] = label;

    dfs(y - 1, x);
    dfs(y + 1, x);
    dfs(y, x - 1);
    dfs(y, x + 1);
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (binImage[y][x] === 1 && labels[y][x] === 0) {
        label += 1;
        dfs(y, x);
      }
    }
  }

  return { labels, numRegions: label };
}

export function numRegionsBelowThreshold(image, threshold = 0.5) {
  const binImage = image.map((row) =>
    row.map((pixel) => (pixel < threshold ? 1 : 0))
  );
  const { numRegions } = labelRegions(binImage);
  return numRegions;
}
