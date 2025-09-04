// modelConstants.js - Shared constants for model processing

// Feature normalization constants for signature verification
export const SIGNATURE_FEATURE_MEANS = [
    -156.89455555555554, -746.5724074074074, 181.8240925925926,
    -233.12468518518517, 215.89527777777778, 263.25757407407406,
    -26.51775925925926, -543.3616481481481, -95.56633333333333,
    -166.66537037037037, 12.451333333333332, 338.8871111111111,
    -328.52153703703704, -618.7087592592593, -104.3222962962963,
    63.83240740740741, 266.76446296296297, 587.4937592592593,
    0.800278554246832, 1.6494444444444445,
];

export const SIGNATURE_FEATURE_STDS = [
    1043.9481099421746, 922.6413166564906, 1081.7258364235456,
    985.0782471787254, 874.9847165310242, 1126.609325302833,
    1008.5022217328883, 1128.672429354368, 1088.6080378204506,
    1055.7391728007258, 981.360965040711, 1344.6910499347453,
    1022.6303743646741, 990.6650968719681, 1184.0437747222106,
    1175.2329215102861, 817.5057847253131, 1208.9739683033454,
    0.22148878238313918, 0.8687792982892613,
];

// Model architecture constants
export const MODEL_ARCHITECTURES = {
    SIGNATURE: {
        INPUT_DIM: 20,
        HIDDEN_DIM: 11,
        OUTPUT_DIM: 2
    },
    FACE: {
        INPUT_DIM: 32,
        HIDDEN_DIM: 17,
        OUTPUT_DIM: 2
    }
};

// Scaling factors
export const SCALING_FACTORS = {
    FIXED_POINT: 16,
    LAYER1: 16,
    LAYER2: 16,
    get BIAS1() { return this.LAYER1 * this.LAYER1; }, // 256
    get BIAS2() { return this.LAYER1 * this.BIAS1; },  // 4096
    get OUTPUT_FIXED_POINT() { return this.LAYER1 * this.LAYER1 * this.LAYER1; } // 4096
};

// Activation functions
export const relu = (x) => x < 0 ? 0 : x;

// Normalization utility
export const normalizeFeatures = (features, means = null, stds = null) => {
    const useMeans = means || SIGNATURE_FEATURE_MEANS;
    const useStds = stds || SIGNATURE_FEATURE_STDS;
    
    return features.map((v, idx) => (v - useMeans[idx]) / useStds[idx]);
};

// Fixed point conversion
export const toFixedPoint = (features, scalingFactor = SCALING_FACTORS.FIXED_POINT) => {
    return features.map(v => Math.round(v * scalingFactor));
};