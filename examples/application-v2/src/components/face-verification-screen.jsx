"use client";

import { useEffect, useState } from "react";
import { ScreenLayout, ActionButton } from "./signature/sig-components";
import {
  useVerification,
  VERIFICATION_TYPES,
  VERIFICATION_STEPS,
} from "../hooks/useVerification.jsx";
import {
  VerificationCompleteScreen,
  ProofDetailsScreen,
  CreatingAuthorizationScreen,
  GeneratingProofScreen,
  WaitingForWalletScreen,
  SearchingNetworkScreen,
  ProofGeneratedScreen,
  RegisteringAddressScreen,
  SamplePreview,
  ButtonContainer,
  SamplesPreview,
} from "./verification/verification-components";
import TrainingScreen from "./verification/training-screen.jsx";

// Face capture component
const FaceCapture = ({
  captureRef,
  onStartCapture,
  hasCaptured,
  isCapturing,
  isReady,
  capturedImage,
  onTakePicture,
  onTryAgain,
  mlpPrediction,
}) => {
  useEffect(() => {
    if (isReady) {
      onStartCapture();
    }
  }, [isReady, onStartCapture]);

  return (
    <div className="mb-4 flex w-full max-w-md flex-1 flex-col items-center justify-between rounded-lg">
      <div
        className="relative mx-auto flex w-[220px] flex-1 items-center justify-center sm:w-[290px] sm:p-0"
        style={{ aspectRatio: "4/5" }}
      >
        <div
          className="flex h-[318px] items-center justify-center bg-white sm:h-[420px]"
          style={{
            borderRadius: "50% 50% 50% 50% / 40% 40% 60% 60%",
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

          {hasCaptured && capturedImage && (
            <img
              src={capturedImage}
              alt="Captured face"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          )}
        </div>
        {!isCapturing && !hasCaptured && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-[#111419]/80">
            <span className="text-lg text-white">Grant Camera Access</span>
          </div>
        )}
      </div>
      <div className="mt-2 text-center sm:mt-4">
        <p className="min-h-5 text-sm text-white">
          {hasCaptured && mlpPrediction ? mlpPrediction : ""}
        </p>
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

// Main Component
export default function FaceVerificationScreen({ onBack, onSuccess, importedModelData, capturedPassportImage }) {
  const {
    currentStep,
    samples: faces,
    proofSample: proofFace,
    proofProgress,
    matchPercentage,
    proofText,
    captureRef,
    hasCaptured,
    expectedRuntime,
    chartDataProof,
    isReady,
    isCapturing,
    capturedImage,
    currentEpoch,
    faceDescriptor,
    mlpPrediction,
    isTooSimilar,
    trainedModel,
    modelScaler,
    labelMapping,
    resetVerification,
    restartInference,
    startCapturing,
    capture,

    clearCapture: clearFace,
    handleContinue,
    handleConfirm,
    handleContinueToProof,
    getProgressDots,
    setCurrentStep,
    generateProof,
    stepConfig,
    downloadTrainedModel,
    onStepBack,
    retryProofCreation,
    provingError,
    retryProvingRequest,
    switchToLocalProving,
    computedHash,
    networkSearchAttempt,
  } = useVerification(VERIFICATION_TYPES.FACE, importedModelData, capturedPassportImage);

  // State for model hash from TrainingScreen
  const [modelHash, setModelHash] = useState(null);

  // Handle model hash computed from TrainingScreen
  const handleModelHashComputed = (hash) => {
    console.log("📊 Model hash received from TrainingScreen:", hash);
    setModelHash(hash);
  };

  const handleTakePicture = () => {
    console.log("User clicked: TAKE PICTURE (after collecting face sample)");
    return capture();
  };

  const handleTryAgain = () => {
    clearFace();
  };


  // Render different screens based on currentStep
  if (currentStep === VERIFICATION_STEPS.VERIFICATION_COMPLETE) {
    return (
      <VerificationCompleteScreen
        onBack={onStepBack}
        onGoHome={() => {
          // Pass trained model data back to main screen
          const modelData = {
            model: trainedModel,
            scaler: modelScaler,
            labelMapping: labelMapping,
            success: true
          };
          onSuccess && onSuccess(modelData);
        }}
        onRetry={retryProofCreation}
        chartDataProof={chartDataProof}
        verificationType={VERIFICATION_TYPES.FACE}
        onRestart={restartInference}
        proofSample={proofFace}
      />
    );
  }

  if (currentStep === VERIFICATION_STEPS.PROOF_DETAILS) {
    return (
      <ProofDetailsScreen
        onBack={onStepBack}
        matchPercentage={matchPercentage}
        onDone={() => setCurrentStep(VERIFICATION_STEPS.VERIFICATION_COMPLETE)}
        onRetry={retryProofCreation}
        proofText={proofText}
        chartDataProof={chartDataProof}
        proofSample={proofFace}
        verificationType={VERIFICATION_TYPES.FACE}
      />
    );
  }

  if (currentStep === VERIFICATION_STEPS.PROOF_GENERATED) {
    return (
      <ProofGeneratedScreen
        onBack={onStepBack}
        matchPercentage={matchPercentage}
        setCurrentStep={setCurrentStep}
        verificationType={VERIFICATION_TYPES.FACE}
        chartDataProof={chartDataProof}
      />
    );
  }

  if (currentStep === VERIFICATION_STEPS.CREATING_AUTHORIZATION) {
    return (
      <CreatingAuthorizationScreen
        verificationType={VERIFICATION_TYPES.FACE}
      />
    );
  }

  if (currentStep === VERIFICATION_STEPS.WAITING_FOR_WALLET) {
    return (
      <WaitingForWalletScreen
        verificationType={VERIFICATION_TYPES.FACE}
        provingError={provingError}
        onRetryProving={retryProvingRequest}
        onBack={onStepBack}
        onBackToProof={() => setCurrentStep(VERIFICATION_STEPS.CREATE_PROOF)}
      />
    );
  }

  if (currentStep === VERIFICATION_STEPS.SEARCHING_NETWORK) {
    return (
      <SearchingNetworkScreen
        verificationType={VERIFICATION_TYPES.FACE}
        networkSearchAttempt={networkSearchAttempt}
        onBack={onStepBack}
      />
    );
  }

  if (currentStep === VERIFICATION_STEPS.GENERATING_PROOF) {
    return (
      <GeneratingProofScreen
        proofProgress={proofProgress}
        matchPercentage={matchPercentage}
        expectedRuntime={expectedRuntime}
        verificationType={VERIFICATION_TYPES.FACE}
        provingError={provingError}
        onRetryProving={retryProvingRequest}
        onSwitchToLocal={switchToLocalProving}
      />
    );
  }

  if (currentStep === VERIFICATION_STEPS.CREATE_PROOF) {
    return (
      <ScreenLayout
        onBack={() => {
          if (importedModelData && importedModelData.success) {
            // If we came from imported model, go back to main screen
            onBack();
          } else {
            // Otherwise, use normal step back navigation
            onStepBack();
          }
        }}
        title={stepConfig.titles[currentStep]}
        description={stepConfig.descriptions[currentStep]}
        tooltipText="Image only used for local feature extraction"
        progressDots={
          <div className="flex justify-center space-x-2">
            <div className="h-1 w-16 rounded-full bg-white" />
            <div className="h-1 w-16 rounded-full bg-gray-600" />
          </div>
        }
      >
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="h-12"></div>
          <FaceCapture
            captureRef={captureRef}
            onStartCapture={startCapturing}
            hasCaptured={hasCaptured}
            isReady={isReady}
            isCapturing={isCapturing}
            capturedImage={capturedImage}
            onTakePicture={handleTakePicture}
            onTryAgain={handleTryAgain}
            mlpPrediction={
              capturedImage
                ? (!faceDescriptor
                    ? "No face detected. Please try again"
                    : mlpPrediction || "")
                : ""
            }

          />

          <ButtonContainer>
            <ActionButton
              onClick={generateProof}
              disabled={
                !hasCaptured ||
                (hasCaptured && (!faceDescriptor || isTooSimilar))
              }
              variant="primary"
            >
              GENERATE PROOF
            </ActionButton>
          </ButtonContainer>
        </div>
      </ScreenLayout>
    );
  }


  if (currentStep === VERIFICATION_STEPS.REGISTERING_ADDRESS) {
    return (
      <RegisteringAddressScreen
        onBack={onStepBack}
        verificationType={VERIFICATION_TYPES.FACE}
        onSuccess={() => {
          console.log('Address registration successful - redirecting to home');
          // Pass trained model data back to main screen
          const modelData = {
            model: trainedModel,
            scaler: modelScaler,
            labelMapping: labelMapping,
            success: true
          };
          onSuccess && onSuccess(modelData);
        }}
        onError={(error) => {
          console.error('Address registration failed:', error);
          // Stay on the same step to show error
        }}
        computedHash={modelHash || computedHash}
      />
    );
  }

  if (currentStep === VERIFICATION_STEPS.COMPLETE) {
    return (
      <TrainingScreen
        onDownloadModel={downloadTrainedModel}
        currentEpoch={currentEpoch}
        onContinue={handleContinueToProof}
        faces={faces}
        verificationType={VERIFICATION_TYPES.FACE}
        trainedModel={trainedModel}
        modelScaler={modelScaler}
        capturedImage={capturedImage}
        faceDescriptor={faceDescriptor}
        onModelHashComputed={handleModelHashComputed}
      />
    );
  }

  if (currentStep === VERIFICATION_STEPS.VERIFYING) {
    return (
      <TrainingScreen
        currentEpoch={currentEpoch}
        totalEpochs={100}
        verificationType={VERIFICATION_TYPES.FACE}
        isTraining={true}
        faces={faces}
      />
    );
  }

  if (currentStep === VERIFICATION_STEPS.CONFIRM) {
    return (
      <ScreenLayout
        onBack={onStepBack}
        title={stepConfig.titles[currentStep]}
        description={stepConfig.descriptions[currentStep]}
        progressDots={getProgressDots()}
      >
        <div className="flex flex-1 flex-col items-center justify-between px-6">
          <div className="mb-8 flex w-full max-w-md flex-1 flex-col items-center justify-center rounded-lg p-6">
            <div className="mb-4 flex justify-center space-x-6">
              {capturedPassportImage && (
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg">
                  <img
                    src={capturedPassportImage}
                    alt="Passport (Sample 1)"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              {faces.slice(1).map((face, index) => (
                <div
                  key={index + 1}
                  className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full"
                >
                  <SamplePreview
                    sampleData={face}
                    size={80}
                    className="h-full w-full"
                    verificationType={VERIFICATION_TYPES.FACE}
                  />
                </div>
              ))}
            </div>
            {capturedPassportImage && (
              <div className="text-xs text-gray-400 text-center">
                1 passport photo (sample 1) + 2 face photos (samples 2&3)
              </div>
            )}
          </div>

          <ButtonContainer>
            <ActionButton onClick={handleConfirm} variant="primary">
              CONFIRM
            </ActionButton>
          </ButtonContainer>
        </div>
      </ScreenLayout>
    );
  }

  // Default screen (initial, repeat1, repeat2)
  return (
    <ScreenLayout
      onBack={() => {
        if (currentStep === VERIFICATION_STEPS.INITIAL) {
          onBack();
        } else if (currentStep === VERIFICATION_STEPS.CREATE_PROOF && importedModelData && importedModelData.success) {
          // If we're on CREATE_PROOF step and came from imported model, go back to main screen
          onBack();
        } else {
          onStepBack();
        }
      }}
      title={stepConfig.titles[currentStep]}
      description={stepConfig.descriptions[currentStep]}
      progressDots={getProgressDots()}
      tooltipText="Image used only for local training and deleted after training"
    >
      <div className="min-h-10 sm:min-h-12">
        {(currentStep === VERIFICATION_STEPS.REPEAT1 ||
          currentStep === VERIFICATION_STEPS.REPEAT2) && (
          <SamplesPreview
            samples={faces}
            verificationType={VERIFICATION_TYPES.FACE}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-between px-6">
        <div className="flex flex-1 flex-col items-center justify-start">
          <div className="mt-2 hidden h-14 sm:block"></div>
          <FaceCapture
            captureRef={captureRef}
            onStartCapture={startCapturing}
            hasCaptured={hasCaptured}
            isReady={isReady}
            isCapturing={isCapturing}
            capturedImage={capturedImage}
            onTakePicture={handleTakePicture}
            onTryAgain={handleTryAgain}
            mlpPrediction={
              capturedImage
                ? (!faceDescriptor
                    ? "No face detected. Please try again"
                    : (mlpPrediction || ""))
                : ""
            }

          />
        </div>

        <ActionButton
          onClick={handleContinue}
          disabled={!hasCaptured || (hasCaptured && (!faceDescriptor || isTooSimilar))}
          variant="primary"
          className="mb-5 sm:mb-15"
        >
          CONTINUE
        </ActionButton>
      </div>
    </ScreenLayout>
  );
}
