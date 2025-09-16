"use client";

import { useState, useRef, useEffect } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScreenLayout, ActionButton } from "./signature/sig-components";

const PassportCapture = ({
  captureRef,
  onStartCapture,
  hasCaptured,
  isCapturing,
  isReady,
  capturedImage,
  onTakePicture,
  onTryAgain,
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
            <img
              src={capturedImage}
              alt="Captured passport"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
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
    </div>
  );
};

export default function PassportVerificationScreen({ onBack, onKycStart }) {
  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasCaptured, setHasCaptured] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const captureRef = useRef(null);
  const fileInputRef = useRef(null);

  const startCapturing = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      captureRef.current.srcObject = stream;
      setIsCapturing(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const capture = () => {
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
    }
  };

  const clearCapture = () => {
    setCapturedImage(null);
    setHasCaptured(false);
    setIsCapturing(false);
    setIsReady(true); // This will trigger camera restart
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
      reader.onload = (e) => {
        setCapturedImage(e.target.result);
        setHasCaptured(true);
        setIsCapturing(false);
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
            disabled={!hasCaptured}
            variant="primary"
          >
            CONTINUE
          </ActionButton>
        </div>
      </div>
    </ScreenLayout>
  );
}