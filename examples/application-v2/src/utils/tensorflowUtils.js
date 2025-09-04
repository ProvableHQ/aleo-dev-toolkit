// tensorflowUtils.js - Shared TensorFlow inference utilities

import * as tf from '@tensorflow/tfjs';
import { relu, SCALING_FACTORS } from './modelConstants.js';

// Shared TensorFlow model inference with detailed logging
export const performTensorFlowInference = async (
    features, 
    trainedModel, 
    modelScaler, 
    labelMapping,
    logFirstNeuron = false
) => {
    try {
        console.log("Features for inference:", features);
        
        if (!trainedModel || !modelScaler || !labelMapping) {
            throw new Error("Missing required model components");
        }

        // Normalize features using the trained scaler
        const normalizedFeatures = modelScaler.transform([features]);
        console.log("Normalized features:", normalizedFeatures[0]);

        // Optional first neuron analysis
        if (logFirstNeuron) {
            const firstNeuronActivation = await logFirstNeuronAnalysis(trainedModel, normalizedFeatures[0]);
            console.log("First neuron activation result:", firstNeuronActivation);
        }
        
        // Make prediction with the trained model
        const prediction = trainedModel.predict(tf.tensor2d(normalizedFeatures));
        const probabilities = prediction.dataSync();
        
        prediction.dispose();
        
        console.log("Model probabilities:", probabilities);
        
        // Convert back to labels
        const idxToLabel = Object.fromEntries(
            Object.entries(labelMapping).map(([label, idx]) => [idx, parseInt(label)])
        );
        
        const predictedIdx = probabilities.indexOf(Math.max(...probabilities));
        const predictedLabel = idxToLabel[predictedIdx];
        const confidence = probabilities[predictedIdx];
        
        console.log("Predicted label:", predictedLabel, "with confidence:", confidence);
        
        return {
            classification: predictedLabel === 1 ? "Authentic" : "Not Authentic",
            confidence,
            probabilities: [...probabilities],
            labelMapping: idxToLabel,
            predictedLabel,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error("Error in TensorFlow inference:", error);
        return {
            classification: "Error",
            confidence: 0,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

// Detailed first neuron analysis for debugging
export const logFirstNeuronAnalysis = async (trainedModel, normalizedFeatures) => {
    console.log("\n=== TENSORFLOW FIRST NEURON ANALYSIS ===");
    
    try {
        // Extract model weights
        const modelWeights = trainedModel.getWeights();
        const layer1Weights = await modelWeights[0].data();
        const layer1Biases = await modelWeights[1].data();
        
        // Get model architecture info
        const [inputDim, hiddenDim] = modelWeights[0].shape;
        console.log("Model architecture: input dimension:", inputDim, "hidden dimension:", hiddenDim);
        
        console.log("TF First neuron inputs (normalized features):", normalizedFeatures);
        
        // Extract weights for the first neuron
        const tfFirstNeuronWeights = [];
        for (let i = 0; i < inputDim; i++) {
            tfFirstNeuronWeights.push(layer1Weights[i * hiddenDim + 0]);
        }
        console.log("TF First neuron weights:", tfFirstNeuronWeights);
        
        // Extract bias for the first neuron
        const tfFirstNeuronBias = layer1Biases[0];
        console.log("TF First neuron bias:", tfFirstNeuronBias);
        
        // Manually compute pre-activation
        let tfFirstNeuronPreActivation = tfFirstNeuronBias;
        for (let i = 0; i < normalizedFeatures.length; i++) {
            tfFirstNeuronPreActivation += normalizedFeatures[i] * tfFirstNeuronWeights[i];
        }
        console.log("TF First neuron pre-activation:", tfFirstNeuronPreActivation);
        
        // Apply ReLU activation
        const tfFirstNeuronActivation = relu(tfFirstNeuronPreActivation);
        console.log("TF First neuron final activation:", tfFirstNeuronActivation);
        
        console.log("=== TENSORFLOW FIRST NEURON ANALYSIS COMPLETE ===\n");
        
        return tfFirstNeuronActivation;
    } catch (error) {
        console.error("Error in first neuron analysis:", error);
        return null;
    }
};

// Validate model architecture for specific verification type
export const validateModelArchitecture = (modelWeights, verificationType) => {
    if (modelWeights.length !== 4) {
        throw new Error(`Expected 4 weight tensors, got ${modelWeights.length}`);
    }

    const [inputDim, hiddenDim] = modelWeights[0].shape;
    const [, outputDim] = modelWeights[2].shape;

    if (verificationType === 'signature') {
        if (inputDim !== 20 || hiddenDim !== 11) {
            throw new Error(`Expected signature model [20, 11], got [${inputDim}, ${hiddenDim}]`);
        }
    } else if (verificationType === 'face') {
        if (inputDim !== 32 || hiddenDim !== 17) {
            throw new Error(`Expected face model [32, 17], got [${inputDim}, ${hiddenDim}]`);
        }
    }

    if (outputDim !== 2) {
        throw new Error(`Expected output dimension 2, got ${outputDim}`);
    }

    return { inputDim, hiddenDim, outputDim };
};

// Extract and scale model weights for Aleo preparation
export const extractScaledModelWeights = async (trainedModel) => {
    const modelWeights = trainedModel.getWeights();
    
    const layer1Weights = await modelWeights[0].data();
    const layer1Biases = await modelWeights[1].data();
    const layer2Weights = await modelWeights[2].data();
    const layer2Biases = await modelWeights[3].data();

    const { LAYER1: scale1, LAYER2: scale2, BIAS1: bias1Scale, BIAS2: bias2Scale } = SCALING_FACTORS;

    return {
        layer1Weights: Array.from(layer1Weights),
        layer1Biases: Array.from(layer1Biases).map(b => Math.round(b * bias1Scale)),
        layer2Weights: Array.from(layer2Weights).map(w => Math.round(w * scale2)),
        layer2Biases: Array.from(layer2Biases).map(b => Math.round(b * bias2Scale)),
        scales: { scale1, scale2, bias1Scale, bias2Scale }
    };
};