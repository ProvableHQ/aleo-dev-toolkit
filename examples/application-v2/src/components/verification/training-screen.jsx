import { useEffect, useMemo, useRef, useState } from "react";
import { signatureToSVG } from "../signature/signature-utils.jsx";
import { ActionButton } from "../signature/sig-components.jsx";
import { VERIFICATION_TYPES } from "../../hooks/useVerification.jsx";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils.js";
import { appVersionFooter } from "./app-version-footer.jsx";
import { computeModelHashFromAleoInputs } from "../../utils/model-hash-utils.js";

// Fixed positions for up to 6 signatures (percentages for top/left)
const SIGNATURE_POSITIONS = [
  { top: "12%", left: "10%" },
  { top: "8%", left: "75%" },
  { top: "40%", left: "80%" },
  { top: "70%", left: "15%" },
  { top: "75%", left: "60%" },
  { top: "50%", left: "35%" },
];

function SubtleGridBackground() {
  // 12x12 grid lines, centered
  return (
    <div className="pointer-events-none absolute inset-0 z-0 h-full w-full">
      <svg
        width="100%"
        height="100%"
        className="absolute inset-0"
        style={{ opacity: 0.12 }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={"h" + i}
            x1="0%"
            x2="100%"
            y1={`${(i + 1) * (100 / 13)}%`}
            y2={`${(i + 1) * (100 / 13)}%`}
            stroke="#fff"
            strokeWidth="1"
            opacity="0.08"
          />
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={"v" + i}
            y1="0%"
            y2="100%"
            x1={`${(i + 1) * (100 / 13)}%`}
            x2={`${(i + 1) * (100 / 13)}%`}
            stroke="#fff"
            strokeWidth="1"
            opacity="0.08"
          />
        ))}
      </svg>
    </div>
  );
}

function FloatingSignatures({ signatures = [], svgSize = 110 }) {
  // Use up to 6 signatures, repeat if less
  const usedSignatures = useMemo(() => {
    if (!signatures.length) return [];
    const arr = [];
    for (let i = 0; i < Math.min(6, signatures.length); i++) {
      arr.push(signatures[i]);
    }
    // If less than 6, repeat
    while (arr.length < 6) arr.push(signatures[arr.length % signatures.length]);
    return arr;
  }, [signatures]);
  return (
    <>
      {usedSignatures.map((sig, i) => (
        <div
          key={i}
          className="absolute z-10"
          style={{
            top: SIGNATURE_POSITIONS[i].top,
            left: SIGNATURE_POSITIONS[i].left,
            width: svgSize,
            height: svgSize,
            opacity: 0.18,
            filter: "blur(0.5px)",
            pointerEvents: "none",
          }}
          dangerouslySetInnerHTML={{
            __html: signatureToSVG(sig, svgSize),
          }}
        />
      ))}
    </>
  );
}

export default function TrainingModelScreen({
  currentEpoch,
  totalEpochs,
  onContinue,
  onDownloadModel,
  signatures = [],
  verificationType,
  isTraining = false,
  trainedModel,
  modelScaler,
  capturedImage,
  faceDescriptor,
  onModelHashComputed,
}) {
  // Estimate time remaining (default 10s, update as epochs progress)
  const [eta, setEta] = useState(10);
  const lastEpochRef = useRef(currentEpoch);
  const lastTimeRef = useRef(Date.now());
  
  // Model hash computation state
  const [modelHash, setModelHash] = useState(null);
  const [isComputingHash, setIsComputingHash] = useState(false);
  const [hashError, setHashError] = useState(null);
  
  // Store status state
  const [storeStatus, setStoreStatus] = useState('pending'); // 'pending', 'storing', 'success', 'failed'
  const [isStoring, setIsStoring] = useState(false);

  useEffect(() => {
    if (isTraining && currentEpoch > lastEpochRef.current) {
      const now = Date.now();
      const epochDiff = currentEpoch - lastEpochRef.current;
      const timeDiff = (now - lastTimeRef.current) / 1000; // seconds
      const epochsLeft = totalEpochs - currentEpoch;
      if (epochDiff > 0 && timeDiff > 0) {
        const timePerEpoch = timeDiff / epochDiff;
        setEta(Math.round(timePerEpoch * epochsLeft));
      }
      lastEpochRef.current = currentEpoch;
      lastTimeRef.current = now;
    }
  }, [currentEpoch, totalEpochs, isTraining]);

  // Compute model hash when training is complete
  useEffect(() => {
    if (!isTraining && trainedModel && !modelHash && !isComputingHash) {
      computeModelHash();
    }
  }, [isTraining, trainedModel, modelHash, isComputingHash]);

  // Handle automatic store when training completes
  useEffect(() => {
    if (!isTraining && trainedModel && storeStatus === 'pending' && onDownloadModel) {
      handleAutomaticStore();
    }
  }, [isTraining, trainedModel, storeStatus, onDownloadModel]);

  // Handle automatic store when training completes
  const handleAutomaticStore = async () => {
    if (!onDownloadModel || isStoring) return;
    
    try {
      setStoreStatus('storing');
      setIsStoring(true);
      
      const success = await onDownloadModel();
      
      if (success) {
        setStoreStatus('success');
        console.log('✅ Model automatically stored successfully');
      } else {
        setStoreStatus('failed');
        console.warn('⚠️ Automatic store failed');
      }
    } catch (error) {
      console.error('❌ Error during automatic store:', error);
      setStoreStatus('failed');
    } finally {
      setIsStoring(false);
    }
  };

  // Handle manual store (Store Again button)
  const handleManualStore = async () => {
    if (!onDownloadModel || isStoring) return;
    
    try {
      setIsStoring(true);
      setStoreStatus('storing');
      
      const success = await onDownloadModel();
      
      if (success) {
        setStoreStatus('success');
        console.log('✅ Model stored successfully');
      } else {
        setStoreStatus('failed');
        console.warn('⚠️ Store failed');
      }
    } catch (error) {
      console.error('❌ Error during store:', error);
      setStoreStatus('failed');
    } finally {
      setIsStoring(false);
    }
  };

  // Function to compute model hash using only model weights
  const computeModelHash = async () => {
    try {
      setIsComputingHash(true);
      setHashError(null);
      console.log("🔗 Computing model hash on Training Complete screen...");
      
      if (!trainedModel) {
        throw new Error("No trained model available");
      }

      // Extract raw model weights directly (same as useVerification)
      const modelWeights = trainedModel.getWeights();
      const [inputDim, hiddenDim] = modelWeights[0].shape;
      const [, outputDim] = modelWeights[2].shape;

      const layer1Weights = await modelWeights[0].data();
      const layer1Biases = await modelWeights[1].data();
      const layer2Weights = await modelWeights[2].data();
      const layer2Biases = await modelWeights[3].data();

      console.log("📊 Model architecture:", { inputDim, hiddenDim, outputDim });
      console.log("📊 Raw weights shapes:", {
        layer1Weights: layer1Weights.length,
        layer1Biases: layer1Biases.length,
        layer2Weights: layer2Weights.length,
        layer2Biases: layer2Biases.length
      });

      // Create Aleo input array using raw weights and same scaling as useVerification
      const aleoInputArray = await prepareAleoInputFromRawWeights(
        layer1Weights, layer1Biases, layer2Weights, layer2Biases,
        inputDim, hiddenDim, outputDim, verificationType
      );
      
      if (!aleoInputArray) {
        throw new Error("Failed to prepare Aleo input from model weights");
      }

      // Compute model hash using the same function as in useVerification
      const { modelHash: computedHash } = await computeModelHashFromAleoInputs(aleoInputArray);
      setModelHash(computedHash.toString());
      console.log("✅ Model hash computed:", computedHash.toString());
      
      // Notify parent component about the computed hash
      if (onModelHashComputed) {
        onModelHashComputed(computedHash.toString());
      }
      
    } catch (error) {
      console.error("❌ Error computing model hash:", error);
      setHashError(error.message);
    } finally {
      setIsComputingHash(false);
    }
  };

  // Helper function to prepare Aleo input from raw weights (exact copy of useVerification logic)
  const prepareAleoInputFromRawWeights = async (
    layer1Weights, layer1Biases, layer2Weights, layer2Biases,
    inputDim, hiddenDim, outputDim, verificationType
  ) => {
    try {
      const int_type = "i64";

      // Scaling factors (exact same as useVerification)
      const scale1 = 16; // w₁
      const scale2 = scale1; // w₂  (=256)
      const bias1Scale = scale1 * scale1; // 256
      const bias2Scale = scale1 * bias1Scale; // 4096

      // Use zeros for face features (same as useVerification but with zeros)
      const scaledFeatures = new Array(inputDim).fill(0);

      const scaledLayer1Biases = Array.from(layer1Biases).map((b) =>
        Math.round(b * bias1Scale)
      );
      const scaledLayer2Biases = Array.from(layer2Biases).map((b) =>
        Math.round(b * bias2Scale)
      );

      const inputValues = [];
      inputValues.push(...scaledFeatures);

      // Add layer 1 weights and biases (exact same logic as useVerification)
      for (let n = 0; n < hiddenDim; n++) {
        for (let i = 0; i < inputDim; i++) {
          const idx = i * hiddenDim + n;
          inputValues.push(Math.round(layer1Weights[idx] * scale1));
        }
        inputValues.push(scaledLayer1Biases[n]);
      }

      // Add layer 2 weights and biases (exact same logic as useVerification)
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

      console.log("📊 Total input values:", inputValues.length);
      console.log("📊 First few values:", inputValues.slice(0, 10));

      // Create structs exactly like useVerification
      const structs = [];
      let valueIndex = 0;

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

        console.log("📊 Created Aleo input array with", aleoInputArray.length, "structs");
        return aleoInputArray;
      }
    } catch (error) {
      console.error("Error preparing Aleo input from raw weights:", error);
      return null;
    }
  };

  const description = isTraining
    ? `${verificationType === VERIFICATION_TYPES.SIGNATURE ? "SIGNATURE" : "FACE PROFILE"} VERIFICATION`
    : `${verificationType === VERIFICATION_TYPES.SIGNATURE ? "SIGNATURE" : "FACE"} VERIFICATION ADDED`;
  return (
    <div className="relative flex h-dvh flex-col items-center justify-between overflow-hidden px-4 sm:px-0">
      {/* Subtle grid background */}
      <SubtleGridBackground />
      {/* Floating signatures */}
      <FloatingSignatures signatures={signatures} />

      <div className="z-20 flex w-full flex-1 flex-col items-center justify-center">
        <span
          className={cn(
            "font-innovator mb-2 inline-block text-center text-[26px] font-semibold",
            isTraining ? "text-white" : "gradient-green"
          )}
        >
          {isTraining ? "Training Model..." : "Training Complete"}
        </span>
        <span className="font-pps gradient-white mb-12 inline-block text-center text-[13px] tracking-widest uppercase">
          {description}
        </span>
      </div>

      <div className="z-20 mx-auto flex w-full max-w-lg flex-col items-center pb-5 sm:pb-15">
        <div className="gradient-white mb-4 text-center text-base text-[10px] tracking-widest">
          {isTraining ? (
            currentEpoch > 0 ? (
              `EPOCH ${currentEpoch} / ${totalEpochs} • ABOUT ${eta} SECOND${eta !== 1 ? "S" : ""} REMAINING`
            ) : (
              <div className="flex flex-row items-center gap-2">
                <span>AUGMENTING DATA</span>
                <div className="gradient-white flex justify-center space-x-1">
                  <div
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-white"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-white"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-white"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            )
          ) : (
            "COMPLETE"
          )}
        </div>
        <div
          className={cn(
            !isTraining && "bg-success mb-6 h-0.5 w-[337px] opacity-40"
          )}
        />
        {!isTraining ? (
          <>
            {/* Model Hash Display */}
            <div className="mb-6 w-full max-w-md">
              <div className="gradient-white mb-2 text-center text-xs tracking-widest uppercase">
                MODEL HASH
              </div>
              <div className="bg-black/20 rounded-lg p-3 border border-white/10">
                {isComputingHash ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-white" style={{ animationDelay: "0ms" }}></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-white" style={{ animationDelay: "150ms" }}></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-white" style={{ animationDelay: "300ms" }}></div>
                    <span className="text-xs text-white/70 ml-2">Computing...</span>
                  </div>
                ) : hashError ? (
                  <div className="text-xs text-red-400 text-center">
                    Error: {hashError}
                  </div>
                ) : modelHash ? (
                  <div className="text-xs text-white/90 font-mono break-all text-center">
                    {modelHash}
                  </div>
                ) : (
                  <div className="text-xs text-white/50 text-center">
                    No model hash available
                  </div>
                )}
              </div>
            </div>
            
            {/* Store Status Section */}
            <div className="mb-6 w-full max-w-md">
              <div className="gradient-white mb-2 text-center text-xs tracking-widest uppercase">
                MODEL STORE
              </div>
              <div className="bg-black/20 rounded-lg p-3 border border-white/10">
                {storeStatus === 'pending' && (
                  <div className="text-xs text-white/50 text-center">
                    Preparing store...
                  </div>
                )}
                {storeStatus === 'storing' && (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-white" style={{ animationDelay: "0ms" }}></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-white" style={{ animationDelay: "150ms" }}></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-white" style={{ animationDelay: "300ms" }}></div>
                    <span className="text-xs text-white/70 ml-2">Storing...</span>
                  </div>
                )}
                {storeStatus === 'success' && (
                  <div className="text-xs text-green-400 text-center">
                    ✅ Model stored successfully
                  </div>
                )}
                {storeStatus === 'failed' && (
                  <div className="text-xs text-red-400 text-center">
                    ❌ Store failed - try again
                  </div>
                )}
              </div>
            </div>
            
            {/* Store Again Button - only show if store failed or user wants to re-store */}
            {(storeStatus === 'failed' || storeStatus === 'success') && (
              <ActionButton
                onClick={handleManualStore}
                variant="primary"
                icon={Download}
                disabled={isStoring}
                className="mb-4"
              >
                {isStoring ? 'STORING...' : 'STORE AGAIN'}
              </ActionButton>
            )}
            <ActionButton onClick={onContinue} variant="primary">
              CONTINUE
            </ActionButton>
          </>
        ) : (
          <div
            className="relative z-10 space-y-2 px-6 text-center text-xs text-gray-500"
            style={{
              backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(appVersionFooter)}")`,
              backgroundRepeat: "no-repeat",
              width: "337px",
              height: "102px",
            }}
          ></div>
        )}
      </div>
    </div>
  );
}
