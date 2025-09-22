// utils/exportUtils.js
import * as tf from '@tensorflow/tfjs';
import { computeModelHashFromAleoInputs } from './model-hash-utils.js';
import { VERIFICATION_TYPES } from '../hooks/useVerification.jsx';

export const exportIdentityParameters = async (trainedModel, modelScaler, labelMapping, verificationType) => {
    try {
        // Serialize TensorFlow model weights
        const modelWeights = trainedModel.getWeights();
        const serializedWeights = {
            layer1: {
                weights: Array.from(await modelWeights[0].data()),
                shape: modelWeights[0].shape
            },
            layer1Bias: {
                weights: Array.from(await modelWeights[1].data()),
                shape: modelWeights[1].shape
            },
            layer2: {
                weights: Array.from(await modelWeights[2].data()),
                shape: modelWeights[2].shape
            },
            layer2Bias: {
                weights: Array.from(await modelWeights[3].data()),
                shape: modelWeights[3].shape
            }
        };

        // Serialize model scaler (assuming it has transform parameters)
        const serializedScaler = {
            mean: modelScaler.mean || Array.from(modelScaler.mean_),
            scale: modelScaler.scale || Array.from(modelScaler.scale_),
            // Add other scaler properties as needed
        };

        // Compute model hash for filename
        console.log("🔗 Computing model hash for filename...");
        const [inputDim, hiddenDim] = modelWeights[0].shape;
        const [, outputDim] = modelWeights[2].shape;
        
        const layer1Weights = await modelWeights[0].data();
        const layer1Biases = await modelWeights[1].data();
        const layer2Weights = await modelWeights[2].data();
        const layer2Biases = await modelWeights[3].data();

        // Prepare Aleo input array using the same logic as in training
        const aleoInputArray = await prepareAleoInputFromRawWeights(
            layer1Weights, layer1Biases, layer2Weights, layer2Biases,
            inputDim, hiddenDim, outputDim, verificationType
        );
        
        if (!aleoInputArray) {
            throw new Error("Failed to prepare Aleo input from model weights");
        }
        
        // Compute model hash using the same function as in training
        const { modelHash: computedHash } = await computeModelHashFromAleoInputs(aleoInputArray);
        const modelHashString = computedHash.toString();
        console.log("✅ Model hash computed for filename:", modelHashString);

        // Create complete identity export
        const identityData = {
            version: "1.0",
            verificationType: verificationType,
            timestamp: new Date().toISOString(),
            modelWeights: serializedWeights,
            modelScaler: serializedScaler,
            labelMapping: labelMapping,
            metadata: {
                architecture: verificationType === 'signature' ? [20, 11, 2] : [32, 17, 2]
            }
        };

        // Trigger download
        const blob = new Blob([JSON.stringify(identityData, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${verificationType}-identity-${modelHashString}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log('Identity parameters exported successfully');
        return true;
    } catch (error) {
        console.error('Error exporting identity parameters:', error);
        return false;
    }
};

export const importIdentityParameters = async (file) => {
    try {
        const text = await file.text();
        const identityData = JSON.parse(text);

        // Validate the imported data
        if (!identityData.version || !identityData.verificationType || !identityData.modelWeights || !identityData.modelScaler || !identityData.labelMapping) {
            throw new Error('Invalid model file format');
        }

        // Reconstruct TensorFlow model
        const { modelWeights, metadata } = identityData;
        
        // Create model based on architecture
        const [inputDim, hiddenDim, outputDim] = metadata.architecture;
        
        const model = tf.sequential({
            layers: [
                tf.layers.dense({
                    units: hiddenDim,
                    inputShape: [inputDim],
                    activation: 'relu'
                }),
                tf.layers.dense({
                    units: outputDim,
                    activation: 'softmax'
                })
            ]
        });

        // Set weights
        const weights = [
            tf.tensor2d(modelWeights.layer1.weights, modelWeights.layer1.shape),
            tf.tensor1d(modelWeights.layer1Bias.weights),
            tf.tensor2d(modelWeights.layer2.weights, modelWeights.layer2.shape),
            tf.tensor1d(modelWeights.layer2Bias.weights)
        ];
        
        model.setWeights(weights);

        // Reconstruct scaler
        const scaler = {
            mean: tf.tensor1d(identityData.modelScaler.mean),
            scale: tf.tensor1d(identityData.modelScaler.scale),
            transform: function(data) {
                if (Array.isArray(data)) {
                    // Handle array input
                    const dataTensor = tf.tensor2d(data);
                    const normalized = tf.sub(dataTensor, this.mean);
                    const result = tf.div(normalized, this.scale);
                    const resultArray = result.arraySync();
                    result.dispose();
                    dataTensor.dispose();
                    return resultArray;
                } else {
                    // Handle tensor input
                    const normalized = tf.sub(data, this.mean);
                    return tf.div(normalized, this.scale);
                }
            }
        };

        return {
            success: true,
            model,
            scaler,
            labelMapping: identityData.labelMapping,
            verificationType: identityData.verificationType,
            timestamp: identityData.timestamp
        };
    } catch (error) {
        console.error('Error importing identity parameters:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Compute model hash from imported JSON model data
 * This function replicates the same logic used in training to compute the model hash
 * 
 * @param {Object} identityData - The imported JSON model data
 * @returns {Promise<Object>} Hash computation result
 */
export const computeModelHashFromImportedData = async (identityData) => {
    try {
        console.log("🔗 Computing model hash from imported JSON data...");
        
        const { modelWeights, metadata } = identityData;
        const [inputDim, hiddenDim, outputDim] = metadata.architecture;
        const verificationType = identityData.verificationType === 'signature' ? VERIFICATION_TYPES.SIGNATURE : VERIFICATION_TYPES.FACE;
        
        // Extract weights from the imported data
        const layer1Weights = modelWeights.layer1.weights;
        const layer1Biases = modelWeights.layer1Bias.weights;
        const layer2Weights = modelWeights.layer2.weights;
        const layer2Biases = modelWeights.layer2Bias.weights;
        
        console.log("📊 Model architecture:", { inputDim, hiddenDim, outputDim });
        console.log("📊 Raw weights shapes:", {
            layer1Weights: layer1Weights.length,
            layer1Biases: layer1Biases.length,
            layer2Weights: layer2Weights.length,
            layer2Biases: layer2Biases.length
        });
        
        // Prepare Aleo input array using the same logic as in training
        const aleoInputArray = await prepareAleoInputFromRawWeights(
            layer1Weights, layer1Biases, layer2Weights, layer2Biases,
            inputDim, hiddenDim, outputDim, verificationType
        );
        
        if (!aleoInputArray) {
            throw new Error("Failed to prepare Aleo input from imported model weights");
        }
        
        // Compute model hash using the same function as in training
        const { modelHash: computedHash } = await computeModelHashFromAleoInputs(aleoInputArray);
        const hashString = computedHash.toString();
        
        console.log("✅ Model hash computed from imported data:", hashString);
        
        return {
            success: true,
            modelHash: hashString,
            verificationType: verificationType
        };
        
    } catch (error) {
        console.error("❌ Error computing model hash from imported data:", error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Prepare Aleo input array from raw weights (copied from training-screen.jsx)
 * This function replicates the exact same logic used during training
 */
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