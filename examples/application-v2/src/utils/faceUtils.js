// faceUtils.js – optimized cold-start
// -----------------------------------------------------------------------------
//  • Loads the lean “-nobundle” build of @vladmandic/face-api
//  • Picks the fastest TensorFlow.js backend (WebGPU → WASM → WebGL)
//  • Pre-compiles the three networks in requestIdleCallback
//  • Removes artificial waits & UA sniffing; uses hardwareConcurrency
// -----------------------------------------------------------------------------

import * as tf from "@tensorflow/tfjs-core";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import "@tensorflow/tfjs-backend-wasm";
import "@tensorflow/tfjs-backend-webgpu";
import "@tensorflow/tfjs-backend-webgl"; // fallback

// lean build without bundled tfjs
import * as faceapi from "@vladmandic/face-api/dist/face-api.esm-nobundle.js";

const WANT_WEBGPU = false;                           // needs more testing
const IS_IOS      = /iPad|iPhone|iPod/.test(navigator.userAgent);
const IS_MAC      = /Mac/.test(navigator.platform);  // covers Apple Silicon & Intel Macs

const WASM_PATH = "/tfjs-wasm/"; // directory that contains tfjs-wasm/*.wasm files
const MODELS_PATH = "/models";   // directory that contains face-api model files

/* -------------------------------------------------------------------------- */
/* 1. Backend initialisation                                                   */
/* -------------------------------------------------------------------------- */

let backendReadyPromise = null;
export async function initBackend() {
  if (backendReadyPromise) return backendReadyPromise;

  backendReadyPromise = (async () => {
    // tell tfjs-wasm where to fetch its binaries from
    setWasmPaths(WASM_PATH);

    // Candidate order: honour iOS constraints and the feature flag
    const candidates =
    IS_IOS
        ? ["wasm", "webgl"]                              // iOS: WASM → WebGL
        : WANT_WEBGPU
            ? ["webgpu", "wasm", "webgl"]                // opt-in: WebGPU first
            : IS_MAC
                ? ["wasm", "webgl"]                      // macOS: WASM → WebGL (better for training)
                : ['wasm', 'webgl'];                     // all others
    for (const b of candidates) {
      try {
        await tf.setBackend(b);
        await tf.ready();
        if (tf.getBackend() === b) break; // success
      } catch (err) {
        if (b === "wasm") {
          console.warn(`[faceUtils] WASM backend initialization failed:`, err.message);
        }
        /* try next backend */
      }
    }

    console.log("[faceUtils] backend ready:", tf.getBackend());
  })();

  return backendReadyPromise;
}

/* -------------------------------------------------------------------------- */
/* 2. PCA utility                                                              */
/* -------------------------------------------------------------------------- */

export async function applyPCAToDescriptor(descriptor128) {
  const res = await fetch("/pca_parameters.json", { cache: "force-cache" });
  const { mean, components } = await res.json();
  const centered = descriptor128.map((v, i) => v - mean[i]);
  return components.map((row) => row.reduce((s, c, i) => s + c * centered[i], 0));
}

/* -------------------------------------------------------------------------- */
/* 3. Canvas helpers                                                           */
/* -------------------------------------------------------------------------- */

export function createCanvasFromRGBArray(imageData) {
  const height = imageData.length;
  const width = imageData[0].length;
  const canvas = Object.assign(document.createElement("canvas"), { width, height });
  const ctx = canvas.getContext("2d");
  const buf = ctx.createImageData(width, height);

  for (let y = 0, idx = 0; y < height; y++) {
    for (let x = 0; x < width; x++, idx += 4) {
      const p = imageData[y][x];
      buf.data[idx] = p.r;
      buf.data[idx + 1] = p.g;
      buf.data[idx + 2] = p.b;
      buf.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(buf, 0, 0);
  return canvas;
}

export function createCanvasFromImage(img) {
  const canvas = Object.assign(document.createElement("canvas"), {
    width: img.width,
    height: img.height,
  });
  canvas.getContext("2d").drawImage(img, 0, 0);
  return canvas;
}

/* -------------------------------------------------------------------------- */
/* 4. Detection pipeline                                                       */
/* -------------------------------------------------------------------------- */

export const DETECTOR_INPUT_SIZE = 320;
const yieldUI = () => new Promise((r) => requestAnimationFrame(r));

export async function detectFaceWithProgress(
  canvasOrImage,
  reportProgress,
  detectorOpts = { inputSize: DETECTOR_INPUT_SIZE, scoreThreshold: 0.25 }
) {
  const tell = (p, s) => reportProgress?.(p, s);

  try {
    const opts = new faceapi.TinyFaceDetectorOptions(detectorOpts);
    const detTask = faceapi.detectSingleFace(canvasOrImage, opts);
    const lmTask = detTask.withFaceLandmarks(true);
    const fullTask = lmTask.withFaceDescriptor();

    const det = await detTask; // step 1
    tell(0.5, "bbox");
    await yieldUI();
    if (!det) return { success: false, error: "No face detected" };

    await lmTask; // step 2
    tell(0.66, "landmarks");
    await yieldUI();

    const full = await fullTask; // step 3
    tell(1, "descriptor");
    return {
      success: true,
      landmarks: full.landmarks.positions,
      descriptor: Array.from(full.descriptor),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function detectFaceWithDescriptor(
  canvasOrImage,
  detectorOpts = { inputSize: DETECTOR_INPUT_SIZE, scoreThreshold: 0.25 }
) {
  try {
    const det = await faceapi
      .detectSingleFace(canvasOrImage, new faceapi.TinyFaceDetectorOptions(detectorOpts))
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    return det
      ? {
          success: true,
          landmarks: det.landmarks.positions,
          descriptor: Array.from(det.descriptor),
        }
      : { success: false, error: "No face detected" };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* -------------------------------------------------------------------------- */
/* 5. PCA vector processing                                                  */
/* -------------------------------------------------------------------------- */

export async function processFaceImageToPCAVector(imageInput, opts = {}) {
  let canvas;
  if (typeof imageInput === "string") {
    const img = new Image();
    img.src = imageInput;
    await img.decode();
    canvas = createCanvasFromImage(img);
  } else if (imageInput instanceof HTMLImageElement) {
    canvas = createCanvasFromImage(imageInput);
  } else if (Array.isArray(imageInput) && Array.isArray(imageInput[0])) {
    canvas = createCanvasFromRGBArray(imageInput);
  } else if (imageInput instanceof HTMLCanvasElement) {
    canvas = imageInput;
  } else {
    throw new Error("Unsupported image input type");
  }

  const face = await detectFaceWithDescriptor(canvas, opts.detectorOpts);
  if (!face.success) return face;

  const pcaVector = await applyPCAToDescriptor(face.descriptor);
  return { success: true, pcaVector, ...face, canvas };
}

export async function batchProcessFaceImages(imageArray, { progressCallback } = {}) {
  const results = [];
  const errors = [];
  const cores = navigator.hardwareConcurrency ?? 4;
  const chunkSize = Math.max(1, Math.floor(cores / 2));

  for (let i = 0; i < imageArray.length; i += chunkSize) {
    const chunk = imageArray.slice(i, i + chunkSize);
    for (let j = 0; j < chunk.length; j++) {
      const idx = i + j;
      const res = await processFaceImageToPCAVector(chunk[j]);
      if (res.success) results.push({ index: idx, ...res });
      else errors.push({ index: idx, error: res.error });
      progressCallback?.(idx + 1, imageArray.length);
    }
    await yieldUI(); // keep UI responsive between chunks
  }

  return { results, errors, successCount: results.length, errorCount: errors.length };
}

/* -------------------------------------------------------------------------- */
/* 6. Model loading & automatic warm-up                                       */
/* -------------------------------------------------------------------------- */

let modelsReadyPromise = null;
export async function loadFaceApiModels() {
  if (modelsReadyPromise) return modelsReadyPromise;

  modelsReadyPromise = (async () => {
    await initBackend();

    if (
      faceapi.nets.tinyFaceDetector.isLoaded &&
      faceapi.nets.faceLandmark68TinyNet.isLoaded &&
      faceapi.nets.faceRecognitionNet.isLoaded
    ) {
      console.log("[faceUtils] face-api models already in memory");
      return true;
    }

    console.log("[faceUtils] loading face-api models…");
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_PATH),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_PATH),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_PATH),
    ]);
    console.log("[faceUtils] models loaded");

    idleWarmup(); // compile kernels lazily
    return true;
  })();

  return modelsReadyPromise;
}

function idleWarmup() {
  if (!("requestIdleCallback" in window)) return;
  requestIdleCallback(
    async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.forward(tf.zeros([1, 160, 160, 3])),
          faceapi.nets.faceLandmark68TinyNet.forward(tf.zeros([1, 128, 128, 3])),
          faceapi.nets.faceRecognitionNet.forward(tf.zeros([1, 160, 160, 3])),
        ]);
        tf.engine().disposeVariables();
        console.log("[faceUtils] warm-up finished");
      } catch (e) {
        console.warn("[faceUtils] warm-up failed:", e);
      }
    },
    { timeout: 2000 }
  );
}

/* -------------------------------------------------------------------------- */
/* 7. Optional Einstein warm-up (shows a real image instead of zeros)        */
/* -------------------------------------------------------------------------- */

const EINSTEIN_URL = "/einstein-warmup.jpg";

async function loadEinsteinImage() {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = EINSTEIN_URL;
  await img.decode();
  return img;
}

export async function warmupFaceProcessing(progressCallback = () => {}) {
  progressCallback(0);
  try {
    const einstein = await loadEinsteinImage();
    const res = await detectFaceWithProgress(einstein, (p) => progressCallback(0.8 * p));
    if (!res.success) throw new Error(res.error);
    await applyPCAToDescriptor(res.descriptor);
    progressCallback(1);
    return { success: true };
  } catch (err) {
    console.warn("[faceUtils] Einstein warm-up failed, falling back:", err);
    await applyPCAToDescriptor(Array.from({ length: 128 }, () => Math.random() * 2 - 1));
    progressCallback(1);
    return { success: false, error: err.message };
  }
}

/* -------------------------------------------------------------------------- */
/* 8. Capability helper                                                       */
/* -------------------------------------------------------------------------- */

export function validateFaceProcessingRequirements() {
  return {
    hasFaceApi: !!faceapi,
    hasRequiredModels:
      faceapi.nets.tinyFaceDetector.isLoaded &&
      faceapi.nets.faceLandmark68TinyNet.isLoaded &&
      faceapi.nets.faceRecognitionNet.isLoaded,
  };
}
