// TensorFlow.js Training Pipeline - Simplified Version
// Make sure to import TensorFlow.js in your project: npm install @tensorflow/tfjs

import * as tf from '@tensorflow/tfjs';

// Seeded random number generator for reproducibility
class SeededRandom {
    constructor(seed) {
        this.seed = seed;
        this.m = 0x80000000; // 2**31
        this.a = 1103515245;
        this.c = 12345;
        this.state = seed ? seed : Math.floor(Math.random() * (this.m - 1));
    }
    
    nextInt() {
        this.state = (this.a * this.state + this.c) % this.m;
        return this.state;
    }
    
    nextFloat() {
        return this.nextInt() / (this.m - 1);
    }
}

// Shuffle array with seeded random
function shuffleArraySeeded(array, seed = 0) {
    const rng = new SeededRandom(seed);
    const shuffled = [...array];
    
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng.nextFloat() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
}

// StandardScaler implementation (similar to sklearn)
class StandardScaler {
    constructor() {
        this.mean = null;
        this.scale = null;
        this.fitted = false;
    }
    
    fit(data) {
        // data should be a 2D array [samples, features]
        const numSamples = data.length;
        const numFeatures = data[0].length;
        
        // Calculate mean
        this.mean = new Array(numFeatures).fill(0);
        for (let i = 0; i < numSamples; i++) {
            for (let j = 0; j < numFeatures; j++) {
                this.mean[j] += data[i][j];
            }
        }
        this.mean = this.mean.map(sum => sum / numSamples);
        
        // Calculate standard deviation
        this.scale = new Array(numFeatures).fill(0);
        for (let i = 0; i < numSamples; i++) {
            for (let j = 0; j < numFeatures; j++) {
                this.scale[j] += Math.pow(data[i][j] - this.mean[j], 2);
            }
        }
        this.scale = this.scale.map(variance => Math.sqrt(variance / numSamples));
        
        // Avoid division by zero
        this.scale = this.scale.map(std => std === 0 ? 1 : std);
        
        this.fitted = true;
        return this;
    }
    
    transform(data) {
        if (!this.fitted) {
            throw new Error("Scaler must be fitted before transform");
        }
        
        return data.map(sample => 
            sample.map((value, j) => (value - this.mean[j]) / this.scale[j])
        );
    }
    
    fitTransform(data) {
        return this.fit(data).transform(data);
    }
}

// Create MLP model
function createMLPModel(inputDim, hiddenDim, outputDim) {
    console.log("DEBUG: Creating model with inputDim:", inputDim, "hiddenDim:", hiddenDim, "outputDim:", outputDim);
    
    const model = tf.sequential({
        layers: [
            tf.layers.dense({
                inputShape: [inputDim],
                units: hiddenDim,
                activation: 'relu',
                kernelRegularizer: tf.regularizers.l1({ l1: 0.0001 })
            }),
            tf.layers.dense({
                units: outputDim,
                activation: 'softmax'
            })
        ]
    });
    
    model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',  // Use categorical for one-hot labels
        metrics: ['accuracy']
    });
    
    console.log("DEBUG: Model created with softmax activation and categoricalCrossentropy loss");
    
    return model;
}

// Extract features from a single image using provided functions
function extractFeaturesFromImage(image, featureFunctions) {
    console.log("DEBUG: extractFeaturesFromImage called");
    console.log("DEBUG: featureFunctions:", featureFunctions);
    console.log("DEBUG: featureFunctions type:", typeof featureFunctions);
    
    if (!featureFunctions) {
        console.error("DEBUG: featureFunctions is undefined!");
        return null;
    }
    
    const { getBoundingBox, resizeImage, computeHaarFeatures, aspectRatio, numRegionsBelowThreshold } = featureFunctions;
    
    console.log("DEBUG: getBoundingBox:", typeof getBoundingBox);
    console.log("DEBUG: resizeImage:", typeof resizeImage);
    console.log("DEBUG: computeHaarFeatures:", typeof computeHaarFeatures);
    console.log("DEBUG: aspectRatio:", typeof aspectRatio);
    console.log("DEBUG: numRegionsBelowThreshold:", typeof numRegionsBelowThreshold);
    
    if (!getBoundingBox) {
        console.error("DEBUG: getBoundingBox is undefined after destructuring!");
        return null;
    }
    
    // 1. Get bounding box and crop
    const cropped = getBoundingBox(image);
    if (cropped.length === 0) {
        // Handle empty image case
        return null;
    }
    
    // 2. Resize to 12x12
    const resized = resizeImage(cropped, 12);
    
    // 3. Compute Haar features
    const haarFeatures = computeHaarFeatures(resized);
    
    // 4. Compute aspect ratio on original 28x28 image
    const aspectRatioValue = aspectRatio(image);
    
    // 5. Compute number of regions
    const numRegions = numRegionsBelowThreshold(image);
    
    // 6. Combine all features
    const features = [...haarFeatures, aspectRatioValue, numRegions];
    
    return features;
}

// Main training function - simplified version with epoch callback
async function trainMLPModel(augmentedDataset, featureFunctions, validationSplit = 0.1, randomSeed = 0, onEpochUpdate = null, verificationType = null) {
    console.log("Starting MLP training pipeline...");
    console.log("DEBUG: trainMLPModel called with:");
    console.log("DEBUG: augmentedDataset:", augmentedDataset ? augmentedDataset.length : "undefined");
    console.log("DEBUG: featureFunctions:", featureFunctions);
    console.log("DEBUG: featureFunctions keys:", featureFunctions ? Object.keys(featureFunctions) : "undefined");
    console.log("DEBUG: validationSplit:", validationSplit);
    console.log("DEBUG: randomSeed:", randomSeed);
    console.log("DEBUG: onEpochUpdate:", typeof onEpochUpdate);
    console.log("DEBUG: verificationType:", verificationType);
    
    if (!augmentedDataset) {
        console.error("DEBUG: augmentedDataset is undefined!");
        return null;
    }
    
    if (!featureFunctions) {
        console.error("DEBUG: featureFunctions is undefined!");
        return null;
    }
    
    // 1. Create label to index mapping
    const uniqueLabels = [...new Set(augmentedDataset.map(item => item.label))].sort();
    const labelToIdx = {};
    uniqueLabels.forEach((label, idx) => {
        labelToIdx[label] = idx;
    });
    
    console.log("Label mapping:", labelToIdx);
    console.log("Unique labels:", uniqueLabels);
    
    // 2. Shuffle dataset with seed for reproducibility
    const shuffledDataset = shuffleArraySeeded(augmentedDataset, randomSeed);
    console.log("DEBUG: shuffledDataset length:", shuffledDataset.length);
    
    // 3. Split into train and validation
    const valSize = Math.floor(validationSplit * shuffledDataset.length);
    console.log("DEBUG: valSize calculation:", validationSplit, "*", shuffledDataset.length, "=", valSize);
    
    const validationData = shuffledDataset.slice(0, valSize);
    const trainData = shuffledDataset.slice(valSize);
    
    console.log(`Dataset split - Train: ${trainData.length}, Validation: ${valSize}`);
    
    // 4. Extract features for all samples
    console.log("Extracting features...");
    
    const trainFeatures = [];
    const trainLabels = [];
    const valFeatures = [];
    const valLabels = [];
    
    // Process training data
    for (let i = 0; i < trainData.length; i++) {
        if (i % 100 === 0) {
            console.log(`Processing train sample ${i}/${trainData.length}`);
        }
        
        let features;
        if (verificationType === 'face' && trainData[i].image && Array.isArray(trainData[i].image) && trainData[i].image.length === 32) {
            // For face verification, if the data is already a 32-dimensional PCA vector, use it directly
            features = trainData[i].image;
        } else {
            // For signature verification or other cases, extract features using the feature functions
            features = extractFeaturesFromImage(trainData[i].image, featureFunctions);
        }
        
        if (features) {
            trainFeatures.push(features);
            trainLabels.push(labelToIdx[trainData[i].label]);
        }
    }
    
    // Process validation data
    for (let i = 0; i < validationData.length; i++) {
        let features;
        if (verificationType === 'face' && validationData[i].image && Array.isArray(validationData[i].image) && validationData[i].image.length === 32) {
            // For face verification, if the data is already a 32-dimensional PCA vector, use it directly
            features = validationData[i].image;
        } else {
            // For signature verification or other cases, extract features using the feature functions
            features = extractFeaturesFromImage(validationData[i].image, featureFunctions);
        }
        
        if (features) {
            valFeatures.push(features);
            valLabels.push(labelToIdx[validationData[i].label]);
        }
    }
    
    console.log(`Features extracted - Train: ${trainFeatures.length}, Validation: ${valFeatures.length}`);
    console.log(`Feature dimension: ${trainFeatures[0].length}`);
    
    // 5. Standardize features
    console.log("Standardizing features...");
    const scaler = new StandardScaler();
    const trainFeaturesNormalized = scaler.fitTransform(trainFeatures);
    const valFeaturesNormalized = scaler.transform(valFeatures);
    
    console.log("Scaler statistics:");
    console.log("Mean:", scaler.mean);
    console.log("Scale:", scaler.scale);
    
    // 6. Calculate model dimensions based on verification type
    const inputDim = trainFeaturesNormalized[0].length;
    const outputDim = uniqueLabels.length;
    
    let hiddenDim;
    if (verificationType === 'face') {
        // For face verification: 32 -> 17 -> 2
        hiddenDim = 17;
    } else {
        // For signature verification: 20 -> 11 -> 2
        hiddenDim = 11;
    }
    
    console.log(`Model architecture for ${verificationType}: ${inputDim} -> ${hiddenDim} -> ${outputDim}`);
    
    // 7. Convert to tensors
    const trainX = tf.tensor2d(trainFeaturesNormalized);
    const valX = tf.tensor2d(valFeaturesNormalized);

    console.log("trainX", trainX);
    console.log("valX", valX);
    console.log("trainLabels", trainLabels);
    console.log("vavalLabelslX", valLabels);

    
    // Convert labels to one-hot encoding
    const trainYInt = tf.tensor1d(trainLabels, 'int32');
    console.log("trainYInt", trainYInt);
    const valYInt = tf.tensor1d(valLabels, 'int32');
    console.log("valYInt", valYInt);
    console.log("trainYInt", trainYInt);
    console.log("outputDim", outputDim);
    const trainY = tf.oneHot(trainYInt, outputDim);
    console.log("trainY", trainY);
    const valY = tf.oneHot(valYInt, outputDim);
    
    // Dispose integer tensors
    trainYInt.dispose();
    valYInt.dispose();
    
    console.log("DEBUG: Tensor shapes:");
    console.log("DEBUG: trainX shape:", trainX.shape);
    console.log("DEBUG: trainY shape:", trainY.shape);
    console.log("DEBUG: valX shape:", valX.shape);
    console.log("DEBUG: valY shape:", valY.shape);
    console.log("DEBUG: trainLabels sample:", trainLabels.slice(0, 10));
    console.log("DEBUG: trainLabels unique values:", [...new Set(trainLabels)]);
    
    // 8. Create model
    const model = createMLPModel(inputDim, hiddenDim, outputDim);
    
    // 9. Training with manual early stopping and epoch updates
    console.log("Starting training with manual early stopping...");
    
    let bestValLoss = Infinity;
    let bestWeights = null;
    let patience = 10;
    let patienceCounter = 0;
    let epoch = 0;
    const maxEpochs = 100;
    
    while (epoch < maxEpochs && patienceCounter < patience) {
        // Train for one epoch
        try {
            const history = await model.fit(trainX, trainY, {
                epochs: 1,
                validationData: [valX, valY],
                verbose: 0,
                batchSize: 32
            });
            
            if (!history || !history.history) {
                console.error("DEBUG: history or history.history is undefined!");
                throw new Error("Training history is undefined");
            }
            
            const currentValLoss = history.history.val_loss ? history.history.val_loss[0] : null;
            const currentLoss = history.history.loss ? history.history.loss[0] : null;
            const currentAccuracy = history.history.accuracy ? history.history.accuracy[0] : null;
            const currentValAccuracy = history.history.val_accuracy ? history.history.val_accuracy[0] : null;
            
            if (currentLoss === null || currentValLoss === null) {
                console.error("DEBUG: Some training metrics are null!");
                throw new Error("Training metrics are null");
            }
            
            // Call epoch update callback
            if (onEpochUpdate && typeof onEpochUpdate === 'function') {
                try {
                    onEpochUpdate(epoch + 1, {
                        loss: currentLoss,
                        val_loss: currentValLoss,
                        accuracy: currentAccuracy || 0,
                        val_accuracy: currentValAccuracy || 0
                    });
                } catch (callbackError) {
                    console.error("Error in epoch update callback:", callbackError);
                    // Don't stop training for callback errors
                }
            }
            await tf.nextFrame();

            // Early stopping check
            if (currentValLoss < bestValLoss) {
                bestValLoss = currentValLoss;
                bestWeights = await model.getWeights();
                patienceCounter = 0;
            } else {
                patienceCounter++;
            }
            
            // Log progress every 10 epochs
            if ((epoch + 1) % 10 === 0) {
                console.log(`Epoch ${epoch + 1}: Loss: ${currentLoss.toFixed(4)}, Val Loss: ${currentValLoss.toFixed(4)}, Val Acc: ${(currentValAccuracy || 0).toFixed(4)}`);
            }
            
        } catch (fitError) {
            console.error("DEBUG: Error during model.fit:", fitError);
            console.error("DEBUG: Error message:", fitError.message);
            console.error("DEBUG: Error stack:", fitError.stack);
            
            // Try to get more info about the tensors
            console.log("DEBUG: Tensor info at error:");
            console.log("DEBUG: trainX shape:", trainX.shape);
            console.log("DEBUG: trainY shape:", trainY.shape);
            console.log("DEBUG: valX shape:", valX.shape);
            console.log("DEBUG: valY shape:", valY.shape);
            
            throw fitError;
        }

        epoch++;
    }
    
    // Restore best weights
    if (bestWeights) {
        await model.setWeights(bestWeights);
        console.log(`Training completed. Best validation loss: ${bestValLoss.toFixed(4)} at epoch ${epoch - patienceCounter}`);
    }
    
    // Final epoch update to show completion
    if (onEpochUpdate && typeof onEpochUpdate === 'function') {
        try {
            onEpochUpdate(epoch, null, true); // null metrics, true for finished
        } catch (callbackError) {
            console.error("Error in final epoch update callback:", callbackError);
        }
    }
    
    // 10. Final evaluation
    const finalEvaluation = await model.evaluate(valX, valY, { verbose: 0 });
    const finalValLoss = finalEvaluation[0].dataSync()[0];
    const finalValAccuracy = finalEvaluation[1].dataSync()[0];
    
    console.log(`Final validation accuracy: ${finalValAccuracy.toFixed(4)}`);
    console.log(`Final validation loss: ${finalValLoss.toFixed(4)}`);
    
    // Clean up tensors
    trainX.dispose();
    trainY.dispose();
    valX.dispose();
    valY.dispose();
    
    return {
        model,
        scaler,
        labelToIdx,
        finalAccuracy: finalValAccuracy,
        finalLoss: finalValLoss,
        inputDim,
        hiddenDim,
        outputDim
    };
}

// Function to make predictions on new data
function predictWithModel(model, scaler, labelToIdx, imageData, featureFunctions) {
    const features = extractFeaturesFromImage(imageData, featureFunctions);
    if (!features) {
        return null;
    }
    
    const normalizedFeatures = scaler.transform([features]);
    const prediction = model.predict(tf.tensor2d(normalizedFeatures));
    const probabilities = prediction.dataSync();
    
    // Convert back to labels
    const idxToLabel = Object.fromEntries(
        Object.entries(labelToIdx).map(([label, idx]) => [idx, parseInt(label)])
    );
    
    const predictedIdx = probabilities.indexOf(Math.max(...probabilities));
    const predictedLabel = idxToLabel[predictedIdx];
    const confidence = probabilities[predictedIdx];
    
    prediction.dispose();
    
    return {
        predictedLabel,
        confidence,
        probabilities: [...probabilities],
        labelMapping: idxToLabel
    };
}

export {
    trainMLPModel,
    predictWithModel,
    StandardScaler,
    shuffleArraySeeded
};