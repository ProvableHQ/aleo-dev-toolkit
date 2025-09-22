"use client";

import { useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import {
  isDelegatedProvingAtom,
  privateKeyAtom,
  shouldBroadcastLocalTxAtom,
} from "../store/atoms/settings.js";
import {
  augmentSample,
  createAugmentedTrainingDataset,
} from "../augmentation.js";
import { trainingDatasets } from "../trainingData.js";
import { trainMLPModel } from "../tensorflow_training.js";
import { computeModelHashFromAleoInputs } from "../utils/model-hash-utils.js";
import * as tf from "@tensorflow/tfjs";
import {
  processImage,
  computeSoftmax,
  convert_proof_to_softmax,
} from "../components/signature/signature-utils.jsx";
import {
  provingServiceUrl,
  int_type,
} from "../components/signature/signature-utils.jsx";
import { mlp_face_program, mlp_face_program_hash_only } from "../variables.js";
import { AleoWorker } from "../workers/AleoWorker.js";
import { mlpInference } from "../mlp.js";
import {
  getBoundingBox,
  resizeImage,
  computeHaarFeatures,
  aspectRatio,
  numRegionsBelowThreshold,
} from "../components/signature/signature-utils.jsx";
import { useGenericCapture } from "./useGenericCapture.jsx";
import { exportIdentityParameters } from "../utils/exportUtils.js";
import { runAleoHashPerformanceTest, bhp1024HashToFieldOfI64, mlpFaceHashTest } from "../utils/aleoHashTest.js";
import { computeCompleteModelHash, analyzeModelStructure } from "../utils/modelHashUtils.js";

// Import enhanced utilities to eliminate code duplication
import { processFaceImageToPCAVector } from "../utils/faceUtils.js";
import { performTensorFlowInference } from "../utils/tensorflowUtils.js";
import {
  normalizeFeatures,
  toFixedPoint,
  SCALING_FACTORS,
} from "../utils/modelConstants.js";

// Verification types
export const VERIFICATION_TYPES = {
  SIGNATURE: "signature",
  FACE: "face",
};

// Steps for different verification types
export const VERIFICATION_STEPS = {
  INITIAL: "initial",
  REPEAT1: "repeat1",
  REPEAT2: "repeat2",
  CONFIRM: "confirm",
  VERIFYING: "verifying",
  COMPLETE: "complete",
  REGISTERING_ADDRESS: "registering-address",
  CREATE_PROOF: "create-proof",
  CREATING_AUTHORIZATION: "creating-authorization",
  GENERATING_PROOF: "generating-proof",
  PROOF_GENERATED: "proof-generated",
  PROOF_DETAILS: "proof-details",
  VERIFICATION_COMPLETE: "verification-complete",
};

// Step configurations for different verification types
export const STEP_CONFIGS = {
  [VERIFICATION_TYPES.SIGNATURE]: {
    titles: {
      [VERIFICATION_STEPS.INITIAL]: "Add a Signature",
      [VERIFICATION_STEPS.REPEAT1]: "Repeat Signature",
      [VERIFICATION_STEPS.REPEAT2]: "Repeat Signature",
      [VERIFICATION_STEPS.CONFIRM]: "Confirm Signature",
      [VERIFICATION_STEPS.REGISTERING_ADDRESS]: "Registering Address",
      [VERIFICATION_STEPS.CREATE_PROOF]: "Create a Proof",
      [VERIFICATION_STEPS.CREATING_AUTHORIZATION]: "Creating Authorization...",
      [VERIFICATION_STEPS.GENERATING_PROOF]: "Generating Proof...",
      [VERIFICATION_STEPS.PROOF_GENERATED]: "Proof Generated",
      [VERIFICATION_STEPS.PROOF_DETAILS]: "Your Proof",
      [VERIFICATION_STEPS.VERIFICATION_COMPLETE]: "Verification Complete",
    },
    descriptions: {
      [VERIFICATION_STEPS.INITIAL]:
        "FIRST LET'S CREATE YOUR UNIQUE MONOGRAM. DRAW SOMETHING UNIQUE THAT YOU'LL BOTH REMEMBER AND CAN RECREATE.",
      [VERIFICATION_STEPS.REPEAT1]:
        "TO TRAIN THE MODEL, PLEASE REPEAT YOUR SIGNATURE TWO MORE TIMES. PRESS BACK TO EDIT YOUR ORIGINAL.",
      [VERIFICATION_STEPS.REPEAT2]:
        "TO TRAIN THE MODEL, PLEASE REPEAT YOUR SIGNATURE A FINAL TIME. PRESS BACK TO EDIT YOUR ORIGINAL.",
      [VERIFICATION_STEPS.CONFIRM]:
        "IS THE BELOW CORRECT TO TRAIN THE VERIFICATION MODEL? PRESS BACK TO CHANGE YOUR SIGNATURE IF NEEDED.",
      [VERIFICATION_STEPS.REGISTERING_ADDRESS]: "REGISTERING YOUR WALLET ADDRESS ON THE BLOCKCHAIN...",
      [VERIFICATION_STEPS.CREATE_PROOF]: "VERIFY YOUR SIGNATURE TO CONTINUE",
      [VERIFICATION_STEPS.CREATING_AUTHORIZATION]: "CREATING PROOF AUTHORIZATION",
      [VERIFICATION_STEPS.GENERATING_PROOF]: "SIGNATURE VERIFICATION",
      [VERIFICATION_STEPS.PROOF_GENERATED]:
        "SIGNATURE TRUE: {matchPercentage}% MATCH",
      [VERIFICATION_STEPS.PROOF_DETAILS]: "",
      [VERIFICATION_STEPS.VERIFICATION_COMPLETE]: "",
    },
    trainingSteps: [
      VERIFICATION_STEPS.INITIAL,
      VERIFICATION_STEPS.REPEAT1,
      VERIFICATION_STEPS.REPEAT2,
      VERIFICATION_STEPS.CONFIRM,
    ],
  },
  [VERIFICATION_TYPES.FACE]: {
    titles: {
      [VERIFICATION_STEPS.INITIAL]: "Add a Face",
      [VERIFICATION_STEPS.REPEAT1]: "Repeat Face",
      [VERIFICATION_STEPS.REPEAT2]: "Repeat Face",
      [VERIFICATION_STEPS.CONFIRM]: "Confirm Face",
      [VERIFICATION_STEPS.REGISTERING_ADDRESS]: "Registering Address",
      [VERIFICATION_STEPS.CREATE_PROOF]: "Create a Proof",
      [VERIFICATION_STEPS.CREATING_AUTHORIZATION]: "Creating Authorization...",
      [VERIFICATION_STEPS.GENERATING_PROOF]: "Generating Proof...",
      [VERIFICATION_STEPS.PROOF_GENERATED]: "Proof Generated",
      [VERIFICATION_STEPS.PROOF_DETAILS]: "Your Proof",
      [VERIFICATION_STEPS.VERIFICATION_COMPLETE]: "Verification Complete",
    },
    descriptions: {
      [VERIFICATION_STEPS.INITIAL]:
        "CAPTURE SAMPLE 2/3. YOUR PASSPORT PHOTO IS ALREADY SAMPLE 1. POSITION YOUR FACE IN THE CIRCLE AND TAKE A PHOTO.",
      [VERIFICATION_STEPS.REPEAT1]:
        "CAPTURE SAMPLE 3/3. TO TRAIN THE MODEL, PLEASE CAPTURE YOUR FACE ONE MORE TIME. PRESS BACK TO EDIT YOUR PREVIOUS PHOTO.",
      [VERIFICATION_STEPS.REPEAT2]:
        "TO TRAIN THE MODEL, PLEASE CAPTURE YOUR FACE A FINAL TIME. PRESS BACK TO EDIT YOUR ORIGINAL.",
      [VERIFICATION_STEPS.CONFIRM]:
        "IS THE BELOW CORRECT TO TRAIN THE VERIFICATION MODEL? PASSPORT PHOTO (SAMPLE 1) + 2 FACE PHOTOS (SAMPLES 2&3).",
      [VERIFICATION_STEPS.REGISTERING_ADDRESS]: "REGISTERING YOUR WALLET ADDRESS ON THE BLOCKCHAIN...",
      [VERIFICATION_STEPS.CREATE_PROOF]: "VERIFY YOUR FACE TO CONTINUE",
      [VERIFICATION_STEPS.CREATING_AUTHORIZATION]: "CREATING PROOF AUTHORIZATION",
      [VERIFICATION_STEPS.GENERATING_PROOF]: "FACE VERIFICATION",
      [VERIFICATION_STEPS.PROOF_GENERATED]:
        "FACE TRUE: {matchPercentage}% MATCH",
      [VERIFICATION_STEPS.PROOF_DETAILS]: "",
      [VERIFICATION_STEPS.VERIFICATION_COMPLETE]: "",
    },
    trainingSteps: [
      VERIFICATION_STEPS.INITIAL,
      VERIFICATION_STEPS.REPEAT1,
      VERIFICATION_STEPS.CONFIRM,
    ],
  },
};

// Main verification hook
export const useVerification = (verificationType, importedModelData = null, capturedPassportImage = null) => {
  const [currentStep, setCurrentStep] = useState(VERIFICATION_STEPS.INITIAL);
  const [samples, setSamples] = useState([]);
  // --- Duplicate-capture guard state ---
  const [acceptedCanonicalHashes, setAcceptedCanonicalHashes] = useState([]); // canonical aHash (array of 0/1 length 256)
  const [acceptedFaceDescriptors, setAcceptedFaceDescriptors] = useState([]); // arrays of numbers
  const [isTooSimilar, setIsTooSimilar] = useState(false);
  const [proofSample, setProofSample] = useState(null);
  const [matchPercentage, setMatchPercentage] = useState(0);
  const [augmentedSampleImages, setAugmentedSampleImages] = useState([]);
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [trainedModel, setTrainedModel] = useState(null);
  const [modelScaler, setModelScaler] = useState(null);
  const [labelMapping, setLabelMapping] = useState(null);
  const [mlpPrediction, setMlpPrediction] = useState(null);
  const [proof_run_count, setProofRunCount] = useState(0);
  const [proving_finished, setProvingFinished] = useState(false);
  const [isProgressRunning, setIsProgressRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressInterval, setProgressInterval] = useState(null);
  const [expectedRuntime, setExpectedRuntime] = useState(0);

  const isDelegatedProving = useAtomValue(isDelegatedProvingAtom);
  const privateKey = useAtomValue(privateKeyAtom);
  const shouldBroadcastLocalTx = useAtomValue(shouldBroadcastLocalTxAtom);
  const aleoWorker = AleoWorker();
  const [proofText, setProofText] = useState("");
  const [chartDataProof, setChartDataProof] = useState([
    { label: "False", value: 0 },
    { label: "True", value: 0 },
  ]);
  const [provingError, setProvingError] = useState(null);
  const [lastProcessedFeatures, setLastProcessedFeatures] = useState(null);
  
  // Hash computation state
  const [computedHash, setComputedHash] = useState(null);
  const [isComputingHash, setIsComputingHash] = useState(false);
  const [mlpInferenceResult, setMlpInferenceResult] = useState(null);
  const [isComputingInference, setIsComputingInference] = useState(false);
  

  // Handle imported model data
  useEffect(() => {
    if (importedModelData && importedModelData.success) {
      console.log("Loading imported model data:", importedModelData);
      setTrainedModel(importedModelData.model);
      setModelScaler(importedModelData.scaler);
      setLabelMapping(importedModelData.labelMapping);
      setCurrentStep(VERIFICATION_STEPS.CREATE_PROOF);
    }
  }, [importedModelData]);

  // Initialize passport photo for similarity checking when KYA workflow starts
  useEffect(() => {
    const initializePassportBaseline = async () => {
      if (
        verificationType === VERIFICATION_TYPES.FACE && 
        capturedPassportImage && 
        acceptedCanonicalHashes.length === 0 && 
        acceptedFaceDescriptors.length === 0
      ) {
        console.log("[dup-guard] Initializing passport photo as baseline for similarity checks");
        
        try {
          // Process passport image to extract face features
          const passportResult = await processFaceImageToPCAVector(capturedPassportImage);
          if (passportResult.success && passportResult.descriptor) {
            console.log("[dup-guard] Passport face descriptor extracted successfully");
            
            // Add passport face descriptor to baselines
            const descArray = Array.isArray(passportResult.descriptor) 
              ? passportResult.descriptor 
              : Array.from(passportResult.descriptor);
            setAcceptedFaceDescriptors([descArray]);
            
            // Try to compute canonical hash from passport if landmarks are available
            if (passportResult.landmarks && hasUsableLandmarks(passportResult.landmarks)) {
              const canonHash = await computeCanonicalAHashFromInput(
                capturedPassportImage, 
                passportResult.landmarks
              );
              if (canonHash) {
                setAcceptedCanonicalHashes([canonHash]);
                console.log("[dup-guard] Passport canonical hash computed and added");
              }
            }
            
            console.log("[dup-guard] Passport baseline initialization complete");
            
            // Also add passport as the first sample in the training data
            if (samples.length === 0) {
              const passportSample = {
                image: capturedPassportImage,
                imageDataUrl: capturedPassportImage,
                dataUrl: capturedPassportImage
              };
              setSamples([passportSample]);
              console.log("[dup-guard] Passport added as first sample (sample 1/3)");
            }
          } else {
            console.log("[dup-guard] Could not extract face features from passport photo");
          }
        } catch (error) {
          console.error("[dup-guard] Error initializing passport baseline:", error);
        }
      }
    };
    
    initializePassportBaseline();
  }, [verificationType, capturedPassportImage, acceptedCanonicalHashes.length, acceptedFaceDescriptors.length, samples.length]);

  const {
    captureRef,
    hasCaptured,
    isCapturing,
    isReady,
    capturedImage,
    landmarks,
    faceDescriptor,
    startCapturing,
    capture,
    stopCapturing,
    clearCapture,
    getCapture,
    // extractLandmarksFromImageData,
  } = useGenericCapture(
    verificationType,
    trainedModel,
    modelScaler,
    labelMapping,
    currentStep === VERIFICATION_STEPS.CREATE_PROOF,
    (classificationResult) => {
      // Handle inference result from face verification
      if (
        verificationType === VERIFICATION_TYPES.FACE &&
        classificationResult &&
        trainedModel
      ) {
        let matchPercentage;
        if (classificationResult.predictedLabel === 1) {
          // True prediction - use confidence as-is
          matchPercentage = Math.round(classificationResult.confidence * 100);
        } else {
          // False prediction - invert the confidence
          matchPercentage = Math.round(
            (1 - classificationResult.confidence) * 100
          );
        }
        setMlpPrediction(`${matchPercentage}% MATCH`);
      }
    }
  );

  // -------- Duplicate image guard helpers (aHash + Hamming) ----------
  const AHASH_SIZE = 16;                // 16x16 -> 256-bit aHash
  const AHASH_MAX_BITS = AHASH_SIZE * AHASH_SIZE; // 256
  const FD_HARD = 0.24;     // block by descriptor alone
  const FD_SOFT = 0.30;     // gray zone needs corroboration
  const AHAM_HARD = 20;     // block by aHash alone (canonical)
  const AHAM_SOFT = 22;     // gray zone needs corroboration
  const hasUsableLandmarks = (lm) => Array.isArray(lm) && lm.length >= 48;
  // --- Robust dataURL resolver (handles many shapes from getCapture/useGenericCapture) ---
  const resolveDataUrl = (input) => {
    if (!input) return null;
    if (typeof input === "string") return input.startsWith("data:image") ? input : null;
    const candidates = [
      input.image,
      input.imageDataUrl,
      input.dataUrl,
      input.dataURL,
      input.data_uri,
      input.uri,
      input.src,
    ];
    const found = candidates.find((v) => typeof v === "string" && v.startsWith("data:image"));
    return found || null;
  };

  function euclideanDistance(a, b) {
    if (!a || !b || a.length !== b.length) return Number.POSITIVE_INFINITY;
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const d = a[i] - b[i];
      sum += d * d;
    }
    return Math.sqrt(sum);
  }

  async function computeCanonicalAHashFromInput(input, lm, size = AHASH_SIZE) {
    const dataUrl = resolveDataUrl(input);
    if (!dataUrl || !dataUrl.startsWith("data:image") || !hasUsableLandmarks(lm)) return null;

    // Try to get eye points from landmarks
    // Face-api.js uses 68-point landmarks: points 36-41 are left eye, 42-47 are right eye
    // Use the center of each eye for better stability
    // Need at least 48 points for eye landmarks (validated above)
    
    let leftEyeCenter = {
      x: (lm[36].x + lm[37].x + lm[38].x + lm[39].x + lm[40].x + lm[41].x) / 6,
      y: (lm[36].y + lm[37].y + lm[38].y + lm[39].y + lm[40].y + lm[41].y) / 6
    };
    let rightEyeCenter = {
      x: (lm[42].x + lm[43].x + lm[44].x + lm[45].x + lm[46].x + lm[47].x) / 6,
      y: (lm[42].y + lm[43].y + lm[44].y + lm[45].y + lm[46].y + lm[47].y) / 6
    };
    
    if (!leftEyeCenter || !rightEyeCenter || 
        leftEyeCenter.x == null || leftEyeCenter.y == null ||
        rightEyeCenter.x == null || rightEyeCenter.y == null) return null;

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          // If landmarks look normalized, scale to pixels
          const looksNormalized =
            leftEyeCenter.x >= 0 && leftEyeCenter.x <= 1 &&
            rightEyeCenter.x >= 0 && rightEyeCenter.x <= 1;
          if (looksNormalized) {
            leftEyeCenter = { x: leftEyeCenter.x * img.naturalWidth,  y: leftEyeCenter.y * img.naturalHeight };
            rightEyeCenter = { x: rightEyeCenter.x * img.naturalWidth, y: rightEyeCenter.y * img.naturalHeight };
          }
          
          // 4:5 canonical canvas
          const outW = 128, outH = 160;
          const canvas = document.createElement("canvas");
          canvas.width = outW; canvas.height = outH;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });

          const cx = (leftEyeCenter.x + rightEyeCenter.x) / 2;
          const cy = (leftEyeCenter.y + rightEyeCenter.y) / 2;
          const dx = rightEyeCenter.x - leftEyeCenter.x, dy = rightEyeCenter.y - leftEyeCenter.y;
          const angle = Math.atan2(dy, dx);
          const dist = Math.hypot(dx, dy);
          const desiredEyeDist = outW * 0.5; // eyes at ~50% width
          const scale = desiredEyeDist / Math.max(1, dist);

          // bring eye-center to canonical position, un-rotate & scale
          ctx.translate(outW / 2, outH * 0.4);
          ctx.rotate(-angle);
          ctx.scale(scale, scale);
          ctx.translate(-cx, -cy);
          ctx.drawImage(img, 0, 0);

          // downsample to 16x16 and aHash
          const tmp = document.createElement("canvas");
          tmp.width = size; tmp.height = size;
          const tctx = tmp.getContext("2d", { willReadFrequently: true });
          tctx.drawImage(canvas, 0, 0, size, size);
          const { data } = tctx.getImageData(0, 0, size, size);

          const gray = [];
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            gray.push(0.299 * r + 0.587 * g + 0.114 * b);
          }
          const avg = gray.reduce((a, v) => a + v, 0) / gray.length;
          resolve(gray.map(v => (v >= avg ? 1 : 0)));
        } catch (e) {
          console.warn("canonical aHash error:", e);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  function hammingDistance(aBits, bBits) {
    if (!aBits || !bBits || aBits.length !== bBits.length) return AHASH_MAX_BITS;
    let d = 0;
    for (let i = 0; i < aBits.length; i++) {
      if (aBits[i] !== bBits[i]) d++;
    }
    return d;
  }
  /**
   * Check duplicate with details & logging.
   * Returns: { similar: boolean, reason: 'descriptor'|'canonical_ahash'|'plain_ahash'|null, metric: number|null, threshold: number|null }
   */
  async function detectDuplicateDetailed(input, lm, currentDesc) {
    // Quick visibility into what baselines exist
    console.log(
      "[dup-guard] baselines | desc=%d canon=%d | thresholds: desc≤%.2f/%.2f canon≤%d/%d",
      acceptedFaceDescriptors.length,
      acceptedCanonicalHashes.length,
      FD_HARD, FD_SOFT, AHAM_HARD, AHAM_SOFT
    );

    const makeRec = (metric, threshold) => {
      if (metric == null) return { metric: null, threshold, fired: false, margin: null };
      const margin = threshold - metric; // positive => fired (since lower is more similar)
      return { metric, threshold, fired: margin >= 0, margin };
    };

    // Always compute ALL metrics so we can log how close each was.
          // 1) Descriptor
      let descMin = null;
      if (currentDesc && acceptedFaceDescriptors.length) {
            let min = Number.POSITIVE_INFINITY;
            for (const prev of acceptedFaceDescriptors) {
                const d = euclideanDistance(currentDesc, prev);
                if (d < min) min = d;
                if (min <= FD_HARD) break;
            }
            descMin = isFinite(min) ? min : null;
        }

      // 2) Canonicalized aHash (eyes align → Hamming)
      let canonMinHam = null;
      if (hasUsableLandmarks(lm) && acceptedCanonicalHashes.length) {
        const cHash = await computeCanonicalAHashFromInput(input, lm);
        if (cHash) {
          let minHamCanon = AHASH_MAX_BITS;
          for (const prev of acceptedCanonicalHashes) {
            const ham = hammingDistance(cHash, prev);
            if (ham < minHamCanon) minHamCanon = ham;
            if (minHamCanon <= AHAM_HARD) break;
          }
          canonMinHam = isFinite(minHamCanon) ? minHamCanon : null;
        }
      } else {
        if (!acceptedCanonicalHashes.length) {
          console.log("[dup-guard] note: no canonical baselines saved yet");
        }
        if (!hasUsableLandmarks(lm)) {
          console.log("[dup-guard] note: current capture has no usable landmarks; skipping canonical compare");
        }
      }
      
      const metrics = {
        descriptor: makeRec(descMin, FD_HARD),
        canonical_ahash: makeRec(canonMinHam, AHAM_HARD),
      };

      // New logic: hard blocks OR gray zone combo
      const hardHit = (descMin != null && descMin <= FD_HARD) ||
                     (canonMinHam != null && canonMinHam <= AHAM_HARD);
      const grayCombo = (descMin != null && descMin <= FD_SOFT) &&
                       (canonMinHam != null && canonMinHam <= AHAM_SOFT);
      const similar = hardHit || grayCombo;
      const pickReason = hardHit
        ? (descMin != null && descMin <= FD_HARD ? 'descriptor' : 'canonical_ahash')
        : (grayCombo ? 'descriptor+canonical_ahash' : null);

      const selected = pickReason ? metrics[pickReason] : { metric: null, threshold: null };

      const fmt = (k, r) => {
        if (r.metric == null) return `${k}: n/a`;
        const margin = r.margin == null ? 'n/a' : `${r.margin >= 0 ? '+' : ''}${r.margin.toFixed(4)}`;
        const thr = r.threshold;
        const met = Number.isInteger(r.metric) ? r.metric : r.metric.toFixed(4);
        return `${k}: ${met} (thr=${thr}, margin=${margin}, ${r.fired ? 'FIRED' : 'nope'})`;
      };
      
      const summaryLine =
        `[dup-guard] summary -> ${fmt('desc', metrics.descriptor)} | ${fmt('canon', metrics.canonical_ahash)}`;
      console.log(summaryLine);
      
      // Log the new logic decision
      console.log(`[dup-guard] decision -> hardHit: ${hardHit}, grayCombo: ${grayCombo}, similar: ${similar}`);
      if (hardHit) {
        console.log(`[dup-guard] BLOCKED by hard threshold (${pickReason})`);
      } else if (grayCombo) {
        console.log(`[dup-guard] BLOCKED by gray zone combo (descriptor: ${descMin?.toFixed(4)}/${FD_SOFT}, canon: ${canonMinHam}/${AHAM_SOFT})`);
      } else {
        console.log(`[dup-guard] ALLOWED - no thresholds exceeded`);
      }

      return {
        similar,
        reason: pickReason,
        metric: selected.metric,
        threshold: selected.threshold,
        metrics, // full breakdown for callers that want extra logs
      };
      
  }

  // Live feedback right after a new capture on face verification steps
  useEffect(() => {
    (async () => {
      if (
        verificationType === VERIFICATION_TYPES.FACE &&
        capturedImage &&
        (currentStep === VERIFICATION_STEPS.INITIAL ||
          currentStep === VERIFICATION_STEPS.REPEAT1 ||
          currentStep === VERIFICATION_STEPS.REPEAT2)
      ) {
        const descArray = faceDescriptor
          ? (Array.isArray(faceDescriptor) ? faceDescriptor : Array.from(faceDescriptor))
          : null;

        // For INITIAL step with passport image, compare against passport (if available)
        // For other steps, compare against previous face samples  
        let dup;
        if (currentStep === VERIFICATION_STEPS.INITIAL && capturedPassportImage && samples.length === 0) {
          // Compare first face photo against passport photo
          dup = await detectDuplicateDetailed(capturedImage, landmarks, descArray);
          console.log(`[dup-guard] INITIAL step: comparing first face against existing samples and passport photo`);
        } else {
          // Normal comparison against previous samples
          dup = await detectDuplicateDetailed(capturedImage, landmarks, descArray);
        }
        
        setIsTooSimilar(dup.similar);
        if (dup.similar) {
          console.log(
            `[dup-guard] LIVE FEEDBACK TRIGGERED via ${dup.reason} (metric=${dup.metric}, thr=${dup.threshold})`,
            dup.metrics
          );
          const liveLine = `[dup-guard] LIVE FEEDBACK metrics -> desc=${dup.metrics.descriptor.metric ?? 'n/a'}/${FD_HARD} | canon=${dup.metrics.canonical_ahash.metric ?? 'n/a'}/${AHAM_HARD}`;
          console.log(liveLine);

          setMlpPrediction(
            "Too similar to the previous photo. Turn your head slightly or try a different expression."
          );
        } else {
          // Clear similarity message unless "No face detected" is showing elsewhere
          if (mlpPrediction?.startsWith("Too similar")) {
            setMlpPrediction("");
          }
        }
      } else {
        setIsTooSimilar(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedImage, faceDescriptor, currentStep, verificationType, acceptedCanonicalHashes.length, acceptedFaceDescriptors.length]);

  const stepConfig = STEP_CONFIGS[verificationType];

  useEffect(() => {
    if (currentStep === VERIFICATION_STEPS.GENERATING_PROOF) {
      if (proving_finished) {
        setCurrentStep(VERIFICATION_STEPS.PROOF_GENERATED);
        clearInterval(progressInterval);
        setProgressInterval(null);
        return;
      }
    }
  }, [currentStep, proving_finished]);

  const handleContinue = async () => {
    if (!hasCaptured) return;

    // Log based on verification type
    if (verificationType === VERIFICATION_TYPES.SIGNATURE) {
      console.log("User clicked: CONTINUE (after collecting signature sample)");
    } else if (verificationType === VERIFICATION_TYPES.FACE) {
      console.log("User clicked: CONTINUE (after collecting face sample)");
    }

    const sample = await getCapture();

    // For face verification with passport, passport is already at index 0
    // So INITIAL (sample 2) goes to index 1, REPEAT1 (sample 3) goes to index 2
    const sampleIndex =
      currentStep === VERIFICATION_STEPS.INITIAL
        ? (verificationType === VERIFICATION_TYPES.FACE && capturedPassportImage ? 1 : 0)
        : currentStep === VERIFICATION_STEPS.REPEAT1
          ? (verificationType === VERIFICATION_TYPES.FACE && capturedPassportImage ? 2 : 1)
          : currentStep === VERIFICATION_STEPS.REPEAT2
            ? (verificationType === VERIFICATION_TYPES.FACE && capturedPassportImage ? 3 : 2)
            : currentStep === VERIFICATION_STEPS.CONFIRM
              ? (verificationType === VERIFICATION_TYPES.FACE && capturedPassportImage ? 4 : 3)
              : 0;

    // --- Duplicate check before accepting sample ---
    if (
      verificationType === VERIFICATION_TYPES.FACE &&
      (currentStep === VERIFICATION_STEPS.REPEAT1 ||
        currentStep === VERIFICATION_STEPS.REPEAT2)
    ) {
      const descArray = faceDescriptor
        ? (Array.isArray(faceDescriptor) ? faceDescriptor : Array.from(faceDescriptor))
        : null;
      const dup = await detectDuplicateDetailed(sample, landmarks, descArray);
      if (dup.similar) {
        console.log(
          `[dup-guard] HANDLE CONTINUE BLOCKED via ${dup.reason} (metric=${dup.metric}, thr=${dup.threshold})`,
          dup.metrics
        );
        console.log(
          `[dup-guard] HANDLE CONTINUE metrics -> desc=${dup.metrics.descriptor.metric ?? 'n/a'}/${FD_HARD} | canon=${dup.metrics.canonical_ahash.metric ?? 'n/a'}/${AHAM_HARD}`
        );

        setIsTooSimilar(true);
        setMlpPrediction(
          "Too similar to the previous photo. Turn your head slightly or try a different expression."
        );
        return; // block progressing
      }
    }

    // For INITIAL step, we still want to allow the first photo to be taken
    // The live feedback will warn about similarity, but we don't block progression completely

    // --- Gate FACE acceptance on usable landmarks/descriptor so canon/plain won't be n/a later ---
    if (
      verificationType === VERIFICATION_TYPES.FACE &&
      (currentStep === VERIFICATION_STEPS.INITIAL ||
        currentStep === VERIFICATION_STEPS.REPEAT1 ||
        currentStep === VERIFICATION_STEPS.REPEAT2)
    ) {
      if (!hasUsableLandmarks(landmarks) || !faceDescriptor) {
        console.warn("[accept] blocked: unusable or missing landmarks/descriptor at accept time");
        setMlpPrediction("Face/landmarks not stable. Please retake with face centered and eyes visible.");
        return;
      }
    }

    if (sample) {
      // Always resolve a concrete dataURL for hashing/canonical hashing
      const sampleDataUrl = resolveDataUrl(sample) || resolveDataUrl(capturedImage);

      // Also store canonical hash for rotation-robust duplicate checks
      const newCanonical = (verificationType === VERIFICATION_TYPES.FACE && hasUsableLandmarks(landmarks))
        ? await computeCanonicalAHashFromInput(sampleDataUrl, landmarks)
        : null;
      // Also store its face descriptor for robust duplicate checks
      const newDesc = verificationType === VERIFICATION_TYPES.FACE && faceDescriptor
        ? (Array.isArray(faceDescriptor) ? faceDescriptor : Array.from(faceDescriptor))
        : null;

      if (!newCanonical && verificationType === VERIFICATION_TYPES.FACE) {
        console.warn("[accept] canonical aHash not saved (no/short landmarks at accept time)");
      }
      if (!newDesc && verificationType === VERIFICATION_TYPES.FACE) {
        console.warn("[accept] descriptor not saved (no faceDescriptor?)");
      }

      // Update the same index if the sample is already present
      if (samples[sampleIndex]) {
        setSamples((prev) => {
          const newSamples = [...prev];
          newSamples[sampleIndex] = sample;
          return newSamples;
        });
        if (newCanonical) {
          setAcceptedCanonicalHashes(prev => {
            const next = [...prev]; next[sampleIndex] = newCanonical; return next;
          });
        }
        if (newDesc) {
          setAcceptedFaceDescriptors((prev) => {
            const next = [...prev];
            next[sampleIndex] = newDesc;
            return next;
          });
        }
      } else {
        setSamples((prev) => [...prev, sample]);
        if (newCanonical) {
          setAcceptedCanonicalHashes(prev => [...prev, newCanonical]);
        }
        if (newDesc) {
          setAcceptedFaceDescriptors((prev) => [...prev, newDesc]);
        }
      }

      console.log(`[accept] stored sample at index ${sampleIndex}`, {
        samples: (samples?.length ?? 0) + (samples[sampleIndex] ? 0 : 1),
        canon: newCanonical ? acceptedCanonicalHashes.length + 1 : acceptedCanonicalHashes.length,
        descs: newDesc ? acceptedFaceDescriptors.length + 1 : acceptedFaceDescriptors.length,
        step: currentStep
      });
    }
              
              
    clearCapture();

    switch (currentStep) {
      case VERIFICATION_STEPS.INITIAL:
        setCurrentStep(VERIFICATION_STEPS.REPEAT1);
        break;
      case VERIFICATION_STEPS.REPEAT1:
        // For face verification with passport image, skip REPEAT2 and go to CONFIRM
        if (verificationType === VERIFICATION_TYPES.FACE && capturedPassportImage) {
          setCurrentStep(VERIFICATION_STEPS.CONFIRM);
        } else {
          setCurrentStep(VERIFICATION_STEPS.REPEAT2);
        }
        break;
      case VERIFICATION_STEPS.REPEAT2:
        setCurrentStep(VERIFICATION_STEPS.CONFIRM);
        break;
    }
  };

  // Epoch update callback for training progress
  const onEpochUpdate = (epoch, metrics, finished = false) => {
    setCurrentEpoch(epoch);
    if (finished) {
      console.log("Training finished at epoch", epoch);
    }
  };

  // Function to start training with collected data
  const startTrainingWithCollectedData = async (positiveDataPoints) => {
    console.log("Starting training with collected data points");
    setCurrentEpoch(0);

    try {
      let negativeDatapoints;
      let positivePCAData = [];

      if (verificationType === VERIFICATION_TYPES.SIGNATURE) {
        console.log("training in signature mode");
        negativeDatapoints = trainingDatasets.getNegativeDataPoints();

        const nAugment = 29;
        const augmentedDataset = createAugmentedTrainingDataset(
          negativeDatapoints,
          positiveDataPoints,
          nAugment
        );

        const featureFunctions = {
          getBoundingBox,
          resizeImage,
          computeHaarFeatures,
          aspectRatio,
          numRegionsBelowThreshold,
        };

        const trainingResults = await trainMLPModel(
          augmentedDataset,
          featureFunctions,
          0.1,
          0,
          onEpochUpdate,
          verificationType
        );

        setTrainedModel(trainingResults.model);
        setModelScaler(trainingResults.scaler);
        setLabelMapping(trainingResults.labelToIdx);

        return;
      }

      if (verificationType === VERIFICATION_TYPES.FACE) {
        console.log("training in face mode");

        // Load negative face descriptors from the public folder
        negativeDatapoints = await loadNegativeFaceDescriptors();
        console.log("negativeDatapoints", negativeDatapoints);
        console.log("positiveDataPoints", positiveDataPoints);

        // Streaming face processing - augment->extract->discard pattern
        const isMobile =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          );
        const nAugment = 3; // Keep 3 augmentations for all devices with streaming approach
        console.log(
          `Mobile device detected: ${isMobile}, using streaming processing for ${nAugment} augmentations`
        );

        // Store only PCA vectors (256 bytes each) instead of full images
        positivePCAData = [];
        const displayDataUris = []; // Minimal set for display

        console.log("Number of samples:", positiveDataPoints.length);

        // Process each sample individually with streaming
        for (
          let sampleIndex = 0;
          sampleIndex < positiveDataPoints.length;
          sampleIndex++
        ) {
          const sample = positiveDataPoints[sampleIndex];
          console.log(
            `Processing sample ${sampleIndex + 1}/${positiveDataPoints.length}`
          );

          // 1. Process original image first
          const originalResult = await processFaceImageToPCAVector(
            sample.image || sample
          );
          if (
            originalResult.success &&
            originalResult.pcaVector?.length === 32
          ) {
            positivePCAData.push(originalResult.pcaVector);
            console.log(`Original sample ${sampleIndex + 1}: PCA extracted`);
          }

          // 2. Process augmentations one by one (streaming)
          // For face verification, we use simple data augmentation directly on the dataURL
          for (let augIndex = 0; augIndex < nAugment; augIndex++) {
            console.log(
              `Sample ${sampleIndex + 1}, augmentation ${augIndex + 1}: created (using original image with noise)`
            );

            // For face verification, use the original image with slight variations
            // This avoids the complex RGB array transformation issues
            const imageData = sample.image || sample;
            const augResult = await processFaceImageToPCAVector(imageData);
            if (augResult.success && augResult.pcaVector?.length === 32) {
              // Add small random noise to the PCA vector for variation
              const noisyPCAVector = augResult.pcaVector.map(val => 
                val + (Math.random() - 0.5) * 0.01 // Small noise
              );
              positivePCAData.push(noisyPCAVector);
              console.log(
                `Sample ${sampleIndex + 1}, augmentation ${augIndex + 1}: PCA extracted with noise`
              );
            }

            // Small delay on mobile to prevent blocking
            if (isMobile) {
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
          }

          // Small delay between samples on mobile to prevent blocking
          if (isMobile) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }

        // Set minimal display images (only first augmentation of each sample)
        setAugmentedSampleImages(displayDataUris);
        console.log(
          `Streaming processing complete: ${positivePCAData.length} PCA vectors extracted, ${displayDataUris.length} display images`
        );

        console.log(
          `Successfully processed ${positivePCAData.length} face images with streaming approach`
        );
        console.log("positivePCAData", positivePCAData);

        // Split datasets: 2/3 train, 1/3 val
        const nNeg = negativeDatapoints.length;
        const nNegTrain = Math.floor((2 * nNeg) / 3);
        const negTrain = negativeDatapoints.slice(0, nNegTrain);
        const negVal = negativeDatapoints.slice(nNegTrain);

        const nPos = positivePCAData.length;
        const nPosTrain = Math.floor((2 * nPos) / 3);
        const posTrain = positivePCAData.slice(0, nPosTrain);
        const posVal = positivePCAData.slice(nPosTrain);

        // Build datasets
        const trainDataset = [
          ...negTrain.map((vec) => ({ image: vec, label: 0 })),
          ...posTrain.map((vec) => ({ image: vec, label: 1 })),
        ];
        const valDataset = [
          ...negVal.map((vec) => ({ image: vec, label: 0 })),
          ...posVal.map((vec) => ({ image: vec, label: 1 })),
        ];

        console.log("trainDataset", trainDataset);
        console.log("valDataset", valDataset);

        // Merge for training function
        const augmentedDataset = [...trainDataset, ...valDataset];
        const featureFunctions = {}; // Not used for face PCA

        const trainingResults = await trainMLPModel(
          augmentedDataset,
          featureFunctions,
          negVal.length / augmentedDataset.length, // validation split
          0,
          onEpochUpdate,
          verificationType
        );

        setTrainedModel(trainingResults.model);
        setModelScaler(trainingResults.scaler);
        setLabelMapping(trainingResults.labelToIdx);

        return;
      }
    } catch (error) {
      console.error("Error during training with collected data:", error);
    }
  };

  // Function to load negative face descriptors from the bundled file
  const loadNegativeFaceDescriptors = async () => {
    try {
      console.log("Loading bundled negative face descriptors...");

      const response = await fetch("/negative_face_descriptors_bundled.json");
      if (!response.ok) {
        throw new Error(
          `Failed to load bundled descriptors: ${response.status}`
        );
      }

      const negativeDatapoints = await response.json();

      // Validate the loaded data
      if (!Array.isArray(negativeDatapoints)) {
        throw new Error("Bundled descriptors is not an array");
      }

      // Filter valid descriptors
      const validDescriptors = negativeDatapoints.filter(
        (descriptor) => Array.isArray(descriptor) && descriptor.length === 32
      );

      console.log(
        `Successfully loaded ${validDescriptors.length} negative face descriptors from bundled file`
      );
      return validDescriptors;
    } catch (error) {
      console.error("Error loading bundled negative face descriptors:", error);
      // Fallback to empty array if loading fails
      return [];
    }
  };

  const startTraining = async () => {
    console.log("Starting training with collected data...");

    // For face verification with passport image, samples array already contains:
    // [0] = passport photo (added during initialization)  
    // [1] = first face photo (added during INITIAL step)
    // [2] = second face photo (added during REPEAT1 step)
    console.log(`Training with ${samples.length} samples:`, samples.map((s, i) => `Sample ${i+1}: ${s.image ? 'image present' : 'no image'}`));

    // Remove redundant processing - augmentation will be done once inside startTrainingWithCollectedData
    await startTrainingWithCollectedData(samples);
    
    // Automatically store the trained model
    console.log("Training completed, automatically storing model...");
    const storeSuccess = await downloadTrainedModel();
    if (storeSuccess) {
      console.log("✅ Model automatically stored successfully");
    } else {
      console.warn("⚠️ Model training completed but store failed - user can manually store");
    }
    
    setCurrentStep(VERIFICATION_STEPS.COMPLETE);
  };

  // Compute model hash using Aleo BHP1024 from trained model parameters
  const computeModelHash = async () => {
    try {
      setIsComputingHash(true);
      console.log("🔗 Computing model hash using trained ML model parameters...");
      
      // Check if we have a trained model
      if (!trainedModel) {
        console.warn("⚠️ No trained model available, using fallback hash");
        const fallbackResult = await bhp1024HashToFieldOfI64(0);
        if (fallbackResult.success) {
          setComputedHash(fallbackResult.result);
          console.log("✅ Fallback model hash computed:", fallbackResult.result);
        } else {
          throw new Error("Failed to compute fallback hash");
        }
        return;
      }
      
      // Analyze model structure for debugging
      console.log("🔍 Analyzing trained model structure...");
      const modelStructure = await analyzeModelStructure(trainedModel);
      console.log("📊 Model structure:", modelStructure);
      
      // Compute hash from actual model parameters
      console.log("⚙️ Extracting key parameters and computing hash...");
      const hashResult = await computeCompleteModelHash(trainedModel);
      
      if (hashResult.success) {
        setComputedHash(hashResult.modelHash);
        console.log("✅ Model parameters hash computed successfully!");
        console.log(`📊 Hash: ${hashResult.modelHash}`);
        console.log(`📊 Parameters used: ${hashResult.parameterCount}`);
        console.log(`📊 Combined value: ${hashResult.combinedValue}`);
        console.log(`⏱️ Duration: ${hashResult.duration}ms`);
      } else {
        console.error("❌ Failed to compute model parameters hash:", hashResult.error);
        setComputedHash("Error computing model hash");
      }
      
    } catch (error) {
      console.error("❌ Error in computeModelHash:", error);
      
      // Fallback to simple hash if model hash fails
      console.log("🔄 Attempting fallback hash computation...");
      try {
        const fallbackResult = await bhp1024HashToFieldOfI64(0);
        if (fallbackResult.success) {
          setComputedHash(`${fallbackResult.result} (fallback)`);
          console.log("✅ Fallback hash computed:", fallbackResult.result);
        } else {
          setComputedHash("Error computing hash");
        }
      } catch (fallbackError) {
        console.error("❌ Fallback hash also failed:", fallbackError);
        setComputedHash("Error computing hash");
      }
    } finally {
      setIsComputingHash(false);
    }
  };





  const handleConfirm = () => {
    setCurrentStep(VERIFICATION_STEPS.VERIFYING);
    startTraining();
  };

  const handleContinueToProof = () => {
    // For both face and signature verification, go directly to address registration
    setCurrentStep(VERIFICATION_STEPS.REGISTERING_ADDRESS);
  };

  const getProgressDots = () => {
    const steps = stepConfig.trainingSteps;
    const currentIndex = steps.indexOf(currentStep);

    return (
      <div className="flex justify-center space-x-2">
        {steps.map((_, index) => {
          const isCurrent = index === currentIndex;
          const widthClass = isCurrent ? "w-16" : "w-8";
          const colorClass =
            index === currentIndex ? "bg-white" : "bg-gray-600";

          return (
            <div
              key={index}
              className={`${widthClass} h-1 rounded-full ${colorClass} transition-all duration-300`}
              style={{
                transitionProperty: "width, background-color",
              }}
            />
          );
        })}
      </div>
    );
  };

  // Function to extract weights and biases from TensorFlow model and prepare Aleo input
  const prepareAleoInput = async (imageFeatures) => {
    if (!trainedModel) {
      console.error("No trained model available");
      return null;
    }

    try {
      console.log("=== Preparing Aleo Input ===");

      const modelWeights = trainedModel.getWeights();
      const [inputDim, hiddenDim] = modelWeights[0].shape;
      const [, outputDim] = modelWeights[2].shape;

      if (modelWeights.length !== 4) {
        throw new Error(
          `Expected 4 weight tensors, got ${modelWeights.length}`
        );
      }

      const layer1Weights = await modelWeights[0].data();
      const layer1Biases = await modelWeights[1].data();
      const layer2Weights = await modelWeights[2].data();
      const layer2Biases = await modelWeights[3].data();

      // Check architecture based on verification type
      if (verificationType === VERIFICATION_TYPES.SIGNATURE) {
        // Signature verification: 20 -> 11 -> 2
        if (
          modelWeights[0].shape[0] !== 20 ||
          modelWeights[0].shape[1] !== 11
        ) {
          throw new Error(
            `Expected layer 1 weights shape [20, 11], got [${modelWeights[0].shape}]`
          );
        }
        if (modelWeights[2].shape[0] !== 11 || modelWeights[2].shape[1] !== 2) {
          throw new Error(
            `Expected layer 2 weights shape [11, 2], got [${modelWeights[2].shape}]`
          );
        }
      } else if (verificationType === VERIFICATION_TYPES.FACE) {
        // Face verification: 32 -> 17 -> 2
        if (
          modelWeights[0].shape[0] !== 32 ||
          modelWeights[0].shape[1] !== 17
        ) {
          throw new Error(
            `Expected layer 1 weights shape [32, 17], got [${modelWeights[0].shape}]`
          );
        }
        if (modelWeights[2].shape[0] !== 17 || modelWeights[2].shape[1] !== 2) {
          throw new Error(
            `Expected layer 2 weights shape [17, 2], got [${modelWeights[2].shape}]`
          );
        }
      }

      const scale1 = 16; // w₁
      const scale2 = scale1; // w₂  (=256)
      const bias1Scale = scale1 * scale1; // 256
      const bias2Scale = scale1 * bias1Scale; // 4096

      const scaledFeatures = imageFeatures;

      const scaledLayer1Biases = Array.from(layer1Biases).map((b) =>
        Math.round(b * bias1Scale)
      );
      //   const scaledLayer2Weights = Array.from(layer2Weights).map((w) =>
      //     Math.round(w * scale2)
      //   );
      const scaledLayer2Biases = Array.from(layer2Biases).map((b) =>
        Math.round(b * bias2Scale)
      );

      const inputValues = [];
      inputValues.push(...scaledFeatures);

      for (let n = 0; n < hiddenDim; n++) {
        for (let i = 0; i < inputDim; i++) {
          const idx = i * hiddenDim + n;
          inputValues.push(Math.round(layer1Weights[idx] * scale1));
        }
        inputValues.push(scaledLayer1Biases[n]);
      }

      for (let h = 0; h < hiddenDim; h++) {
        const idx = h * outputDim + 0;
        inputValues.push(Math.round(layer2Weights[idx] * scale2));
      }
      inputValues.push(scaledLayer2Biases[0]);

      for (let h = 0; h < hiddenDim; h++) {
        const idx = h * outputDim + 1;
        inputValues.push(Math.round(layer2Weights[idx] * scale2));
      }
      inputValues.push(scaledLayer2Biases[1]);

      const structs = [];
      let valueIndex = 0;

      // Create structs based on the architecture
      if (verificationType === VERIFICATION_TYPES.SIGNATURE) {
        // Signature: 20 -> 11 -> 2 architecture
        for (let structIdx = 0; structIdx < 3; structIdx++) {
          const structFields = {};
          for (let fieldIdx = 0; fieldIdx < 18; fieldIdx++) {
            const fieldName = `x${fieldIdx}`;
            structFields[fieldName] =
              valueIndex < inputValues.length ? inputValues[valueIndex] : 0;
            valueIndex++;
          }
          structs.push({ type: "Struct0", fields: structFields });
        }

        for (let structIdx = 0; structIdx < 13; structIdx++) {
          const structFields = {};
          for (let fieldIdx = 0; fieldIdx < 17; fieldIdx++) {
            const fieldName = `x${fieldIdx}`;
            structFields[fieldName] =
              valueIndex < inputValues.length ? inputValues[valueIndex] : 0;
            valueIndex++;
          }
          structs.push({ type: "Struct1", fields: structFields });
        }

        const aleoInputArray = structs.map((struct) => {
          const fieldStrings = Object.entries(struct.fields)
            .map(([key, value]) => `${key}: ${value}${int_type}`)
            .join(", ");
          return `{${fieldStrings}}`;
        });

        return aleoInputArray;
      } else if (verificationType === VERIFICATION_TYPES.FACE) {
        // Face: 32 -> 17 -> 2 architecture
        const aleoInputArray = [];
        for (let structIdx = 0; structIdx < 5; structIdx++) {
          const struct2Fields = [];

          // First 8 fields are Struct0 (struct1_0 to struct1_7)
          for (let i = 0; i < 8; i++) {
            const x0 =
              valueIndex < inputValues.length ? inputValues[valueIndex++] : 0;
            const x1 =
              valueIndex < inputValues.length ? inputValues[valueIndex++] : 0;
            struct2Fields.push(
              `struct1_${i}: {x0: ${x0}${int_type}, x1: ${x1}${int_type}}`
            );
          }

          // Next 24 fields are Struct1 (struct1_8 to struct1_31)
          for (let i = 8; i < 32; i++) {
            const x0 =
              valueIndex < inputValues.length ? inputValues[valueIndex++] : 0;
            struct2Fields.push(`struct1_${i}: {x0: ${x0}${int_type}}`);
          }

          aleoInputArray.push(`{${struct2Fields.join(", ")}}`);
        }

        // Create 11 Struct3 objects (struct0_5 to struct0_15)
        for (let structIdx = 0; structIdx < 11; structIdx++) {
          const struct3Fields = [];

          // First 7 fields are Struct0 (struct1_0 to struct1_6)
          for (let i = 0; i < 7; i++) {
            const x0 =
              valueIndex < inputValues.length ? inputValues[valueIndex++] : 0;
            const x1 =
              valueIndex < inputValues.length ? inputValues[valueIndex++] : 0;
            struct3Fields.push(
              `struct1_${i}: {x0: ${x0}${int_type}, x1: ${x1}${int_type}}`
            );
          }

          // Next 25 fields are Struct1 (struct1_7 to struct1_31)
          for (let i = 7; i < 32; i++) {
            const x0 =
              valueIndex < inputValues.length ? inputValues[valueIndex++] : 0;
            struct3Fields.push(`struct1_${i}: {x0: ${x0}${int_type}}`);
          }

          aleoInputArray.push(`{${struct3Fields.join(", ")}}`);
        }

        console.log("=== Aleo Input Preparation Complete ===");
        console.log("aleoInputArray", aleoInputArray);
        
        try {
          const { modelHash, chunks } = await computeModelHashFromAleoInputs(aleoInputArray);
          console.log("model_hash (off-chain):", modelHash.toString());
          // If you also log chunk hashes:
          // chunks.forEach((c, i) => console.log(`chunk[${i}]`, c.toString()));
        } catch (e) {
          console.error("Error computing model hash off-chain:", e);
        }
        
        return aleoInputArray;
      }
    } catch (error) {
      console.error("Error preparing Aleo input:", error);
      return null;
    }
  };

  async function executeAleoCode(fixed_point_features, forceLocalProving = false) {
    const useLocalProving = forceLocalProving || !isDelegatedProving;
    console.log("🚀 executeAleoCode called", {
      verificationType,
      isDelegatedProving,
      forceLocalProving,
      useLocalProving,
      fixed_point_features: fixed_point_features?.slice(0, 5) + "..." // Log first 5 values
    });
    
    // Set expected runtime based on verification type and proving method
    let expected_runtime;
    if (isDelegatedProving && !forceLocalProving) {
      if (verificationType === VERIFICATION_TYPES.FACE) {
        expected_runtime = 18;
      } else {
        expected_runtime = 13;
      }
    } else if (verificationType === VERIFICATION_TYPES.SIGNATURE) {
      expected_runtime = proof_run_count == 0 ? 180 : 120;
    } else if (proof_run_count == 0) {
      expected_runtime = 180;
    } else if (proof_run_count > 0) {
      expected_runtime = 130;
    }
    
    let input_array;

    if (verificationType === VERIFICATION_TYPES.SIGNATURE) {
      if (!trainedModel) {
        console.error("No trained model available for signature verification");
        alert(
          "Please train a model first before using signature verification mode"
        );
        return;
      }

      const aleoInputArray = await prepareAleoInput(fixed_point_features);
      if (aleoInputArray) {
        const structs = [];

        aleoInputArray.forEach((structStr) => {
          const structObj = {};
          const cleanStr = structStr.replace(/[{}]/g, "");
          const pairs = cleanStr.split(", ");

          pairs.forEach((pair) => {
            const [key, valueWithType] = pair.split(": ");
            const value = parseInt(valueWithType.replace("i64", ""));
            structObj[key] = value;
          });

          structs.push(structObj);
        });

        const jsMLPResult = mlpInference(
          structs[0],
          structs[1],
          structs[2],
          structs[3],
          structs[4],
          structs[5],
          structs[6],
          structs[7],
          structs[8],
          structs[9],
          structs[10],
          structs[11],
          structs[12],
          structs[13],
          structs[14],
          structs[15]
        );

        const output_fixed_point_scaling_factor =
          SCALING_FACTORS.OUTPUT_FIXED_POINT;
        const jsMLPScaled = jsMLPResult.map(
          (output) => output / output_fixed_point_scaling_factor
        );

        const jsMLPSoftmax = computeSoftmax(jsMLPScaled, 1);
        console.log(
          "JavaScript MLP prediction:",
          jsMLPSoftmax[0] > jsMLPSoftmax[1] ? "False" : "True"
        );
      }
      if (!aleoInputArray) {
        console.error(
          "Failed to prepare Aleo input for signature verification"
        );
        return;
      }
      input_array = aleoInputArray;
    } else {
      // For face verification, use the 32-dimensional PCA features
      if (!trainedModel) {
        console.error("No trained model available for face verification");
        alert("Please train a model first before using face verification mode");
        return;
      }

      const aleoInputArray = await prepareAleoInput(fixed_point_features);
      if (aleoInputArray) {
        const structs = [];

        aleoInputArray.forEach((structStr) => {
          const structObj = {};
          const cleanStr = structStr.replace(/[{}]/g, "");
          const pairs = cleanStr.split(", ");

          pairs.forEach((pair) => {
            const [key, valueWithType] = pair.split(": ");
            const value = parseInt(valueWithType.replace("i64", ""));
            structObj[key] = value;
          });

          structs.push(structObj);
        });

        // For face verification, we need to call mlpInference with the correct number of structs
        // Face architecture: 32 -> 17 -> 2 (5 Struct0 + 19 Struct1 = 24 structs total)
        const jsMLPResult = mlpInference(
          structs[0],
          structs[1],
          structs[2],
          structs[3],
          structs[4],
          structs[5],
          structs[6],
          structs[7],
          structs[8],
          structs[9],
          structs[10],
          structs[11],
          structs[12],
          structs[13],
          structs[14],
          structs[15]
        );

        const output_fixed_point_scaling_factor =
          SCALING_FACTORS.OUTPUT_FIXED_POINT;
        const jsMLPScaled = jsMLPResult.map(
          (output) => output / output_fixed_point_scaling_factor
        );

        const jsMLPSoftmax = computeSoftmax(jsMLPScaled, 1);
        console.log(
          "JavaScript MLP prediction:",
          jsMLPSoftmax[0] > jsMLPSoftmax[1] ? "False" : "True"
        );
      }
      if (!aleoInputArray) {
        console.error("Failed to prepare Aleo input for face verification");
        return;
      }
      input_array = aleoInputArray;
    }

    const model = mlp_face_program;

    let result, executionResponse, fullTransaction, broadcastResult;

    if (!useLocalProving) {
      let requestData;
      try {
        // Phase 1: Create authorization (show bouncing dots)
        setCurrentStep(VERIFICATION_STEPS.CREATING_AUTHORIZATION);
        
        requestData = await aleoWorker.buildDelegatedProvingRequest(
          model,
          "main",
          input_array,
          privateKey,
          shouldBroadcastLocalTx
        );
        
        // Phase 2: Execute proving request (show countdown)
        setCurrentStep(VERIFICATION_STEPS.GENERATING_PROOF);
        startProgressAndRandomizeData(expected_runtime);
        
        [result, executionResponse, fullTransaction, broadcastResult] =
          await aleoWorker.executeDelegatedProvingRequest(
            requestData,
            provingServiceUrl,
            shouldBroadcastLocalTx
          );
      } catch (error) {
        console.error("❌ Delegated proving failed:", error);
        console.log("❌ Error details:", {
          message: error.message,
          stack: error.stack,
          isDelegatedProving,
          useLocalProving,
          progressInterval
        });
        
        clearInterval(progressInterval);
        setProgressInterval(null);
        setIsProgressRunning(false);
        
        let errorMessage = "An unexpected error occurred";
        if (error.message.includes("proving service")) {
          errorMessage = "The proving service is unavailable or returned an error. Please try local proving instead or check your service configuration.";
        } else if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorMessage = "Could not connect to the proving service. Please check your internet connection and try again.";
        } else {
          errorMessage = error.message;
        }
        
        console.log("❌ Setting proving error:", {
          message: errorMessage,
          originalError: error.message,
          canRetry: true,
          canSwitchToLocal: !useLocalProving
        });
        
        setProvingError({
          message: errorMessage,
          originalError: errorMessage !== error.message ? error.message : null,
          canRetry: true,
          canSwitchToLocal: !useLocalProving
        });
        return;
      }
    } else {
      // local proving *with fee* so we can broadcast later
      setCurrentStep(VERIFICATION_STEPS.GENERATING_PROOF);
      startProgressAndRandomizeData(expected_runtime);
      
      [result, executionResponse, fullTransaction, broadcastResult] =
        await aleoWorker.localProgramExecutionWithFee(
          model, // program source
          "main", // entry function
          input_array, // inputs
          privateKey, // pays the fee
          0.01, // base fee (Aleo credits)
          0, // priority fee
          shouldBroadcastLocalTx // broadcast to network
        );
    }

    console.debug("result", result);
    console.log("executionResponse", executionResponse);
    if (fullTransaction) {
      console.log(
        "fullTransaction (includes main execution + fee execution)",
        fullTransaction
      );
    }
    if (broadcastResult) {
      console.log(
        "broadcastResult (network submission result)",
        broadcastResult
      );
    }

    setProofText(executionResponse);
    setProvingFinished(true);

    var softmax = convert_proof_to_softmax(executionResponse);

    if (softmax.length === 2) {
      setChartDataProof([
        { label: "False", value: softmax[0] * 100 },
        { label: "True", value: softmax[1] * 100 },
      ]);
    }
  }

  const processImageAndPredict = async (js_or_leo, new_selected_key = "1") => {
    console.log("🔍 processImageAndPredict called", {
      js_or_leo,
      new_selected_key,
      captureRefCurrent: !!captureRef.current,
      verificationType
    });
    
    if (verificationType === VERIFICATION_TYPES.FACE) {
      // ✅ Use stored face descriptor instead of re-processing image
      if (!faceDescriptor) {
        console.error("No stored face descriptor available");
        return;
      }

      console.log("✅ Aleo using stored face descriptor (same as TensorFlow)");
      console.log("Stored face descriptor:", faceDescriptor);

      // Use enhanced utility for PCA transformation
      const faceProcessResult =
        await processFaceImageToPCAVector(faceDescriptor);

      if (
        !faceProcessResult.success ||
        faceProcessResult.pcaVector?.length !== 32
      ) {
        console.log("PCA failed");
        return;
      }

      // Robust normalization for face verification
      let norm32;
      if (modelScaler && modelScaler.transform) {
        try {
          const normalizedArray = modelScaler.transform([
            faceProcessResult.pcaVector,
          ]);
          norm32 = Array.isArray(normalizedArray)
            ? normalizedArray[0]
            : normalizedArray;
        } catch (scalerError) {
          console.warn(
            "Face scaler transform failed, using original:",
            scalerError
          );
          norm32 = faceProcessResult.pcaVector;
        }
      } else {
        norm32 = faceProcessResult.pcaVector;
      }
      const fixed32 = toFixedPoint(norm32);

      console.log(
        "✅ Aleo processing - using SAME face descriptor as TensorFlow:"
      );
      console.log("PCA vector:", faceProcessResult.pcaVector);
      console.log("Normalized:", norm32);
      console.log("Fixed point:", fixed32);

      // JS preview or Aleo proof
      if (js_or_leo) {
        await prepareAleoInput(fixed32);
      } else {
        await executeAleoCode(fixed32);
      }
      return;
    }

    if (!captureRef.current) {
      console.error("❌ captureRef.current is null, cannot process image");
      return;
    }

    const imageURI = captureRef.current.toDataURL("image/png");
    console.debug("imageURI", imageURI);
    const image = new Image();
    image.src = imageURI;
    image.onload = async () => {
      console.log("image shape:", image.width, image.height);
      var imageData = await processImage(image);
      setProofSample(imageData);

      console.log(
        "imageData shape after processing:",
        imageData.length,
        imageData[0].length,
        "type:",
        typeof imageData[0][0]
      );
      const firstPixel = imageData[0];
      console.log("First pixel value:", firstPixel);

      const cropped = getBoundingBox(imageData);
      console.log("cropped", cropped);
      console.log("Cropped image shape:", cropped.length, cropped[0].length);
      const resized = resizeImage(cropped, 12);
      console.log("Resized image shape:", resized.length, resized[0].length);
      console.log("Resized image:", resized);

      const haarFeatures = computeHaarFeatures(resized);
      console.log("Haar features shape:", haarFeatures.length);

      const aspectRatioValue = aspectRatio(imageData);
      console.log("Aspect ratio:", aspectRatioValue);

      const numRegions = numRegionsBelowThreshold(imageData);
      console.log("Number of regions:", numRegions);

      var features = haarFeatures.concat([aspectRatioValue, numRegions]);

      console.log("Features:", features);

      let normalized_features;

      if (modelScaler && modelScaler.transform) {
        console.log("Using trained model scaler for normalization");
        try {
          const normalizedArray = modelScaler.transform([features]);
          normalized_features = normalizedArray[0];
          console.log(
            "Normalized with training scaler:",
            normalized_features.slice(0, 5),
            "..."
          );
        } catch (scalerError) {
          console.warn("Scaler transform failed, using fallback:", scalerError);
          normalized_features = normalizeFeatures(features);
          console.log(
            "Normalized with fallback:",
            normalized_features.slice(0, 5),
            "..."
          );
        }
      } else {
        console.log("Using fallback normalization (no trained model)");
        normalized_features = normalizeFeatures(features);
        console.log(
          "Normalized with fallback:",
          normalized_features.slice(0, 5),
          "..."
        );
      }

      // Ensure normalized_features is an array
      if (!Array.isArray(normalized_features)) {
        console.error(
          "normalized_features is not an array:",
          normalized_features
        );
        normalized_features = normalizeFeatures(features);
      }

      const fixed_point_features = toFixedPoint(normalized_features);

      console.log("Normalized features:", normalized_features);
      console.log("SCALING_FACTORS.FIXED_POINT", SCALING_FACTORS.FIXED_POINT);
      console.log("fixed_point_features: ", fixed_point_features);

      // Store processed features for retry functionality
      if (!js_or_leo) {
        setLastProcessedFeatures(fixed_point_features);
      }

      if (trainedModel && js_or_leo) {
        console.log("Preparing Aleo input for verification...");
        await prepareAleoInput(fixed_point_features);
      }

      if (js_or_leo) {
        let string_tensorflow_mlp = "";
        if (trainedModel && modelScaler && labelMapping) {
          try {
            console.log(
              "Making prediction with trained TensorFlow.js model..."
            );

            const cropped_tf = getBoundingBox(imageData);
            if (cropped_tf.length > 0) {
              const resized_tf = resizeImage(cropped_tf, 12);
              const haarFeatures_tf = computeHaarFeatures(resized_tf);
              const aspectRatioValue_tf = aspectRatio(imageData);
              const numRegions_tf = numRegionsBelowThreshold(imageData);
              const features_tf = [
                ...haarFeatures_tf,
                aspectRatioValue_tf,
                numRegions_tf,
              ];

              console.log(
                "TensorFlow features extracted:",
                features_tf.length,
                "features"
              );
              console.log("Raw TensorFlow features:", features_tf);

              let original_normalized_features = normalizeFeatures(features_tf);

              //   const tf_normalized_features = modelScaler.transform([
              //     features_tf,
              //   ]);

              console.log("Using TensorFlow scaler for prediction...");

              // Use the utility function for TensorFlow inference
              const classificationResult = await performTensorFlowInference(
                features_tf,
                trainedModel,
                modelScaler,
                labelMapping
              );

              console.log("TensorFlow prediction:", classificationResult);

              console.log("\n=== TESTING WITH ORIGINAL NORMALIZATION ===");
              const prediction_orig = trainedModel.predict(
                tf.tensor2d([original_normalized_features])
              );
              const probabilities_orig = prediction_orig.dataSync();
              prediction_orig.dispose();

              const idxToLabel = Object.fromEntries(
                Object.entries(labelMapping).map(([label, idx]) => [
                  idx,
                  parseInt(label),
                ])
              );

              const predictedIdx_orig = probabilities_orig.indexOf(
                Math.max(...probabilities_orig)
              );
              const predictedLabel_orig = idxToLabel[predictedIdx_orig];
              const confidence_orig = probabilities_orig[predictedIdx_orig];

              console.log("With original normalization:", {
                predictedLabel: predictedLabel_orig,
                confidence: confidence_orig,
                probabilities: Array.from(probabilities_orig),
              });

              if (new_selected_key == "1") {
                let matchPercentage;
                if (classificationResult.predictedLabel === 1) {
                  // True prediction - use confidence as-is
                  matchPercentage = Math.round(
                    classificationResult.confidence * 100
                  );
                  setMatchPercentage(classificationResult.confidence * 100);
                } else {
                  // False prediction - invert the confidence
                  matchPercentage = Math.round(
                    (1 - classificationResult.confidence) * 100
                  );
                }
                string_tensorflow_mlp = `${matchPercentage}% MATCH`;
              } else if (new_selected_key == "2") {
                string_tensorflow_mlp =
                  String(classificationResult.predictedLabel) +
                  " (TF: " +
                  (classificationResult.confidence * 100).toFixed(1) +
                  "%)";
              }
            } else {
              string_tensorflow_mlp = "No image detected";
            }
          } catch (tfError) {
            console.error("Error making TensorFlow prediction:", tfError);
            string_tensorflow_mlp = "TF Error";
          }
        } else {
          string_tensorflow_mlp = "Model not trained";
        }

        console.log("string_tensorflow_mlp", string_tensorflow_mlp);

        if (
          string_tensorflow_mlp &&
          string_tensorflow_mlp !== "Model not trained"
        ) {
          setMlpPrediction(string_tensorflow_mlp);
        }
      }
      if (!js_or_leo) {
        console.log(
          "new_selected_key before executeAleoCode",
          new_selected_key
        );
        await executeAleoCode(fixed_point_features);
      }
    };
  };

  const startProgressAndRandomizeData = (expected_runtime) => {
    if (isProgressRunning) {
      return;
    }
    setIsProgressRunning(true);
    setProgress(0);

    const intervalTime = 150;
    const expectedRuntimeInMilliseconds = expected_runtime * 1000;
    const increment = (intervalTime / expectedRuntimeInMilliseconds) * 100;

    const interval = setInterval(() => {
      setProgress((oldProgress) => {
        var newProgress = oldProgress + increment;
        if (newProgress >= 99) {
          newProgress = 99;
        }
        if (newProgress >= 100 || proving_finished) {
          clearInterval(interval);
          setIsProgressRunning(false);
          return 100;
        }
        return Math.round(newProgress * 10) / 10;
      });
    }, intervalTime);

    setProgressInterval(interval);
  };

  // Fixed generateProof function
  const generateProof = async () => {
    try {
      console.log("hello from generateProof");

      setProvingError(null);

      if (!trainedModel) {
        alert("Please train a model first before using verification mode");
        return;
      }

      setProofRunCount((prev) => prev + 1);
      const runs = proof_run_count;

      // Set expected runtime based on verification type
      let expected_runtime;
      if (isDelegatedProving) {
        if (verificationType === VERIFICATION_TYPES.FACE) {
          expected_runtime = 18;
        } else {
          expected_runtime = 13;
        }
      } else if (verificationType === VERIFICATION_TYPES.SIGNATURE) {
        expected_runtime = runs == 0 ? 180 : 120;
      } else if (runs == 0) {
        expected_runtime = 180;
      } else if (runs > 0) {
        expected_runtime = 130;
      }
      setExpectedRuntime(expected_runtime);

      // For face verification, reuse the captured image data instead of re-processing webcam
      if (verificationType === VERIFICATION_TYPES.FACE) {
        // Get the same image that was used for TensorFlow inference
        if (capturedImage) {
          setProofSample(capturedImage);
          processStoredImageForAleo(capturedImage);
        } else {
          console.error("No captured image available for proof generation");
          return;
        }
      } else {
        // For signature, continue with existing flow
        processImageAndPredict(false);
      }
    } catch (error) {
      console.error("Failed to execute Aleo code:", error);
    }
  };

  // Simplified using enhanced utilities
  const processStoredImageForAleo = async (imageDataUrl, forceLocalProving = false) => {
    try {
      console.log(
        "Processing stored image for Aleo using enhanced utilities..."
      );

      // Use enhanced utility to process the stored image
      const faceProcessResult = await processFaceImageToPCAVector(imageDataUrl);

      if (!faceProcessResult.success) {
        console.log("No face detected in stored image");
        return;
      }

      if (faceProcessResult.pcaVector?.length !== 32) {
        console.log("PCA failed for stored image");
        return;
      }

      // Normalize using the same scaler
      const norm32 = modelScaler
        ? modelScaler.transform([faceProcessResult.pcaVector])[0]
        : faceProcessResult.pcaVector;
      const fixed32 = toFixedPoint(norm32);

      console.log("Aleo processing using stored image:");
      console.log("PCA vector:", faceProcessResult.pcaVector);
      console.log("Normalized:", norm32);
      console.log("Fixed point:", fixed32);

      // Now both TensorFlow and Aleo use the SAME data!
      await executeAleoCode(fixed32, forceLocalProving);
    } catch (error) {
      console.error("Error processing stored image for Aleo:", error);
    }
  };

  const downloadTrainedModel = async () => {
    if (!trainedModel || !modelScaler || !labelMapping) {
      console.error("Please train a model first before storing the model");
      return false;
    }

    try {
      const exportSuccess = await exportIdentityParameters(
        trainedModel,
        modelScaler,
        labelMapping,
        verificationType
      );
      if (exportSuccess) {
        console.log(`${verificationType} identity parameters stored successfully`);
        return true;
      } else {
        console.error("Failed to export identity parameters");
        return false;
      }
    } catch (error) {
      console.error(
        `Failed to store ${verificationType} identity parameters:`,
        error
      );
      return false;
    }
  };

  useEffect(() => {
    if (
      hasCaptured &&
      currentStep === VERIFICATION_STEPS.CREATE_PROOF &&
      !isCapturing
    ) {
      processImageAndPredict(true, "1");
    }
  }, [hasCaptured, currentStep, isCapturing]);

  const onStepBack = () => {
    switch (currentStep) {
      case VERIFICATION_STEPS.REPEAT1:
        setCurrentStep(VERIFICATION_STEPS.INITIAL);
        break;
      case VERIFICATION_STEPS.REPEAT2:
        setCurrentStep(VERIFICATION_STEPS.REPEAT1);
        break;
      case VERIFICATION_STEPS.CONFIRM:
        // For face verification with passport image, go back to REPEAT1 instead of REPEAT2
        if (verificationType === VERIFICATION_TYPES.FACE && capturedPassportImage) {
          setCurrentStep(VERIFICATION_STEPS.REPEAT1);
        } else {
          setCurrentStep(VERIFICATION_STEPS.REPEAT2);
        }
        break;
      case VERIFICATION_STEPS.CREATE_PROOF:
        setCurrentStep(VERIFICATION_STEPS.COMPLETE);
        break;
      case VERIFICATION_STEPS.PROOF_GENERATED:
        setCurrentStep(VERIFICATION_STEPS.COMPLETE);
        break;
      case VERIFICATION_STEPS.PROOF_DETAILS:
        setCurrentStep(VERIFICATION_STEPS.PROOF_GENERATED);
        break;
      case VERIFICATION_STEPS.VERIFICATION_COMPLETE:
        setCurrentStep(VERIFICATION_STEPS.PROOF_DETAILS);
        break;
      default:
        break;
    }
  };

  const resetVerification = () => {
    clearCapture();
    setCurrentStep(VERIFICATION_STEPS.INITIAL);
    setSamples([]);
    setAcceptedCanonicalHashes([]);
    setAcceptedFaceDescriptors([]);
    setIsTooSimilar(false);
    setMatchPercentage(0);
    setAugmentedSampleImages([]);
    setCurrentEpoch(0);
    setTrainedModel(null);
    setModelScaler(null);
    setLabelMapping(null);
    setProofRunCount(0);
    setProofText("");
    setMlpPrediction("");
    setChartDataProof([
      { label: "False", value: 0 },
      { label: "True", value: 0 },
    ]);
    setProofSample(null);
    setProvingFinished(false);
    setIsProgressRunning(false);
    setProgress(0);
    setProgressInterval(null);
    setExpectedRuntime(0);
  };

  const restartInference = () => {
    clearCapture();
    // If we have a trained model, restart the inference flow
    if (trainedModel && modelScaler && labelMapping) {
      setCurrentStep(VERIFICATION_STEPS.CREATE_PROOF);
    } else {
      // Fallback to training flow if no model available
      setCurrentStep(VERIFICATION_STEPS.INITIAL);
    }
    setMatchPercentage(0);
    setProofRunCount(0);
    setProofText("");
    setMlpPrediction("");
    setChartDataProof([
      { label: "False", value: 0 },
      { label: "True", value: 0 },
    ]);
    setProofSample(null);
    setProvingFinished(false);
    setIsProgressRunning(false);
    setProgress(0);
    setProgressInterval(null);
    setExpectedRuntime(0);
    setProvingError(null);
  };

  const retryProofCreation = () => {
    setMlpPrediction("");
    clearCapture();
    setProofRunCount(0);
    setCurrentStep(VERIFICATION_STEPS.CREATE_PROOF);
    setProofSample(null);
    setProofText("");
    setChartDataProof([
      { label: "False", value: 0 },
      { label: "True", value: 0 },
    ]);
    setProvingFinished(false);
    setIsProgressRunning(false);
    setProgress(0);
    setProgressInterval(null);
    setExpectedRuntime(0);
    setProvingError(null);
  };

  const retryProvingRequest = async () => {
    console.log("🔄 Retrying proving request...");
    setProvingError(null);
    setProvingFinished(false);
    setIsProgressRunning(false);
    setProgress(0);
    
    // Set expected runtime based on verification type
    let expected_runtime;
    if (isDelegatedProving) {
      if (verificationType === VERIFICATION_TYPES.FACE) {
        expected_runtime = 18;
      } else {
        expected_runtime = 13;
      }
    } else if (verificationType === VERIFICATION_TYPES.SIGNATURE) {
      expected_runtime = proof_run_count == 0 ? 180 : 120;
    } else if (proof_run_count == 0) {
      expected_runtime = 180;
    } else if (proof_run_count > 0) {
      expected_runtime = 130;
    }
    setExpectedRuntime(expected_runtime);
    startProgressAndRandomizeData(expected_runtime);

    console.log("🔄 Starting retry with expected runtime:", expected_runtime);

    // For face verification, reuse the captured image data instead of re-processing webcam
    if (verificationType === VERIFICATION_TYPES.FACE) {
      // Get the same image that was used for TensorFlow inference
      if (capturedImage) {
        console.log("🔄 Face verification retry: processing stored image");
        setProofSample(capturedImage);
        processStoredImageForAleo(capturedImage);
      } else {
        console.error("No captured image available for proof generation");
        return;
      }
    } else {
      // For signature, reuse stored features if available
      if (lastProcessedFeatures) {
        console.log("🔄 Signature verification retry: using stored features");
        await executeAleoCode(lastProcessedFeatures);
      } else {
        console.log("🔄 Signature verification retry: processing image and predict");
        processImageAndPredict(false);
      }
    }
  };

  const switchToLocalProving = async () => {
    console.log("🔄 Switching to local proving (session-only)...");
    setProvingError(null);
    setCurrentStep(VERIFICATION_STEPS.GENERATING_PROOF);
    
    // Immediately start local proving with stored data
    setProvingFinished(false);
    setIsProgressRunning(false);
    setProgress(0);
    
    // Set expected runtime for local proving
    let expected_runtime;
    if (verificationType === VERIFICATION_TYPES.SIGNATURE) {
      expected_runtime = proof_run_count == 0 ? 180 : 120;
    } else if (proof_run_count == 0) {
      expected_runtime = 180;
    } else if (proof_run_count > 0) {
      expected_runtime = 130;
    }
    setExpectedRuntime(expected_runtime);
    startProgressAndRandomizeData(expected_runtime);

    console.log("🔄 Starting local proving with expected runtime:", expected_runtime);

    // Use stored data for local proving
    if (verificationType === VERIFICATION_TYPES.FACE) {
      if (capturedImage) {
        console.log("🔄 Face verification local proving: processing stored image");
        setProofSample(capturedImage);
        processStoredImageForAleo(capturedImage, true);
      } else {
        console.error("No captured image available for local proving");
        return;
      }
    } else {
      // For signature, use stored features if available
      if (lastProcessedFeatures) {
        console.log("🔄 Signature verification local proving: using stored features");
        await executeAleoCode(lastProcessedFeatures, true);
      } else {
        console.log("🔄 Signature verification local proving: processing image and predict");
        processImageAndPredict(false);
      }
    }
  };

  return {
    currentStep,
    samples,
    proofSample,
    augmentedSampleImages,
    proofProgress: progress,
    matchPercentage,
    currentEpoch,
    captureRef,
    hasCaptured,
    isCapturing,
    trainedModel,
    modelScaler,
    labelMapping,
    mlpPrediction,
    isTooSimilar,
    chartDataProof,
    proofText,
    isReady,
    expectedRuntime,
    capturedImage,
    faceDescriptor,
    provingError,
    getCapture,
    startCapturing,
    capture,
    stopCapturing,
    clearCapture,
    handleContinue,
    handleConfirm,
    handleContinueToProof,
    computedHash: mlpInferenceResult,
    isComputingHash: isComputingInference,
    computeModelHash,
    mlpInferenceResult,
    isComputingInference,
    getProgressDots,
    setCurrentStep,
    onStepBack,
    generateProof,
    resetVerification,
    restartInference,
    downloadTrainedModel,
    retryProofCreation,
    retryProvingRequest,
    switchToLocalProving,
    stepConfig,
    landmarks,
  };
};
