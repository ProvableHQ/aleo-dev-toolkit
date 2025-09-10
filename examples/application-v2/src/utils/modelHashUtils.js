/**
 * Model Parameter Extraction and Hashing Utilities
 *
 * This module extracts representative parameters from the trained ML model
 * for creating a verifiable model hash, similar to the Leo program approach.
 */
import * as tf from '@tensorflow/tfjs';
import { bhp1024HashToFieldOfI64 } from './aleoHashTest.js';

/**
 * Extract key model parameters for hashing
 * Based on the Leo program structure which samples representative weights
 * from different layers to create a verifiable model hash
 *
 * @param {tf.LayersModel} model - Trained TensorFlow.js model
 * @returns {Promise<Array<number>>} Array of selected model parameters as integers
 */
export async function extractKeyModelParameters(model) {
  console.log('🔧 Extracting key model parameters for hashing...');

  if (!model) {
    throw new Error('Model is required for parameter extraction');
  }

  try {
    // Get all model weights
    const weights = model.getWeights();
    console.log(`📊 Model has ${weights.length} weight tensors`);

    const keyParameters = [];

    // Process each layer's weights
    for (let layerIdx = 0; layerIdx < weights.length; layerIdx++) {
      const weight = weights[layerIdx];
      const weightData = await weight.data();
      const shape = weight.shape;

      console.log(
        `🔍 Layer ${layerIdx}: shape ${JSON.stringify(shape)}, ${weightData.length} parameters`,
      );

      if (layerIdx === 0) {
        // First layer (input → hidden): Sample first, middle, and last weights
        // Similar to Leo program sampling pattern: struct0_0.struct1_24.x0, struct0_0.struct1_31.x0
        const firstWeight = Math.round(weightData[0] * 10000); // Scale to integer
        const middleWeight = Math.round(weightData[Math.floor(weightData.length / 2)] * 10000);
        const lastWeight = Math.round(weightData[weightData.length - 1] * 10000);

        keyParameters.push(firstWeight, middleWeight, lastWeight);
        console.log(`📍 Hidden layer samples: [${firstWeight}, ${middleWeight}, ${lastWeight}]`);
      } else if (layerIdx === 1) {
        // Hidden layer bias: Sample first, middle, last
        const firstBias = Math.round(weightData[0] * 10000);
        const middleBias = Math.round(weightData[Math.floor(weightData.length / 2)] * 10000);
        const lastBias = Math.round(weightData[weightData.length - 1] * 10000);

        keyParameters.push(firstBias, middleBias, lastBias);
        console.log(`📍 Hidden bias samples: [${firstBias}, ${middleBias}, ${lastBias}]`);
      } else if (layerIdx === 2) {
        // Output layer weights (hidden → output): Sample systematically
        // Similar to Leo program's struct0_1, struct0_2, etc. sampling
        const step = Math.max(1, Math.floor(weightData.length / 16)); // Sample ~16 values

        for (let i = 0; i < weightData.length; i += step) {
          if (keyParameters.length < 32) {
            // Limit to 32 samples like Leo program
            const sample = Math.round(weightData[i] * 10000);
            keyParameters.push(sample);
          } else {
            break;
          }
        }

        console.log(
          `📍 Output layer sampled ${Math.min(Math.floor(weightData.length / step), 32)} weights`,
        );
      } else if (layerIdx === 3) {
        // Output layer bias: Sample all (usually just 2 values for binary classification)
        for (let i = 0; i < weightData.length; i++) {
          const bias = Math.round(weightData[i] * 10000);
          keyParameters.push(bias);
        }

        console.log(`📍 Output bias samples: ${weightData.length} values`);
      }
    }

    // Ensure we have a consistent number of parameters
    // Pad or truncate to match Leo program's expected structure
    const targetLength = 32; // Match Leo program's sample count
    if (keyParameters.length > targetLength) {
      keyParameters.splice(targetLength);
    } else {
      while (keyParameters.length < targetLength) {
        keyParameters.push(0); // Pad with zeros
      }
    }

    console.log(
      `✅ Extracted ${keyParameters.length} key parameters:`,
      keyParameters.slice(0, 8),
      '...',
    );
    return keyParameters;
  } catch (error) {
    console.error('❌ Error extracting model parameters:', error);
    throw error;
  }
}

/**
 * Compute BHP1024 hash of selected model parameters
 * Similar to the Leo program's model_hash computation
 *
 * @param {Array<number>} parameters - Array of model parameters as integers
 * @returns {Promise<Object>} Hash result object
 */
export async function computeModelParametersHash(parameters) {
  console.log('🔗 Computing BHP1024 hash of model parameters...');

  try {
    // Create a representative value from the parameters
    // Similar to the Leo program approach but simplified
    let combinedValue = 0;

    // Combine parameters using a deterministic formula
    // This mimics the Leo program's structured parameter combination
    for (let i = 0; i < parameters.length; i++) {
      combinedValue += parameters[i] * (i + 1); // Weight each parameter by position
    }

    // Convert to i64 for BHP1024 hashing
    const hashInput = Math.abs(combinedValue) % (2 ** 53 - 1); // Keep within safe integer range

    console.log(`📊 Combined parameter value: ${hashInput}`);
    console.log(`📊 First few parameters: [${parameters.slice(0, 5).join(', ')}]`);

    // Compute BHP1024 hash using the existing Aleo worker infrastructure
    const hashResult = await bhp1024HashToFieldOfI64(hashInput);

    if (hashResult.success) {
      console.log('✅ Model parameters hash computed successfully');
      return {
        success: true,
        hash: hashResult.result,
        parameters: parameters,
        combinedValue: hashInput,
        duration: hashResult.duration,
      };
    } else {
      throw new Error(hashResult.error);
    }
  } catch (error) {
    console.error('❌ Error computing model parameters hash:', error);
    return {
      success: false,
      error: error.message,
      parameters: parameters,
    };
  }
}

/**
 * Complete model hash computation workflow
 * Extracts parameters and computes hash in one function
 *
 * @param {tf.LayersModel} model - Trained TensorFlow.js model
 * @returns {Promise<Object>} Complete hash result with parameters and metadata
 */
export async function computeCompleteModelHash(model) {
  console.log('🚀 Starting complete model hash computation workflow...');

  try {
    // Step 1: Extract key parameters
    const keyParameters = await extractKeyModelParameters(model);

    // Step 2: Compute hash
    const hashResult = await computeModelParametersHash(keyParameters);

    if (hashResult.success) {
      return {
        success: true,
        modelHash: hashResult.hash,
        keyParameters: hashResult.parameters,
        combinedValue: hashResult.combinedValue,
        parameterCount: keyParameters.length,
        duration: hashResult.duration,
        algorithm: 'BHP1024',
      };
    } else {
      throw new Error(hashResult.error);
    }
  } catch (error) {
    console.error('❌ Complete model hash computation failed:', error);
    return {
      success: false,
      error: error.message,
      algorithm: 'BHP1024',
    };
  }
}

/**
 * Verify model hash matches expected structure
 * Useful for debugging and validation
 *
 * @param {tf.LayersModel} model - Trained TensorFlow.js model
 * @returns {Promise<Object>} Model structure information
 */
export async function analyzeModelStructure(model) {
  if (!model) {
    return { error: 'Model is null or undefined' };
  }

  try {
    const weights = model.getWeights();
    const structure = {
      layerCount: model.layers.length,
      weightTensorCount: weights.length,
      layers: [],
    };

    // Analyze each layer
    for (let i = 0; i < weights.length; i++) {
      const weight = weights[i];
      const weightData = await weight.data();

      structure.layers.push({
        index: i,
        shape: weight.shape,
        parameterCount: weightData.length,
        dtype: weight.dtype,
        min: Math.min(...weightData),
        max: Math.max(...weightData),
        mean: weightData.reduce((a, b) => a + b, 0) / weightData.length,
      });
    }

    console.log('📊 Model structure analysis:', structure);
    return structure;
  } catch (error) {
    console.error('❌ Error analyzing model structure:', error);
    return { error: error.message };
  }
}
