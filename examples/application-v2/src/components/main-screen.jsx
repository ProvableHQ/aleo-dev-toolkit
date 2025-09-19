"use client";

import { Smile, Target, X, Square, Lock, Settings, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import aleoLogo from "../assets/aleo-provable.svg";
import kyaLogo from "../assets/kya.svg";
import faceLogo from "../assets/face.svg";
import { importIdentityParameters, computeModelHashFromImportedData } from "../utils/exportUtils.js";
import { useState, useRef, useEffect } from "react";
import WalletConnector from "./WalletConnector.jsx";
import { runAleoHashPerformanceTest } from "../utils/aleoHashTest.js";

export default function MainScreen({
  onVerificationChoice,
  onOptionsClick,
  onModelImport,
  trainedModelData,
  onGoToInference,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isWalletReady, setIsWalletReady] = useState(false);
  const [walletData, setWalletData] = useState(null);
  const fileInputRef = useRef(null);

  // Determine UI state based on wallet and model data
  const isAddressWhitelisted = walletData?.isWhitelisted === true;
  const isModelHashRegistered = walletData?.registeredHash !== null && walletData?.registeredHash !== undefined;
  const hasTrainedModelInMemory = trainedModelData && trainedModelData.success;
  const shouldShowDragAndDrop = isAddressWhitelisted && isModelHashRegistered && !hasTrainedModelInMemory;
  const shouldShowModelLoaded = hasTrainedModelInMemory && isAddressWhitelisted && isModelHashRegistered;

  // Listen for wallet ready event
  useEffect(() => {
    const handleWalletReady = (event) => {
      const { address, isWhitelisted, registeredHash, mappingKey } = event.detail;
      setWalletData({ address, isWhitelisted, registeredHash, mappingKey });
      setIsWalletReady(true);
    };

    window.addEventListener('walletReady', handleWalletReady);
    return () => window.removeEventListener('walletReady', handleWalletReady);
  }, []);

  const handleFileSelect = async (file) => {
    try {
      // First, import the model data to get the JSON structure
      const importResult = await importIdentityParameters(file);
      if (!importResult.success) {
        alert(`Failed to import model: ${importResult.error}`);
        return;
      }

      // Parse the file again to get the raw JSON data for hash computation
      const text = await file.text();
      const identityData = JSON.parse(text);

      // Compute the model hash from the imported data
      console.log("🔍 Validating model hash...");
      const hashResult = await computeModelHashFromImportedData(identityData);
      
      if (!hashResult.success) {
        alert(`Failed to compute model hash: ${hashResult.error}`);
        return;
      }

      const computedHash = hashResult.modelHash;
      const registeredHash = walletData?.registeredHash;
      
      console.log("📊 Computed hash from opened model:", computedHash);
      console.log("📊 Registered hash from wallet:", registeredHash);

      // Validate the hash matches the registered hash
      if (registeredHash && computedHash !== registeredHash) {
        alert(`Model hash mismatch!\n\nOpened model hash: ${computedHash}\nExpected hash: ${registeredHash}\n\nPlease upload the correct model file.`);
        return;
      }

      // If we get here, the hash is valid (or no registered hash to compare against)
      console.log("✅ Model hash validation passed");
      onModelImport(importResult);
      
    } catch (error) {
      alert(`Error importing model: ${error.message}`);
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
      if (file.type === "application/json" || file.name.endsWith(".json")) {
        handleFileSelect(file);
      } else {
        alert("Please select a valid JSON model file");
      }
    }
  };

  const handleUploadAreaClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <div className="bg-constellation flex h-dvh flex-col text-white">
        {/* Header with controls */}
        <div className="flex w-full items-start justify-between p-6 md:mx-auto md:max-w-4xl">
          <div className="text-left text-[14px] text-gray-600">
            <p>BROUGHT TO YOU BY:</p>
            <p className="text-gray-500">ALEO & PROVABLE</p>
          </div>
          <div className="flex space-x-2">
            <img src={aleoLogo} alt="Aleo Logo" className="h-12 w-26" />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col items-center justify-center gap-10 sm:gap-2">
          <div className="flex flex-1 flex-col justify-end px-6 sm:justify-center">
            <div className="mx-auto text-center">
              {/* zPass Logo */}
              <div className="mb-5">
                <h1 className="text-5xl font-bold tracking-wider md:text-7xl">
                  <img
                    src={kyaLogo}
                    alt="KYC Logo"
                    className="mx-auto h-10 w-40"
                  />
                </h1>
              </div>

              <span className="text-[16px] uppercase">zPass</span>

              {/* Description */}
              <div className="mt-4 mb-8">
                <p className="gradient-white text-sm leading-relaxed text-gray-300">
                  A DEMO OF ALEO ZKML VERIFICATION.
                </p>
                <p className="gradient-white text-sm leading-relaxed text-gray-300">
                  TRAIN A MODEL • CREATE & VERIFY A PROOF
                </p>
              </div>

              {/* Wallet Connector */}
              <WalletConnector />

              {/* Verification Buttons */}
              <div className="mx-auto mb-8 w-full space-y-4">
                {/* Show whitelist status if available */}
                {walletData && walletData.isWhitelisted !== null && (
                  <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
                    <div className="text-sm text-gray-300">
                      {walletData.isWhitelisted ? (
                        <span className="text-green-400">✓ Address whitelisted</span>
                      ) : (
                        <span className="text-red-400">✗ Address not whitelisted</span>
                      )}
                    </div>
                    {walletData.registeredHash && (
                      <div className="text-sm text-gray-300 mt-1">
                        <span className="text-blue-400">Registered hash: {walletData.registeredHash}</span>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  onClick={() => {
                    console.log("User clicked: START WITH PASSPORT VERIFICATION");
                    onVerificationChoice("passport");
                  }}
                  disabled={!isWalletReady || (isAddressWhitelisted && isModelHashRegistered)}
                  className={`flex h-[42px] w-[353px] items-center justify-between rounded-full px-4 text-sm font-medium transition-all ${
                    isWalletReady && !(isAddressWhitelisted && isModelHashRegistered)
                      ? "cursor-pointer bg-gray-200 text-gray-900 hover:bg-gray-300" 
                      : "cursor-not-allowed bg-gray-500 text-gray-600 opacity-50"
                  }`}
                >
                  <div className="flex w-full items-center">
                    <img src={faceLogo} alt="Face Logo" className="h-5 w-5" />
                    <span className="w-full">START WITH PASSPORT VERIFICATION</span>
                  </div>
                  <span className={isWalletReady && !(isAddressWhitelisted && isModelHashRegistered) ? "text-gray-400" : "text-gray-500"}>›</span>
                </Button>

              </div>

              {/* Conditional UI based on wallet and model state */}
              {shouldShowModelLoaded ? (
                <>
                  {/* Model Loaded Message */}
                  <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                    <div className="text-center">
                      <div className="text-green-400 text-sm font-medium mb-2">
                        ✓ Model Loaded
                      </div>
                      <div className="text-gray-300 text-xs">
                        Your trained model is ready for inference
                      </div>
                    </div>
                  </div>

                  {/* Go to Inference Button */}
                  <Button
                    onClick={onGoToInference}
                    className="flex h-[42px] w-[353px] items-center justify-center rounded-full px-4 text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-all"
                  >
                    <div className="flex w-full items-center justify-center">
                      <img src={faceLogo} alt="Face Logo" className="h-5 w-5 mr-2" />
                      <span>GO TO INFERENCE</span>
                    </div>
                  </Button>
                </>
              ) : shouldShowDragAndDrop ? (
                <>
                  <span className="mb-4 text-sm text-gray-400">OR</span>

                  {/* Drag & Drop Area */}
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
                    <p className="text-xs text-gray-400 uppercase">
                      {isDragOver
                        ? "Drop your model file here"
                        : "Open a trained model"}
                    </p>
                  </div>
                </>
              ) : null}

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          </div>
          {/* Test Buttons - Fixed at bottom center */}
          <div className="pb-5 sm:pb-15 flex flex-col items-center space-y-3">
            <Button
              onClick={() => {
                console.log("🧪 Manual Aleo SDK test triggered");
                runAleoHashPerformanceTest().catch(error => {
                  console.error("Aleo SDK test failed:", error);
                });
              }}
              size="sm"
              className="h-8 px-4 rounded-full border border-blue-600 bg-blue-600 text-white shadow-lg hover:bg-blue-700 text-xs"
            >
              Test Aleo SDK
            </Button>
            <Button
              onClick={onOptionsClick}
              size="icon"
              className="h-12 w-12 rounded-full border border-gray-600 bg-[#282b2f] text-white shadow-lg hover:bg-zinc-700"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
