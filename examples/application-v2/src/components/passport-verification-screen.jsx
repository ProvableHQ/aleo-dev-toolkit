"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScreenLayout, ActionButton } from "./signature/sig-components";
import { detectFaceWithDescriptor, loadFaceApiModels } from "@/utils/faceUtils";

const PassportCapture = ({
  captureRef,
  onStartCapture,
  hasCaptured,
  isCapturing,
  isReady,
  capturedImage,
  onTakePicture,
  onTryAgain,
  isValidatingFace,
  faceValidationError,
  hasValidFace,
}) => {
  useEffect(() => {
    if (isReady) {
      onStartCapture();
    }
  }, [isReady, onStartCapture]);

  return (
    <div className="mb-4 flex w-full max-w-md flex-1 flex-col items-center justify-between rounded-lg">
      <div className="relative mx-auto flex w-full max-w-sm flex-1 items-center justify-center p-4">
        <div
          className="flex h-64 w-full items-center justify-center bg-white rounded-lg"
          style={{
            overflow: "hidden",
            boxShadow: "0 0 0 8px #111419",
            position: "relative",
          }}
        >
          <video
            ref={captureRef}
            autoPlay
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: isCapturing && !hasCaptured ? "block" : "none",
              background: "#222",
            }}
          />

          {/* Passport overlay - only show during capture */}
          {isCapturing && !hasCaptured && (
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-4">
              {/* Passport document outline */}
              <div className="absolute inset-4 border-2 border-white/30 rounded-sm"></div>

              {/* MRZ (Machine Readable Zone) lines at bottom */}
              <div className="bg-black/20 p-2 text-white font-mono text-xs leading-tight">
                <div className="flex justify-center mb-1">
                  <span className="text-white/60 text-[10px]">↓ ALIGN PASSPORT HERE ↓</span>
                </div>
                <div className="border-t border-white/30 pt-2 space-y-1">
                  <div className="tracking-wider">P&lt;USADOE&lt;&lt;JOHN&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
                  <div className="tracking-wider">1234567890USA9001011M2501017&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;04</div>
                </div>
              </div>
            </div>
          )}

          {hasCaptured && capturedImage && (
            <div className="relative w-full h-full">
              <img
                src={capturedImage}
                alt="Captured passport"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
              {/* Validation status overlay */}
              {isValidatingFace && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    <div className="text-sm">Validating face...</div>
                  </div>
                </div>
              )}
              {!isValidatingFace && hasValidFace && (
                <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                  ✓ Face detected
                </div>
              )}
              {!isValidatingFace && faceValidationError && (
                <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
                  ✗ No face
                </div>
              )}
            </div>
          )}

          {!isCapturing && !hasCaptured && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-[#111419]/80">
              <span className="text-lg text-white">Grant Camera Access</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 flex justify-center gap-4 text-center sm:mt-6">
        {!hasCaptured && isCapturing && (
          <ActionButton onClick={onTakePicture} showLoaderOnClick>
            TAKE PICTURE
          </ActionButton>
        )}
        {hasCaptured && (
          <ActionButton
            onClick={onTryAgain}
            variant="outline"
            className="bg-[#292c30] text-white hover:bg-gray-800 hover:text-white"
          >
            Clear
          </ActionButton>
        )}
      </div>

      {/* Face validation error message */}
      {faceValidationError && (
        <div className="mt-4 mx-auto max-w-md">
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-400">{faceValidationError}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default function PassportVerificationScreen({ onBack, onKycStart }) {
  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasCaptured, setHasCaptured] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isValidatingFace, setIsValidatingFace] = useState(false);
  const [faceValidationError, setFaceValidationError] = useState(null);
  const [hasValidFace, setHasValidFace] = useState(false);
  const captureRef = useRef(null);
  const fileInputRef = useRef(null);

  // Face validation function
  const validateFaceInImage = async (imageDataUrl) => {
    setIsValidatingFace(true);
    setFaceValidationError(null);
    setHasValidFace(false);

    try {
      // Ensure face API models are loaded
      await loadFaceApiModels();

      // Create an image element from the data URL
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageDataUrl;
      });

      // Create a canvas from the image
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Detect face in the image
      const faceResult = await detectFaceWithDescriptor(canvas);
      
      if (faceResult.success) {
        setHasValidFace(true);
        setFaceValidationError(null);
        console.log("Face detected successfully in passport image");
      } else {
        setHasValidFace(false);
        setFaceValidationError("No face detected in the passport image. Please ensure the passport photo is clearly visible and try again.");
        console.log("Face detection failed:", faceResult.error);
      }
    } catch (error) {
      setHasValidFace(false);
      setFaceValidationError("Error processing the image. Please try again.");
      console.error("Face validation error:", error);
    } finally {
      setIsValidatingFace(false);
    }
  };

  const startCapturing = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      captureRef.current.srcObject = stream;
      setIsCapturing(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const capture = async () => {
    if (captureRef.current) {
      const canvas = document.createElement("canvas");
      const video = captureRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);
      
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.8);
      setCapturedImage(imageDataUrl);
      setHasCaptured(true);

      // Stop the camera stream
      const stream = video.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Validate face in the captured image
      await validateFaceInImage(imageDataUrl);
    }
  };

  const clearCapture = () => {
    setCapturedImage(null);
    setHasCaptured(false);
    setIsCapturing(false);
    setIsReady(true); // This will trigger camera restart
    setFaceValidationError(null);
    setHasValidFace(false);
    setIsValidatingFace(false);
  };

  const handleTakePicture = () => {
    console.log("User clicked: TAKE PICTURE (passport capture)");
    return capture();
  };

  const handleTryAgain = () => {
    clearCapture();
  };

  // File upload handlers
  const handleFileSelect = async (file) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageDataUrl = e.target.result;
        setCapturedImage(imageDataUrl);
        setHasCaptured(true);
        setIsCapturing(false);
        
        // Validate face in the uploaded image
        await validateFaceInImage(imageDataUrl);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert(`Error reading file: ${error.message}`);
    }
  };

  const handleFileInputChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        handleFileSelect(file);
      } else {
        alert("Please select a valid image file");
      }
    }
  };

  const handleUploadAreaClick = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    setIsReady(true);
  }, []);

  return (
    <ScreenLayout
      onBack={onBack}
      title="Passport Verification"
      description="Take a photo of your passport or upload an existing image"
      tooltipText="Image only used for verification purposes"
      progressDots={
        <div className="flex justify-center space-x-2">
          <div className="h-1 w-16 rounded-full bg-white" />
        </div>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="h-12"></div>
        
        <PassportCapture
          captureRef={captureRef}
          onStartCapture={startCapturing}
          hasCaptured={hasCaptured}
          isReady={isReady}
          isCapturing={isCapturing}
          capturedImage={capturedImage}
          onTakePicture={handleTakePicture}
          onTryAgain={handleTryAgain}
          isValidatingFace={isValidatingFace}
          faceValidationError={faceValidationError}
          hasValidFace={hasValidFace}
        />

        {/* Drag & Drop Upload Area */}
        <div
          className={`mx-auto mt-6 w-full max-w-md cursor-pointer rounded-lg border-2 border-dashed p-4 transition-colors ${
            isDragOver
              ? "bg-opacity-10 border-blue-400 bg-blue-50"
              : "border-opacity-50 border-gray-600 hover:border-gray-500"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleUploadAreaClick}
        >
          <div className="flex flex-col items-center justify-center space-y-2">
            <Upload className="h-8 w-8 text-gray-400" />
            <p className="text-xs text-gray-400 uppercase">
              {isDragOver
                ? "Drop your passport image here"
                : "Or upload passport image"}
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="mt-8">
          <ActionButton
            onClick={async () => {
              console.log("Continue with passport verification - uploading to Sumsub");
              if (capturedImage && onKycStart) {
                // You could upload directly here:
                // await uploadToSumsub(capturedImage);
                onKycStart(capturedImage); // Pass the captured image
              }
            }}
            disabled={!hasCaptured || !hasValidFace || isValidatingFace}
            variant="primary"
          >
            {isValidatingFace ? "VALIDATING..." : "CONTINUE"}
          </ActionButton>
        </div>
      </div>
    </ScreenLayout>
  );
}