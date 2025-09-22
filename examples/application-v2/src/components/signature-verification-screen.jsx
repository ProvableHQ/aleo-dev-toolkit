import {
  ScreenLayout,
  SignatureCanvas,
  ActionButton,
} from "./signature/sig-components";
import {
  useVerification,
  VERIFICATION_TYPES,
  VERIFICATION_STEPS,
} from "../hooks/useVerification";
import {
  VerificationCompleteScreen,
  ProofDetailsScreen,
  CreatingAuthorizationScreen,
  GeneratingProofScreen,
  ProofGeneratedScreen,
  RegisteringAddressScreen,
  ButtonContainer,
  SamplePreview,
  SamplesPreview,
} from "./verification/verification-components";
import TrainingScreen from "./verification/training-screen.jsx";

// Main Component
export default function SignatureVerificationScreen({
  onBack,
  importedModelData,
}) {
  const {
    currentStep,
    samples: signatures,
    proofSample: proofSignature,
    proofProgress,
    matchPercentage,
    proofText,
    captureRef: canvasRef,
    hasCaptured,
    mlpPrediction,
    expectedRuntime,
    chartDataProof,
    startCapturing: startDrawing,
    capture: draw,
    stopCapturing: stopDrawing,
    clearCapture: clearSignature,
    currentEpoch,
    trainedModel,
    modelScaler,
    resetVerification,
    restartInference,
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
  } = useVerification(VERIFICATION_TYPES.SIGNATURE, importedModelData);

  // Render different screens based on currentStep
  if (currentStep === VERIFICATION_STEPS.VERIFICATION_COMPLETE) {
    return (
      <VerificationCompleteScreen
        onBack={onStepBack}
        onGoHome={onBack}
        onRestart={restartInference}
        onRetry={retryProofCreation}
        chartDataProof={chartDataProof}
        verificationType={VERIFICATION_TYPES.SIGNATURE}
        proofSample={proofSignature}
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
        proofSample={proofSignature}
        verificationType={VERIFICATION_TYPES.SIGNATURE}
      />
    );
  }

  if (currentStep === VERIFICATION_STEPS.PROOF_GENERATED) {
    return (
      <ProofGeneratedScreen
        onBack={() => setCurrentStep(VERIFICATION_STEPS.COMPLETE)}
        matchPercentage={matchPercentage}
        setCurrentStep={setCurrentStep}
        verificationType={VERIFICATION_TYPES.SIGNATURE}
        chartDataProof={chartDataProof}
      />
    );
  }

  if (currentStep === VERIFICATION_STEPS.CREATING_AUTHORIZATION) {
    return (
      <CreatingAuthorizationScreen
        verificationType={VERIFICATION_TYPES.SIGNATURE}
      />
    );
  }

  if (currentStep === VERIFICATION_STEPS.GENERATING_PROOF) {
    return (
      <GeneratingProofScreen
        proofProgress={proofProgress}
        matchPercentage={matchPercentage}
        expectedRuntime={expectedRuntime}
        verificationType={VERIFICATION_TYPES.SIGNATURE}
        provingError={provingError}
        onRetryProving={retryProvingRequest}
        onSwitchToLocal={switchToLocalProving}
      />
    );
  }

  if (currentStep === VERIFICATION_STEPS.REGISTERING_ADDRESS) {
    return (
      <RegisteringAddressScreen
        onBack={onStepBack}
        verificationType={VERIFICATION_TYPES.SIGNATURE}
        onSuccess={() => setCurrentStep(VERIFICATION_STEPS.CREATE_PROOF)}
        onError={(error) => {
          console.error('Address registration failed:', error);
          // Stay on the same step to show error
        }}
        computedHash={null}
      />
    );
  }

  if (currentStep === VERIFICATION_STEPS.CREATE_PROOF) {
    return (
      <ScreenLayout
        onBack={onStepBack}
        title={stepConfig.titles[currentStep]}
        description={stepConfig.descriptions[currentStep]}
        tooltipText="Signature only used for local feature extraction"
        progressDots={
          <div className="flex justify-center space-x-2">
            <div className="h-1 w-16 rounded-full bg-white" />
            <div className="h-1 w-16 rounded-full bg-gray-600" />
          </div>
        }
      >
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <SignatureCanvas
            canvasRef={canvasRef}
            onStartDrawing={startDrawing}
            onDraw={draw}
            onStopDrawing={stopDrawing}
            label="DRAW SIGNATURE ABOVE"
            hasDrawn={hasCaptured}
            onClear={clearSignature}
          />

          <div className="mb-4 text-center">
            <p className="min-h-5 text-sm text-white">
              {hasCaptured ? mlpPrediction : ""}
            </p>
          </div>
        </div>
        <ButtonContainer>
          <ActionButton
            onClick={generateProof}
            disabled={!hasCaptured}
            variant="primary"
          >
            GENERATE PROOF
          </ActionButton>
        </ButtonContainer>
      </ScreenLayout>
    );
  }

  if (currentStep === VERIFICATION_STEPS.COMPLETE) {
    return (
      <TrainingScreen
        onDownloadModel={downloadTrainedModel}
        currentEpoch={currentEpoch}
        onContinue={handleContinueToProof}
        signatures={signatures}
        verificationType={VERIFICATION_TYPES.SIGNATURE}
        trainedModel={trainedModel}
        modelScaler={modelScaler}
        capturedImage={null}
        faceDescriptor={null}
      />
    );
  }

  if (currentStep === VERIFICATION_STEPS.VERIFYING) {
    return (
      <TrainingScreen
        currentEpoch={currentEpoch}
        totalEpochs={100}
        verificationType={VERIFICATION_TYPES.SIGNATURE}
        isTraining={true}
        signatures={signatures}
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
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="mb-8 w-full max-w-md rounded-lg p-6">
            <div className="mb-4 flex justify-center space-x-6">
              {signatures.map((signature, index) => (
                <div
                  key={index}
                  className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full"
                >
                  <SamplePreview
                    sampleData={signature}
                    size={80}
                    verificationType={VERIFICATION_TYPES.SIGNATURE}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <ButtonContainer>
          <ActionButton onClick={handleConfirm} variant="primary">
            CONFIRM
          </ActionButton>
        </ButtonContainer>
      </ScreenLayout>
    );
  }

  // Default screen (initial, repeat1, repeat2)
  return (
    <ScreenLayout
      onBack={() => {
        if (currentStep === VERIFICATION_STEPS.INITIAL) {
          onBack();
        } else {
          onStepBack();
        }
      }}
      title={stepConfig.titles[currentStep]}
      description={stepConfig.descriptions[currentStep]}
      progressDots={getProgressDots()}
      tooltipText="Signature used only for local training and deleted after training"
    >
      <div className="min-h-10 sm:min-h-12">
        {(currentStep === VERIFICATION_STEPS.REPEAT1 ||
          currentStep === VERIFICATION_STEPS.REPEAT2) && (
          <SamplesPreview
            samples={signatures}
            verificationType={VERIFICATION_TYPES.SIGNATURE}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-between px-6 pt-2">
        <div className="flex w-full flex-1 flex-col items-center justify-center">
          <SignatureCanvas
            canvasRef={canvasRef}
            onStartDrawing={startDrawing}
            onDraw={draw}
            onStopDrawing={stopDrawing}
            label={
              currentStep === VERIFICATION_STEPS.INITIAL
                ? "DRAW SIGNATURE ABOVE"
                : "REPEAT SIGNATURE ABOVE"
            }
            hasDrawn={hasCaptured}
            onClear={clearSignature}
          />
        </div>
        {/* Align on the bottom */}
        <ButtonContainer>
          <ActionButton
            onClick={handleContinue}
            disabled={!hasCaptured}
            variant="primary"
          >
            CONTINUE
          </ActionButton>
        </ButtonContainer>
      </div>
    </ScreenLayout>
  );
}
