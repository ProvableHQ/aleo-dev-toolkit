import { VERIFICATION_TYPES } from "./hooks/useVerification.jsx";

// Utility function to create 2D array
export function create2DArray(rows, cols, fillValue = 0) {
    return Array.from({ length: rows }, () => new Array(cols).fill(fillValue));
}

// Gaussian kernel for filtering
export function generateGaussianKernel(size, sigma) {
    const kernel = create2DArray(size, size);
    const center = Math.floor(size / 2);
    let sum = 0;

    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const x = i - center;
            const y = j - center;
            const value = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
            kernel[i][j] = value;
            sum += value;
        }
    }

    // Normalize kernel
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            kernel[i][j] /= sum;
        }
    }

    return kernel;
}

// Apply Gaussian filter to 2D array
export function gaussianFilter(image, sigma) {
    const h = image.length;
    const w = image[0].length;
    const kernelSize = Math.max(3, Math.ceil(sigma * 3) * 2 + 1);
    const kernel = generateGaussianKernel(kernelSize, sigma);
    const filtered = create2DArray(h, w);
    const offset = Math.floor(kernelSize / 2);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let sum = 0;
            for (let ky = 0; ky < kernelSize; ky++) {
                for (let kx = 0; kx < kernelSize; kx++) {
                    const iy = y + ky - offset;
                    const ix = x + kx - offset;
                    if (iy >= 0 && iy < h && ix >= 0 && ix < w) {
                        sum += image[iy][ix] * kernel[ky][kx];
                    }
                }
            }
            filtered[y][x] = sum;
        }
    }

    return filtered;
}

// Bilinear interpolation
export function bilinearInterpolate(image, x, y) {
    const h = image.length;
    const w = image[0].length;

    if (x < 0 || x >= w - 1 || y < 0 || y >= h - 1) {
        // Return edge value for out-of-bounds (reflection mode)
        const clampedX = Math.max(0, Math.min(w - 1, Math.round(x)));
        const clampedY = Math.max(0, Math.min(h - 1, Math.round(y)));
        return image[clampedY][clampedX];
    }

    const x1 = Math.floor(x);
    const y1 = Math.floor(y);
    const x2 = x1 + 1;
    const y2 = y1 + 1;

    const dx = x - x1;
    const dy = y - y1;

    const q11 = image[y1][x1];
    const q12 = image[y2][x1];
    const q21 = image[y1][x2];
    const q22 = image[y2][x2];

    const interpolated =
        q11 * (1 - dx) * (1 - dy) +
        q21 * dx * (1 - dy) +
        q12 * (1 - dx) * dy +
        q22 * dx * dy;

    return interpolated;
}

// Elastic warping function
export function elasticWarp(image, alpha = 34, sigma = 4) {
    const h = image.length;
    const w = image[0].length;

    // Generate random displacement fields
    const randDx = create2DArray(h, w);
    const randDy = create2DArray(h, w);

    for (let i = 0; i < h; i++) {
        for (let j = 0; j < w; j++) {
            randDx[i][j] = Math.random() * 2 - 1;
            randDy[i][j] = Math.random() * 2 - 1;
        }
    }

    // Apply Gaussian filter to displacement fields
    const dx = gaussianFilter(randDx, sigma);
    const dy = gaussianFilter(randDy, sigma);

    // Scale by alpha
    for (let i = 0; i < h; i++) {
        for (let j = 0; j < w; j++) {
            dx[i][j] *= alpha;
            dy[i][j] *= alpha;
        }
    }

    // Apply warping
    const warped = create2DArray(h, w);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const newX = x + dx[y][x];
            const newY = y + dy[y][x];
            warped[y][x] = bilinearInterpolate(image, newX, newY);
        }
    }

    return warped;
}

// Image rotation function
export function rotateImage(image, maxAngle = 15) {
    const h = image.length;
    const w = image[0].length;
    const angle = ((Math.random() * 2 - 1) * maxAngle * Math.PI) / 180; // Convert to radians

    const centerX = w / 2;
    const centerY = h / 2;

    const cos_a = Math.cos(angle);
    const sin_a = Math.sin(angle);

    const rotated = create2DArray(h, w);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            // Translate to center
            const tx = x - centerX;
            const ty = y - centerY;

            // Apply rotation
            const rotX = tx * cos_a - ty * sin_a;
            const rotY = tx * sin_a + ty * cos_a;

            // Translate back
            const sourceX = rotX + centerX;
            const sourceY = rotY + centerY;

            rotated[y][x] = bilinearInterpolate(image, sourceX, sourceY);
        }
    }

    return rotated;
}

// Morphological operations for stroke width jittering
export function erode(image, kernelSize = 1) {
    const h = image.length;
    const w = image[0].length;
    const result = create2DArray(h, w);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let minVal = 255;
            for (let ky = -kernelSize; ky <= kernelSize; ky++) {
                for (let kx = -kernelSize; kx <= kernelSize; kx++) {
                    const ny = y + ky;
                    const nx = x + kx;
                    if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
                        minVal = Math.min(minVal, image[ny][nx]);
                    }
                }
            }
            result[y][x] = minVal;
        }
    }

    return result;
}

export function dilate(image, kernelSize = 1) {
    const h = image.length;
    const w = image[0].length;
    const result = create2DArray(h, w);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let maxVal = 0;
            for (let ky = -kernelSize; ky <= kernelSize; ky++) {
                for (let kx = -kernelSize; kx <= kernelSize; kx++) {
                    const ny = y + ky;
                    const nx = x + kx;
                    if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
                        maxVal = Math.max(maxVal, image[ny][nx]);
                    }
                }
            }
            result[y][x] = maxVal;
        }
    }

    return result;
}

// Otsu's thresholding
export function otsuThreshold(image) {
    const h = image.length;
    const w = image[0].length;

    // Calculate histogram
    const histogram = new Array(256).fill(0);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const pixel = Math.round(Math.max(0, Math.min(255, image[y][x])));
            histogram[pixel]++;
        }
    }

    const total = h * w;
    let sum = 0;
    for (let i = 0; i < 256; i++) {
        sum += i * histogram[i];
    }

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let maxVariance = 0;
    let threshold = 0;

    for (let t = 0; t < 256; t++) {
        wB += histogram[t];
        if (wB === 0) continue;

        wF = total - wB;
        if (wF === 0) break;

        sumB += t * histogram[t];

        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;

        const varBetween = wB * wF * (mB - mF) * (mB - mF);

        if (varBetween > maxVariance) {
            maxVariance = varBetween;
            threshold = t;
        }
    }

    return threshold;
}

// Stroke width jittering
export function strokeWidthJitter(image) {
    // Apply Otsu thresholding
    const threshold = otsuThreshold(image);
    const binary = create2DArray(image.length, image[0].length);

    for (let y = 0; y < image.length; y++) {
        for (let x = 0; x < image[0].length; x++) {
            binary[y][x] = image[y][x] > threshold ? 255 : 0;
        }
    }

    // Randomly choose erosion or dilation
    const kernelSize = 1;
    const operation = Math.random() < 0.3 ? "erode" : "dilate";

    let result;
    if (operation === "erode") {
        result = erode(binary, kernelSize);
    } else {
        result = dilate(binary, kernelSize);
    }

    // safety net – if everything vanished, switch to dilation
    const anyOn = result.some((row) => row.some((v) => v));
    if (!anyOn) result = dilate(binary, 1);

    return result;
}

export function hasEnoughForeground(img, minRatio = 0.01) {
    // ≥1 % white pixels
    const tot = img.length * img[0].length;
    const white = img.flat().filter((v) => v > 0).length;
    return white / tot >= minRatio;
}

function padImage(img, pad = 6, val = 0) {
    const h = img.length,
        w = img[0].length;
    const out = create2DArray(h + 2 * pad, w + 2 * pad, val);
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) out[y + pad][x + pad] = img[y][x];
    return out;
}

function centerCrop(img, size = 28) {
    const h = img.length,
        w = img[0].length;
    const y0 = Math.floor((h - size) / 2);
    const x0 = Math.floor((w - size) / 2);
    return img.slice(y0, y0 + size).map((r) => r.slice(x0, x0 + size));
}

// Function to save image array to disk (for debugging face augmentation)
function saveImageToDisk(imageArray, filename) {
    try {
        const height = imageArray.length;
        const width = imageArray[0].length;
        
        // Create a canvas element
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Create ImageData
        const imageData = ctx.createImageData(width, height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const value = Math.round(Math.max(0, Math.min(255, imageArray[y][x])));
                imageData.data[idx] = value;     // R
                imageData.data[idx + 1] = value; // G
                imageData.data[idx + 2] = value; // B
                imageData.data[idx + 3] = 255;   // A
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Convert to blob and create download link
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 'image/png');
    } catch (error) {
        console.error('Error saving image to disk:', error);
    }
}

// Main augmentation function
export function augmentSample(image, nAugment = 29, verificationType) {
    const augmented = [];

    for (let i = 0; i < nAugment; i++) {

        if(verificationType === VERIFICATION_TYPES.SIGNATURE)
        {
            /* --- 1. geometry --- */
            let augImg = padImage(image, 6); // 40×40
            const alpha = Math.random() * 2 + 1; // 1 … 3
            const sigma = Math.random() * 0.4 + 0.8; // 0.8 … 1.2
            augImg = elasticWarp(augImg, alpha, sigma);
            augImg = rotateImage(augImg, 15);
            augImg = centerCrop(augImg, 28); // back to 28×28

            /* --- 2. morphology --- */
            augImg = strokeWidthJitter(augImg, 2);

            /* --- 3. discard nearly-empty samples --- */
            if (!hasEnoughForeground(augImg)) {
                i--; // redo this iteration
                continue;
            }

            /* --- 4. clamp to [0,255] --- */
            for (let y = 0; y < 28; y++) {
                for (let x = 0; x < 28; x++) {
                    augImg[y][x] = Math.round(
                        Math.max(0, Math.min(255, augImg[y][x])),
                    );
                }
            }

            /* --- 5. store exactly once --- */
            augmented.push(augImg);
        }
        
        if(verificationType === VERIFICATION_TYPES.FACE)
        {
            /* --- 1. geometry transformations --- */
            let augImg = [...image]; // Start with a copy of the full image
            
            // Random rotation (±8 degrees for faces)
            const rotationAngle = (Math.random() - 0.5) * 16; // ±8°
            augImg = rotateImageRGB(augImg, rotationAngle);
            
            // Random scaling (±10% for faces)
            const scaleFactor = 1 + (Math.random() - 0.5) * 0.2; // 0.9 to 1.1
            augImg = scaleImageRGB(augImg, scaleFactor);
            
            // Random translation (small shifts)
            const shiftX = Math.round((Math.random() - 0.5) * 8); // ±4 pixels
            const shiftY = Math.round((Math.random() - 0.5) * 8); // ±4 pixels
            augImg = translateImageRGB(augImg, shiftX, shiftY);
            
            /* --- 2. photometric transformations --- */
            // Brightness adjustment (±15%)
            const brightnessDelta = (Math.random() - 0.5) * 0.3 * 255; // ±15% of 255
            augImg = adjustBrightnessRGB(augImg, brightnessDelta);
            
            // Contrast adjustment (0.85 to 1.15)
            const contrastFactor = 1 + (Math.random() - 0.5) * 0.3; // 0.85 to 1.15
            augImg = adjustContrastRGB(augImg, contrastFactor);
            
            // Random noise (small amount for faces)
            if (Math.random() < 0.3) { // 30% chance to add noise
                augImg = addGaussianNoiseRGB(augImg, 0, 8); // mean=0, std=8
            }
            
            // Random horizontal flip (50% chance)
            if (Math.random() < 0.5) {
                augImg = horizontalFlipRGB(augImg);
            }
            
            /* --- 3. validation --- */
            // Check if face features are still visible (basic validation)
            if (!hasValidFaceFeaturesRGB(augImg)) {
                i--; // redo this iteration
                console.log("face has not valid features");
                continue;
            }    
            /* --- 4. clamp to [0,255] --- */
            for (let y = 0; y < 28; y++) {
                for (let x = 0; x < 28; x++) {
                    augImg[y][x] = Math.round(
                        Math.max(0, Math.min(255, augImg[y][x]))
                    );
                }
            }

            /* --- 5. save full-size color augmented image to disk for debugging --- */
            //const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            //const filename = `face_augmented_${i}_${timestamp}.png`;
            //saveImageToDiskRGB(augImg, filename);
            //console.log(`Saved full-size color augmented face image: ${filename}`);
            
            /* --- 6. save original full-size color image to disk for debugging --- */
            //const original_image_filename = `face_original_${i}_${timestamp}.png`;
            //saveImageToDiskRGB(image, original_image_filename);
            //console.log(`Saved original full-size color face image: ${original_image_filename}`);
            
            /* --- 7. store exactly once --- */
            augmented.push(augImg);
        }
    }

    return augmented;
}

// Helper functions for face augmentation
function scaleImage(image, scaleFactor) {
    const height = image.length;
    const width = image[0].length;
    const newHeight = Math.round(height * scaleFactor);
    const newWidth = Math.round(width * scaleFactor);
    
    const scaled = Array(height).fill().map(() => Array(width).fill(0));
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const srcY = Math.round(y / scaleFactor);
            const srcX = Math.round(x / scaleFactor);
            
            if (srcY >= 0 && srcY < height && srcX >= 0 && srcX < width) {
                scaled[y][x] = image[srcY][srcX];
            }
        }
    }
    
    return scaled;
}

function translateImage(image, shiftX, shiftY) {
    const height = image.length;
    const width = image[0].length;
    const translated = Array(height).fill().map(() => Array(width).fill(0));
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const srcY = y - shiftY;
            const srcX = x - shiftX;
            
            if (srcY >= 0 && srcY < height && srcX >= 0 && srcX < width) {
                translated[y][x] = image[srcY][srcX];
            }
        }
    }
    
    return translated;
}

function adjustBrightness(image, delta) {
    const height = image.length;
    const width = image[0].length;
    const brightened = Array(height).fill().map(() => Array(width).fill(0));
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            brightened[y][x] = image[y][x] + delta;
        }
    }
    
    return brightened;
}

function adjustContrast(image, factor) {
    const height = image.length;
    const width = image[0].length;
    const contrasted = Array(height).fill().map(() => Array(width).fill(0));
    
    // Calculate mean for contrast adjustment
    let mean = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            mean += image[y][x];
        }
    }
    mean /= (height * width);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            contrasted[y][x] = mean + factor * (image[y][x] - mean);
        }
    }
    
    return contrasted;
}

function addGaussianNoise(image, mean, stdDev) {
    const height = image.length;
    const width = image[0].length;
    const noisy = Array(height).fill().map(() => Array(width).fill(0));
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const noise = gaussianRandom() * stdDev + mean;
            noisy[y][x] = image[y][x] + noise;
        }
    }
    
    return noisy;
}

function gaussianRandom() {
    // Box-Muller transform for Gaussian random numbers
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function horizontalFlip(image) {
    const height = image.length;
    const width = image[0].length;
    const flipped = Array(height).fill().map(() => Array(width).fill(0));
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            flipped[y][x] = image[y][width - 1 - x];
        }
    }
    
    return flipped;
}

function hasValidFaceFeatures(image) {
    // Basic validation to ensure the image still contains meaningful face data
    const height = image.length;
    const width = image[0].length;
    
    // Check if there's sufficient non-zero pixels (face features)
    let nonZeroCount = 0;
    let totalIntensity = 0;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (image[y][x] > 20) { // threshold for meaningful pixels
                nonZeroCount++;
                totalIntensity += image[y][x];
            }
        }
    }
    
    // For larger images, require a smaller percentage of meaningful pixels
    const minPixelsRatio = height * width > 1000 ? 0.1 : 0.3; // 10% for large images, 30% for small
    const minPixels = Math.floor(height * width * minPixelsRatio);
    const avgIntensity = nonZeroCount > 0 ? totalIntensity / nonZeroCount : 0;
    
    return nonZeroCount >= minPixels && avgIntensity > 30; // Lower threshold for larger images
}

// Function to resize any image to 28x28
function resizeImageTo28x28(image) {
    const height = image.length;
    const width = image[0].length;
    const resized = Array.from({ length: 28 }, () => new Array(28).fill(0));
    
    const xScale = width / 28;
    const yScale = height / 28;
    
    for (let y = 0; y < 28; y++) {
        for (let x = 0; x < 28; x++) {
            const srcX = Math.floor(x * xScale);
            const srcY = Math.floor(y * yScale);
            
            if (srcY >= 0 && srcY < height && srcX >= 0 && srcX < width) {
                resized[y][x] = image[srcY][srcX];
            }
        }
    }
    
    return resized;
}

// Function to convert 2D array to data URI for display
export function imageArrayToDataUri(imageArray) {
    // eslint-disable-next-line no-undef
    const canvas = document.createElement("canvas");
    canvas.width = 28;
    canvas.height = 28;
    const ctx = canvas.getContext("2d");

    const imageData = ctx.createImageData(28, 28);
    for (let y = 0; y < 28; y++) {
        for (let x = 0; x < 28; x++) {
            const idx = (y * 28 + x) * 4;
            const value = imageArray[y][x];
            imageData.data[idx] = value; // R
            imageData.data[idx + 1] = value; // G
            imageData.data[idx + 2] = value; // B
            imageData.data[idx + 3] = 255; // A
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
}

// Function to create and augment training dataset
export function createAugmentedTrainingDataset(
    negativeDatapoints,
    positiveDatapoints,
    nAugment = 29,
) {
    console.log("Creating augmented training dataset...");
    console.log("Original negative samples:", negativeDatapoints.length);
    console.log("Original positive samples:", positiveDatapoints.length);

    const augmentedDataset = [];

    // Process negative datapoints (label: 0)
    negativeDatapoints.forEach((image, index) => {
        console.log(
            `Processing negative sample ${index + 1}/${negativeDatapoints.length}`,
        );

        // Add original image
        augmentedDataset.push({
            image: image,
            label: 0,
        });

        // Add augmented versions
        const augmentedImages = augmentSample(image, nAugment);
        augmentedImages.forEach((augImg) => {
            augmentedDataset.push({
                image: augImg,
                label: 0,
            });
        });
    });

    // Process positive datapoints (label: 1)
    positiveDatapoints.forEach((image, index) => {
        console.log(
            `Processing positive sample ${index + 1}/${positiveDatapoints.length}`,
        );

        // Add original image
        augmentedDataset.push({
            image: image,
            label: 1,
        });

        // Add augmented versions
        const augmentedImages = augmentSample(image, nAugment);
        augmentedImages.forEach((augImg) => {
            augmentedDataset.push({
                image: augImg,
                label: 1,
            });
        });
    });

    // Shuffle the dataset
    for (let i = augmentedDataset.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [augmentedDataset[i], augmentedDataset[j]] = [
            augmentedDataset[j],
            augmentedDataset[i],
        ];
    }

    console.log(
        `Original dataset size: ${negativeDatapoints.length + positiveDatapoints.length}`,
    );
    console.log(`Augmented dataset size: ${augmentedDataset.length}`);

    return augmentedDataset;
}

// RGB versions of helper functions for face augmentation
function rotateImageRGB(image, maxAngle = 15) {
    const h = image.length;
    const w = image[0].length;
    const angle = ((Math.random() * 2 - 1) * maxAngle * Math.PI) / 180; // Convert to radians

    const centerX = w / 2;
    const centerY = h / 2;

    const cos_a = Math.cos(angle);
    const sin_a = Math.sin(angle);

    const rotated = Array.from({ length: h }, () => 
        Array.from({ length: w }, () => ({ r: 0, g: 0, b: 0 }))
    );

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            // Translate to center
            const tx = x - centerX;
            const ty = y - centerY;

            // Apply rotation
            const rotX = tx * cos_a - ty * sin_a;
            const rotY = tx * sin_a + ty * cos_a;

            // Translate back
            const sourceX = rotX + centerX;
            const sourceY = rotY + centerY;

            const pixel = bilinearInterpolateRGB(image, sourceX, sourceY);
            rotated[y][x] = pixel;
        }
    }

    return rotated;
}

function bilinearInterpolateRGB(image, x, y) {
    const h = image.length;
    const w = image[0].length;

    if (x < 0 || x >= w - 1 || y < 0 || y >= h - 1) {
        // Return edge value for out-of-bounds (reflection mode)
        const clampedX = Math.max(0, Math.min(w - 1, Math.round(x)));
        const clampedY = Math.max(0, Math.min(h - 1, Math.round(y)));
        return image[clampedY][clampedX];
    }

    const x1 = Math.floor(x);
    const y1 = Math.floor(y);
    const x2 = x1 + 1;
    const y2 = y1 + 1;

    const dx = x - x1;
    const dy = y - y1;

    const q11 = image[y1][x1];
    const q12 = image[y2][x1];
    const q21 = image[y1][x2];
    const q22 = image[y2][x2];

    const interpolated = {
        r: q11.r * (1 - dx) * (1 - dy) + q21.r * dx * (1 - dy) + q12.r * (1 - dx) * dy + q22.r * dx * dy,
        g: q11.g * (1 - dx) * (1 - dy) + q21.g * dx * (1 - dy) + q12.g * (1 - dx) * dy + q22.g * dx * dy,
        b: q11.b * (1 - dx) * (1 - dy) + q21.b * dx * (1 - dy) + q12.b * (1 - dx) * dy + q22.b * dx * dy
    };

    return interpolated;
}

function scaleImageRGB(image, scaleFactor) {
    const height = image.length;
    const width = image[0].length;
    
    const scaled = Array.from({ length: height }, () => 
        Array.from({ length: width }, () => ({ r: 0, g: 0, b: 0 }))
    );
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const srcY = Math.round(y / scaleFactor);
            const srcX = Math.round(x / scaleFactor);
            
            if (srcY >= 0 && srcY < height && srcX >= 0 && srcX < width) {
                scaled[y][x] = image[srcY][srcX];
            }
        }
    }
    
    return scaled;
}

function translateImageRGB(image, shiftX, shiftY) {
    const height = image.length;
    const width = image[0].length;
    const translated = Array.from({ length: height }, () => 
        Array.from({ length: width }, () => ({ r: 0, g: 0, b: 0 }))
    );
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const srcY = y - shiftY;
            const srcX = x - shiftX;
            
            if (srcY >= 0 && srcY < height && srcX >= 0 && srcX < width) {
                translated[y][x] = image[srcY][srcX];
            }
        }
    }
    
    return translated;
}

function adjustBrightnessRGB(image, delta) {
    const height = image.length;
    const width = image[0].length;
    const brightened = Array.from({ length: height }, () => 
        Array.from({ length: width }, () => ({ r: 0, g: 0, b: 0 }))
    );
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            brightened[y][x] = {
                r: image[y][x].r + delta,
                g: image[y][x].g + delta,
                b: image[y][x].b + delta
            };
        }
    }
    
    return brightened;
}

function adjustContrastRGB(image, factor) {
    const height = image.length;
    const width = image[0].length;
    const contrasted = Array.from({ length: height }, () => 
        Array.from({ length: width }, () => ({ r: 0, g: 0, b: 0 }))
    );
    
    // Calculate mean for contrast adjustment
    let meanR = 0, meanG = 0, meanB = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            meanR += image[y][x].r;
            meanG += image[y][x].g;
            meanB += image[y][x].b;
        }
    }
    meanR /= (height * width);
    meanG /= (height * width);
    meanB /= (height * width);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            contrasted[y][x] = {
                r: meanR + factor * (image[y][x].r - meanR),
                g: meanG + factor * (image[y][x].g - meanG),
                b: meanB + factor * (image[y][x].b - meanB)
            };
        }
    }
    
    return contrasted;
}

function addGaussianNoiseRGB(image, mean, stdDev) {
    const height = image.length;
    const width = image[0].length;
    const noisy = Array.from({ length: height }, () => 
        Array.from({ length: width }, () => ({ r: 0, g: 0, b: 0 }))
    );
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const noise = gaussianRandom() * stdDev + mean;
            noisy[y][x] = {
                r: image[y][x].r + noise,
                g: image[y][x].g + noise,
                b: image[y][x].b + noise
            };
        }
    }
    
    return noisy;
}

function horizontalFlipRGB(image) {
    const height = image.length;
    const width = image[0].length;
    const flipped = Array.from({ length: height }, () => 
        Array.from({ length: width }, () => ({ r: 0, g: 0, b: 0 }))
    );
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            flipped[y][x] = image[y][width - 1 - x];
        }
    }
    
    return flipped;
}

function hasValidFaceFeaturesRGB(image) {
    // Basic validation to ensure the image still contains meaningful face data
    const height = image.length;
    const width = image[0].length;
    
    // Check if there's sufficient non-zero pixels (face features)
    let nonZeroCount = 0;
    let totalIntensity = 0;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixel = image[y][x];
            const intensity = (pixel.r + pixel.g + pixel.b) / 3;
            if (intensity > 20) { // threshold for meaningful pixels
                nonZeroCount++;
                totalIntensity += intensity;
            }
        }
    }
    
    // For larger images, require a smaller percentage of meaningful pixels
    const minPixelsRatio = height * width > 1000 ? 0.1 : 0.3; // 10% for large images, 30% for small
    const minPixels = Math.floor(height * width * minPixelsRatio);
    const avgIntensity = nonZeroCount > 0 ? totalIntensity / nonZeroCount : 0;
    
    return nonZeroCount >= minPixels && avgIntensity > 30; // Lower threshold for larger images
}

// Function to resize any RGB image to 28x28 grayscale for model input
function resizeImageTo28x28RGB(image) {
    const height = image.length;
    const width = image[0].length;
    const resized = Array.from({ length: 28 }, () => new Array(28).fill(0));
    
    const xScale = width / 28;
    const yScale = height / 28;
    
    for (let y = 0; y < 28; y++) {
        for (let x = 0; x < 28; x++) {
            const srcX = Math.floor(x * xScale);
            const srcY = Math.floor(y * yScale);
            
            if (srcY >= 0 && srcY < height && srcX >= 0 && srcX < width) {
                const pixel = image[srcY][srcX];
                // Convert RGB to grayscale for model input
                const grayscale = 0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b;
                resized[y][x] = grayscale;
            }
        }
    }
    
    return resized;
}

// Function to save RGB image array to disk
function saveImageToDiskRGB(imageArray, filename) {
    try {
        const height = imageArray.length;
        const width = imageArray[0].length;
        
        // Create a canvas element
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Create ImageData
        const imageData = ctx.createImageData(width, height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const pixel = imageArray[y][x];
                imageData.data[idx] = Math.round(Math.max(0, Math.min(255, pixel.r)));     // R
                imageData.data[idx + 1] = Math.round(Math.max(0, Math.min(255, pixel.g))); // G
                imageData.data[idx + 2] = Math.round(Math.max(0, Math.min(255, pixel.b))); // B
                imageData.data[idx + 3] = 255;   // A
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Convert to blob and create download link
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 'image/png');
    } catch (error) {
        console.error('Error saving RGB image to disk:', error);
    }
}
