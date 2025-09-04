// Transpiled from Leo to JavaScript - MLP Neural Network Inference

/**
 * ReLU activation function
 * @param {number} x - Input value
 * @returns {number} - Max(0, x)
 */
export function relu(x) {
    return x < 0 ? 0 : x;
}

/**
 * Main neural network inference function
 * @param {Object} struct0_0 - Input data (18 features: x0-x17)
 * @param {Object} struct0_1 - Weight/bias data (18 features: x0-x17)
 * @param {Object} struct0_2 - Weight/bias data (18 features: x0-x17)
 * @param {Object} struct0_3 - Weight/bias data (17 features: x0-x16)
 * @param {Object} struct0_4 - Weight/bias data (17 features: x0-x16)
 * @param {Object} struct0_5 - Weight/bias data (17 features: x0-x16)
 * @param {Object} struct0_6 - Weight/bias data (17 features: x0-x16)
 * @param {Object} struct0_7 - Weight/bias data (17 features: x0-x16)
 * @param {Object} struct0_8 - Weight/bias data (17 features: x0-x16)
 * @param {Object} struct0_9 - Weight/bias data (17 features: x0-x16)
 * @param {Object} struct0_10 - Weight/bias data (17 features: x0-x16)
 * @param {Object} struct0_11 - Weight/bias data (17 features: x0-x16)
 * @param {Object} struct0_12 - Weight/bias data (17 features: x0-x16)
 * @param {Object} struct0_13 - Weight/bias data (17 features: x0-x16)
 * @param {Object} struct0_14 - Weight/bias data (17 features: x0-x16)
 * @param {Object} struct0_15 - Weight/bias data (17 features: x0-x16)
 * @returns {Array} - [output_0, output_1]
 */
export function mlpInference(struct0_0, struct0_1, struct0_2, struct0_3, struct0_4, struct0_5, 
                     struct0_6, struct0_7, struct0_8, struct0_9, struct0_10, struct0_11, 
                     struct0_12, struct0_13, struct0_14, struct0_15) {

    // ===== JAVASCRIPT MLP FIRST NEURON LOGGING =====
    console.log("\n=== JAVASCRIPT MLP FIRST NEURON ANALYSIS ===");

    // 1. Extract inputs to the first neuron (20 total inputs)
    const jsFirstNeuronInputs = [
        struct0_0.x0, struct0_0.x1, struct0_0.x2, struct0_0.x3, struct0_0.x4,
        struct0_0.x5, struct0_0.x6, struct0_0.x7, struct0_0.x8, struct0_0.x9,
        struct0_0.x10, struct0_0.x11, struct0_0.x12, struct0_0.x13, struct0_0.x14,
        struct0_0.x15, struct0_0.x16, struct0_0.x17, struct0_1.x0, struct0_1.x1
    ];

    // 2. Extract weights for the first neuron (20 total weights)
    const jsFirstNeuronWeights = [
        struct0_1.x2, struct0_1.x3, struct0_1.x4, struct0_1.x5, struct0_1.x6,
        struct0_1.x7, struct0_1.x8, struct0_1.x9, struct0_1.x10, struct0_1.x11,
        struct0_1.x12, struct0_1.x13, struct0_1.x14, struct0_1.x15, struct0_1.x16,
        struct0_1.x17, struct0_2.x0, struct0_2.x1, struct0_2.x2, struct0_2.x3
    ];

    // 3. Extract bias for the first neuron
    const jsFirstNeuronBias = struct0_2.x4;

    console.log("JS MLP First neuron inputs:", jsFirstNeuronInputs);
    console.log("JS MLP First neuron weights:", jsFirstNeuronWeights);
    console.log("JS MLP First neuron bias:", jsFirstNeuronBias);

    // 4. Manually compute pre-activation (before ReLU)
    let jsFirstNeuronPreActivation = jsFirstNeuronBias;
    for (let i = 0; i < jsFirstNeuronInputs.length; i++) {
        jsFirstNeuronPreActivation += jsFirstNeuronInputs[i] * jsFirstNeuronWeights[i];
    }
    console.log("JS MLP First neuron pre-activation (bias + sum(input*weight)):", jsFirstNeuronPreActivation);

    // 5. Apply ReLU activation
    const jsFirstNeuronActivation = relu(jsFirstNeuronPreActivation);
    console.log("JS MLP First neuron final activation (after ReLU):", jsFirstNeuronActivation);

    console.log("=== JAVASCRIPT MLP FIRST NEURON ANALYSIS COMPLETE ===\n");
    // ===== JAVASCRIPT MLP FIRST NEURON LOGGING END =====

    // Hidden layer computations with ReLU activation
    const neuron_1_0 = relu(
        struct0_1.x2 * struct0_0.x0 + struct0_1.x3 * struct0_0.x1 + struct0_1.x4 * struct0_0.x2 + 
        struct0_1.x5 * struct0_0.x3 + struct0_1.x6 * struct0_0.x4 + struct0_1.x7 * struct0_0.x5 + 
        struct0_1.x8 * struct0_0.x6 + struct0_1.x9 * struct0_0.x7 + struct0_1.x10 * struct0_0.x8 + 
        struct0_1.x11 * struct0_0.x9 + struct0_1.x12 * struct0_0.x10 + struct0_1.x13 * struct0_0.x11 + 
        struct0_1.x14 * struct0_0.x12 + struct0_1.x15 * struct0_0.x13 + struct0_1.x16 * struct0_0.x14 + 
        struct0_1.x17 * struct0_0.x15 + struct0_2.x0 * struct0_0.x16 + struct0_2.x1 * struct0_0.x17 + 
        struct0_2.x2 * struct0_1.x0 + struct0_2.x3 * struct0_1.x1 + struct0_2.x4
    );

    const neuron_1_1 = relu(
        struct0_2.x5 * struct0_0.x0 + struct0_2.x6 * struct0_0.x1 + struct0_2.x7 * struct0_0.x2 + 
        struct0_2.x8 * struct0_0.x3 + struct0_2.x9 * struct0_0.x4 + struct0_2.x10 * struct0_0.x5 + 
        struct0_2.x11 * struct0_0.x6 + struct0_2.x12 * struct0_0.x7 + struct0_2.x13 * struct0_0.x8 + 
        struct0_2.x14 * struct0_0.x9 + struct0_2.x15 * struct0_0.x10 + struct0_2.x16 * struct0_0.x11 + 
        struct0_2.x17 * struct0_0.x12 + struct0_3.x0 * struct0_0.x13 + struct0_3.x1 * struct0_0.x14 + 
        struct0_3.x2 * struct0_0.x15 + struct0_3.x3 * struct0_0.x16 + struct0_3.x4 * struct0_0.x17 + 
        struct0_3.x5 * struct0_1.x0 + struct0_3.x6 * struct0_1.x1 + struct0_3.x7
    );

    const neuron_1_2 = relu(
        struct0_3.x8 * struct0_0.x0 + struct0_3.x9 * struct0_0.x1 + struct0_3.x10 * struct0_0.x2 + 
        struct0_3.x11 * struct0_0.x3 + struct0_3.x12 * struct0_0.x4 + struct0_3.x13 * struct0_0.x5 + 
        struct0_3.x14 * struct0_0.x6 + struct0_3.x15 * struct0_0.x7 + struct0_3.x16 * struct0_0.x8 + 
        struct0_4.x0 * struct0_0.x9 + struct0_4.x1 * struct0_0.x10 + struct0_4.x2 * struct0_0.x11 + 
        struct0_4.x3 * struct0_0.x12 + struct0_4.x4 * struct0_0.x13 + struct0_4.x5 * struct0_0.x14 + 
        struct0_4.x6 * struct0_0.x15 + struct0_4.x7 * struct0_0.x16 + struct0_4.x8 * struct0_0.x17 + 
        struct0_4.x9 * struct0_1.x0 + struct0_4.x10 * struct0_1.x1 + struct0_4.x11
    );

    const neuron_1_3 = relu(
        struct0_4.x12 * struct0_0.x0 + struct0_4.x13 * struct0_0.x1 + struct0_4.x14 * struct0_0.x2 + 
        struct0_4.x15 * struct0_0.x3 + struct0_4.x16 * struct0_0.x4 + struct0_5.x0 * struct0_0.x5 + 
        struct0_5.x1 * struct0_0.x6 + struct0_5.x2 * struct0_0.x7 + struct0_5.x3 * struct0_0.x8 + 
        struct0_5.x4 * struct0_0.x9 + struct0_5.x5 * struct0_0.x10 + struct0_5.x6 * struct0_0.x11 + 
        struct0_5.x7 * struct0_0.x12 + struct0_5.x8 * struct0_0.x13 + struct0_5.x9 * struct0_0.x14 + 
        struct0_5.x10 * struct0_0.x15 + struct0_5.x11 * struct0_0.x16 + struct0_5.x12 * struct0_0.x17 + 
        struct0_5.x13 * struct0_1.x0 + struct0_5.x14 * struct0_1.x1 + struct0_5.x15
    );

    const neuron_1_4 = relu(
        struct0_5.x16 * struct0_0.x0 + struct0_6.x0 * struct0_0.x1 + struct0_6.x1 * struct0_0.x2 + 
        struct0_6.x2 * struct0_0.x3 + struct0_6.x3 * struct0_0.x4 + struct0_6.x4 * struct0_0.x5 + 
        struct0_6.x5 * struct0_0.x6 + struct0_6.x6 * struct0_0.x7 + struct0_6.x7 * struct0_0.x8 + 
        struct0_6.x8 * struct0_0.x9 + struct0_6.x9 * struct0_0.x10 + struct0_6.x10 * struct0_0.x11 + 
        struct0_6.x11 * struct0_0.x12 + struct0_6.x12 * struct0_0.x13 + struct0_6.x13 * struct0_0.x14 + 
        struct0_6.x14 * struct0_0.x15 + struct0_6.x15 * struct0_0.x16 + struct0_6.x16 * struct0_0.x17 + 
        struct0_7.x0 * struct0_1.x0 + struct0_7.x1 * struct0_1.x1 + struct0_7.x2
    );

    const neuron_1_5 = relu(
        struct0_7.x3 * struct0_0.x0 + struct0_7.x4 * struct0_0.x1 + struct0_7.x5 * struct0_0.x2 + 
        struct0_7.x6 * struct0_0.x3 + struct0_7.x7 * struct0_0.x4 + struct0_7.x8 * struct0_0.x5 + 
        struct0_7.x9 * struct0_0.x6 + struct0_7.x10 * struct0_0.x7 + struct0_7.x11 * struct0_0.x8 + 
        struct0_7.x12 * struct0_0.x9 + struct0_7.x13 * struct0_0.x10 + struct0_7.x14 * struct0_0.x11 + 
        struct0_7.x15 * struct0_0.x12 + struct0_7.x16 * struct0_0.x13 + struct0_8.x0 * struct0_0.x14 + 
        struct0_8.x1 * struct0_0.x15 + struct0_8.x2 * struct0_0.x16 + struct0_8.x3 * struct0_0.x17 + 
        struct0_8.x4 * struct0_1.x0 + struct0_8.x5 * struct0_1.x1 + struct0_8.x6
    );

    const neuron_1_6 = relu(
        struct0_8.x7 * struct0_0.x0 + struct0_8.x8 * struct0_0.x1 + struct0_8.x9 * struct0_0.x2 + 
        struct0_8.x10 * struct0_0.x3 + struct0_8.x11 * struct0_0.x4 + struct0_8.x12 * struct0_0.x5 + 
        struct0_8.x13 * struct0_0.x6 + struct0_8.x14 * struct0_0.x7 + struct0_8.x15 * struct0_0.x8 + 
        struct0_8.x16 * struct0_0.x9 + struct0_9.x0 * struct0_0.x10 + struct0_9.x1 * struct0_0.x11 + 
        struct0_9.x2 * struct0_0.x12 + struct0_9.x3 * struct0_0.x13 + struct0_9.x4 * struct0_0.x14 + 
        struct0_9.x5 * struct0_0.x15 + struct0_9.x6 * struct0_0.x16 + struct0_9.x7 * struct0_0.x17 + 
        struct0_9.x8 * struct0_1.x0 + struct0_9.x9 * struct0_1.x1 + struct0_9.x10
    );

    const neuron_1_7 = relu(
        struct0_9.x11 * struct0_0.x0 + struct0_9.x12 * struct0_0.x1 + struct0_9.x13 * struct0_0.x2 + 
        struct0_9.x14 * struct0_0.x3 + struct0_9.x15 * struct0_0.x4 + struct0_9.x16 * struct0_0.x5 + 
        struct0_10.x0 * struct0_0.x6 + struct0_10.x1 * struct0_0.x7 + struct0_10.x2 * struct0_0.x8 + 
        struct0_10.x3 * struct0_0.x9 + struct0_10.x4 * struct0_0.x10 + struct0_10.x5 * struct0_0.x11 + 
        struct0_10.x6 * struct0_0.x12 + struct0_10.x7 * struct0_0.x13 + struct0_10.x8 * struct0_0.x14 + 
        struct0_10.x9 * struct0_0.x15 + struct0_10.x10 * struct0_0.x16 + struct0_10.x11 * struct0_0.x17 + 
        struct0_10.x12 * struct0_1.x0 + struct0_10.x13 * struct0_1.x1 + struct0_10.x14
    );

    const neuron_1_8 = relu(
        struct0_10.x15 * struct0_0.x0 + struct0_10.x16 * struct0_0.x1 + struct0_11.x0 * struct0_0.x2 + 
        struct0_11.x1 * struct0_0.x3 + struct0_11.x2 * struct0_0.x4 + struct0_11.x3 * struct0_0.x5 + 
        struct0_11.x4 * struct0_0.x6 + struct0_11.x5 * struct0_0.x7 + struct0_11.x6 * struct0_0.x8 + 
        struct0_11.x7 * struct0_0.x9 + struct0_11.x8 * struct0_0.x10 + struct0_11.x9 * struct0_0.x11 + 
        struct0_11.x10 * struct0_0.x12 + struct0_11.x11 * struct0_0.x13 + struct0_11.x12 * struct0_0.x14 + 
        struct0_11.x13 * struct0_0.x15 + struct0_11.x14 * struct0_0.x16 + struct0_11.x15 * struct0_0.x17 + 
        struct0_11.x16 * struct0_1.x0 + struct0_12.x0 * struct0_1.x1 + struct0_12.x1
    );

    const neuron_1_9 = relu(
        struct0_12.x2 * struct0_0.x0 + struct0_12.x3 * struct0_0.x1 + struct0_12.x4 * struct0_0.x2 + 
        struct0_12.x5 * struct0_0.x3 + struct0_12.x6 * struct0_0.x4 + struct0_12.x7 * struct0_0.x5 + 
        struct0_12.x8 * struct0_0.x6 + struct0_12.x9 * struct0_0.x7 + struct0_12.x10 * struct0_0.x8 + 
        struct0_12.x11 * struct0_0.x9 + struct0_12.x12 * struct0_0.x10 + struct0_12.x13 * struct0_0.x11 + 
        struct0_12.x14 * struct0_0.x12 + struct0_12.x15 * struct0_0.x13 + struct0_12.x16 * struct0_0.x14 + 
        struct0_13.x0 * struct0_0.x15 + struct0_13.x1 * struct0_0.x16 + struct0_13.x2 * struct0_0.x17 + 
        struct0_13.x3 * struct0_1.x0 + struct0_13.x4 * struct0_1.x1 + struct0_13.x5
    );

    const neuron_1_10 = relu(
        struct0_13.x6 * struct0_0.x0 + struct0_13.x7 * struct0_0.x1 + struct0_13.x8 * struct0_0.x2 + 
        struct0_13.x9 * struct0_0.x3 + struct0_13.x10 * struct0_0.x4 + struct0_13.x11 * struct0_0.x5 + 
        struct0_13.x12 * struct0_0.x6 + struct0_13.x13 * struct0_0.x7 + struct0_13.x14 * struct0_0.x8 + 
        struct0_13.x15 * struct0_0.x9 + struct0_13.x16 * struct0_0.x10 + struct0_14.x0 * struct0_0.x11 + 
        struct0_14.x1 * struct0_0.x12 + struct0_14.x2 * struct0_0.x13 + struct0_14.x3 * struct0_0.x14 + 
        struct0_14.x4 * struct0_0.x15 + struct0_14.x5 * struct0_0.x16 + struct0_14.x6 * struct0_0.x17 + 
        struct0_14.x7 * struct0_1.x0 + struct0_14.x8 * struct0_1.x1 + struct0_14.x9
    );

    // Output layer computations (linear, no activation)
    const output_0 = struct0_14.x10 * neuron_1_0 + struct0_14.x11 * neuron_1_1 + struct0_14.x12 * neuron_1_2 + 
                     struct0_14.x13 * neuron_1_3 + struct0_14.x14 * neuron_1_4 + struct0_14.x15 * neuron_1_5 + 
                     struct0_14.x16 * neuron_1_6 + struct0_15.x0 * neuron_1_7 + struct0_15.x1 * neuron_1_8 + 
                     struct0_15.x2 * neuron_1_9 + struct0_15.x3 * neuron_1_10 + struct0_15.x4;

    const output_1 = struct0_15.x5 * neuron_1_0 + struct0_15.x6 * neuron_1_1 + struct0_15.x7 * neuron_1_2 + 
                     struct0_15.x8 * neuron_1_3 + struct0_15.x9 * neuron_1_4 + struct0_15.x10 * neuron_1_5 + 
                     struct0_15.x11 * neuron_1_6 + struct0_15.x12 * neuron_1_7 + struct0_15.x13 * neuron_1_8 + 
                     struct0_15.x14 * neuron_1_9 + struct0_15.x15 * neuron_1_10 + struct0_15.x16;

    return [output_0, output_1];
}

// Example usage:
// const inputData = { x0: 1, x1: 2, x2: 3, ..., x17: 18 };
// const weights1 = { x0: 0.1, x1: 0.2, ..., x17: 1.8 };
// ... (define all weight structures)
// const result = mlpInference(inputData, weights1, weights2, ...);
// console.log("Network outputs:", result); // [output_0, output_1]
