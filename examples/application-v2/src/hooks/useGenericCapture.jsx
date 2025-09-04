import { useEffect, useRef, useState } from "react";
import { VERIFICATION_TYPES } from "./useVerification";
import { processImage } from "../components/signature/signature-utils";

// Import enhanced utilities to eliminate code duplication
import {
  loadFaceApiModels,
  processFaceImageToPCAVector,
  detectFaceWithDescriptor,
  createCanvasFromRGBArray,
  DETECTOR_INPUT_SIZE,
} from "../utils/faceUtils.js";
import { performTensorFlowInference } from "../utils/tensorflowUtils.js";

// Generic capture hook that can be extended for different input types (drawing, face, etc.)
export const useGenericCapture = (
  verificationType,
  trainedModel = null,
  modelScaler = null,
  labelMapping = null,
  isInferenceMode = false,
  onInferenceResult = null
) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasCaptured, setHasCaptured] = useState(false);
  const canvasRef = useRef(null);
  const lastPoint = useRef(null);

  const webcamRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [landmarks, setLandmarks] = useState(null);

  const [isReady, setIsReady] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState(null);

  // Load face-api models using utility function
  useEffect(() => {
    const loadModels = async () => {
      if (verificationType === VERIFICATION_TYPES.FACE) {
        const loaded = await loadFaceApiModels();
        setIsReady(loaded);
      } else {
        setIsReady(true);
      }
    };
    loadModels();
  }, [verificationType]);

  // Cleanup webcam on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && verificationType === VERIFICATION_TYPES.SIGNATURE) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [canvasRef.current, verificationType]);

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const drawPoint = (ctx, x, y) => {
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const startCapturing = (e) => {
    if (verificationType === VERIFICATION_TYPES.SIGNATURE) {
      setIsCapturing(true);
      setHasCaptured(true);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const { x, y } = getCanvasCoordinates(e);
        if (ctx) {
          ctx.strokeStyle = "#ffffff";
          ctx.fillStyle = "#ffffff";
          ctx.lineWidth = 4;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          drawPoint(ctx, x, y);
          lastPoint.current = { x, y };
        }
      }
    } else if (verificationType === VERIFICATION_TYPES.FACE) {
      startWebcam();
    }
  };

  const capture = (e) => {
    if (verificationType === VERIFICATION_TYPES.FACE) {
      return captureAndDetectLandmarks();
    }

    if (!isCapturing || verificationType !== VERIFICATION_TYPES.SIGNATURE)
      return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      const { x, y } = getCanvasCoordinates(e);
      if (ctx && lastPoint.current) {
        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        drawPoint(ctx, x, y);
        lastPoint.current = { x, y };
      }
    }
  };

  const stopCapturing = () => {
    setIsCapturing(false);
    lastPoint.current = null;
  };

  const clearCapture = () => {
    if (verificationType === VERIFICATION_TYPES.FACE) {
      setCapturedImage(null);
      setLandmarks(null);
    } else {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }

    setHasCaptured(false);
    setFaceDescriptor(null);
  };

  const getCapture = async () => {
    if (verificationType === VERIFICATION_TYPES.FACE) {
      // For face verification, return the full webcam image as a 2D array
      if (capturedImage) {
        const image = new Image();
        image.src = capturedImage;

        return new Promise((resolve) => {
          image.onload = async () => {
            console.log(
              "Processing face image:",
              image.width,
              "x",
              image.height
            );

            // Convert the full webcam image to a 2D array
            const canvas = document.createElement("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(image, 0, 0);

            const imageData = ctx.getImageData(0, 0, image.width, image.height);
            const data = imageData.data;

            // Create a 2D array with the full image dimensions
            // Store RGB values as objects to preserve color information
            const fullImageArray = Array.from({ length: image.height }, () =>
              Array.from({ length: image.width }, () => ({
                r: 0,
                g: 0,
                b: 0,
              }))
            );

            // Populate the 2D array with RGB values
            for (let y = 0; y < image.height; y++) {
              for (let x = 0; x < image.width; x++) {
                const idx = (y * image.width + x) * 4;
                fullImageArray[y][x] = {
                  r: data[idx],
                  g: data[idx + 1],
                  b: data[idx + 2],
                };
              }
            }

            // Debug: Check if we have color data
            const samplePixel =
              fullImageArray[Math.floor(image.height / 2)][
                Math.floor(image.width / 2)
              ];
            console.log("Sample pixel RGB values:", samplePixel);
            console.log(
              "Image array dimensions:",
              fullImageArray.length,
              "x",
              fullImageArray[0].length
            );

            resolve(fullImageArray);
          };
        });
      }
      return null;
    }

    const canvas = canvasRef.current;
    if (!canvas) return null;

    const imageURI = canvas.toDataURL("image/png");
    const image = new Image();
    image.src = imageURI;

    return new Promise((resolve) => {
      image.onload = async () => {
        const grayscaleData = await processImage(image);
        resolve(grayscaleData);
      };
    });
  };

  // Start webcam
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30 },
        },
      });
      if (webcamRef.current) {
        webcamRef.current.srcObject = stream;
        setIsCapturing(true);
      }
    } catch (error) {
      console.error("Error accessing webcam:", error);
    }
  };

  // Stop webcam
  const stopWebcam = () => {
    if (webcamRef.current && webcamRef.current.srcObject) {
      const tracks = webcamRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      webcamRef.current.srcObject = null;
      setIsCapturing(false);
    }
  };

  const captureAndDetectLandmarks = async (returnLandmarks = false) => {
    if (!webcamRef.current || !isReady) {
      console.error("Webcam or models not ready");
      return;
    }

    console.log(
      "Webcam dimensions:",
      webcamRef.current.videoWidth,
      "x",
      webcamRef.current.videoHeight
    );

    // STEP 1: Capture the current frame
    const canvas = document.createElement("canvas");
    canvas.width = webcamRef.current.videoWidth;
    canvas.height = webcamRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(webcamRef.current, 0, 0);

    try {
      console.log("Detecting face landmarks from captured frame...");

      // STEP 3: Use enhanced utility for face detection
      const faceResult = await detectFaceWithDescriptor(canvas, {
        inputSize: DETECTOR_INPUT_SIZE,
        scoreThreshold: 0.25,
      });

      if (faceResult.success) {
        console.log("68 Point Landmarks:", faceResult.landmarks);
        console.log("Face Descriptor (128D):", faceResult.descriptor);

        setLandmarks(faceResult.landmarks);
        // ✅ Store the face descriptor for reuse
        setFaceDescriptor(faceResult.descriptor);

        console.log("✅ Face descriptor stored for reuse");

        // TensorFlow inference using the stored descriptor
        if (isInferenceMode && trainedModel && modelScaler && labelMapping) {
          try {
            console.log("Starting TensorFlow model inference...");

            // ✅ Use enhanced utility for PCA transformation
            const faceProcessResult = await processFaceImageToPCAVector(canvas);

            if (
              faceProcessResult.success &&
              faceProcessResult.pcaVector?.length === 32
            ) {
              console.log(
                "PCA vector extracted:",
                faceProcessResult.pcaVector.length,
                "dimensions"
              );
              console.log("✅ TensorFlow using stored face descriptor");

              const classificationResult = await performTensorFlowInference(
                faceProcessResult.pcaVector,
                trainedModel,
                modelScaler,
                labelMapping,
                true // Enable first neuron logging
              );
              console.log(
                "TensorFlow classification result:",
                classificationResult
              );
              
              // Call the callback with confidence data if provided
              if (onInferenceResult && classificationResult) {
                onInferenceResult(classificationResult);
              }
            } else {
              console.error("Failed to extract PCA vector from face");
            }
          } catch (tfError) {
            console.error("Error during TensorFlow inference:", tfError);
          }
        }
      } else {
        console.log("No face detected");
        setFaceDescriptor(null); // Clear if no face
        if (!returnLandmarks) {
          //alert("No face detected. Please ensure your face is visible in the webcam.");
        }
        //return null;
      }
    } catch (error) {
      console.error("Error detecting landmarks:", error);
      return null;
    }

    // STEP 2: Store the captured image
    const imageDataUrl = canvas.toDataURL("image/png");
    setCapturedImage(imageDataUrl);
    setHasCaptured(true);
  };

  // Simplified using enhanced utilities
  const extractLandmarksFromImageData = async (imageData) => {
    if (!isReady) {
      console.error("Face-api models not ready");
      return null;
    }

    try {
      // Use enhanced utility to create canvas from RGB array
      const canvas = createCanvasFromRGBArray(imageData);

      // Use enhanced utility for face detection
      const faceResult = await detectFaceWithDescriptor(canvas, {
        inputSize: DETECTOR_INPUT_SIZE,
        scoreThreshold: 0.25,
      });

      if (faceResult.success) {
        console.log(
          "Extracted landmarks from image data:",
          faceResult.landmarks.length,
          "points"
        );

        // Flatten landmarks to 1D array [x1, y1, x2, y2, ...]
        const flattenedLandmarks = [];
        for (const point of faceResult.landmarks) {
          flattenedLandmarks.push(point.x, point.y);
        }

        return flattenedLandmarks;
      } else {
        console.log("No face detected in image data");
        return null;
      }
    } catch (error) {
      console.error("Error extracting landmarks from image data:", error);
      return null;
    }
  };

  return {
    captureRef:
      verificationType === VERIFICATION_TYPES.FACE ? webcamRef : canvasRef,
    isCapturing,
    hasCaptured,
    isReady,
    startCapturing,
    capture,
    stopCapturing,
    clearCapture,
    getCapture,
    capturedImage,
    landmarks,
    faceDescriptor,
    extractLandmarksFromImageData,
  };
};
