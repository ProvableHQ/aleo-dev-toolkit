// utils/exportUtils.js
import * as tf from '@tensorflow/tfjs';

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
        link.download = `${verificationType}-identity-${Date.now()}.json`;
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