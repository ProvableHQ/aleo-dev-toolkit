"use client";

import { Check, Home, RefreshCw, Hash, ExternalLink, ArrowLeft } from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Button } from "@/components/ui/button";
import {
  ActionButton,
  CopyButton,
  ScreenLayout,
} from "../signature/sig-components";
import { signatureToSVG } from "../signature/signature-utils.jsx";
import { VERIFICATION_STEPS } from "../../hooks/useVerification";
import { cn } from "@/lib/utils";
import { FingerprintIcon } from "@/assets/fingerprint";
import { FaceIcon } from "@/assets/face";
import { appVersionFooter } from "./app-version-footer";

const emptySample = `<svg width="33" height="32" viewBox="0 0 33 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle opacity="0.06" cx="16.5996" cy="16" r="16" fill="url(#paint0_linear_304_396)"/>
<defs>
<linearGradient id="paint0_linear_304_396" x1="16.5996" y1="0" x2="16.5996" y2="32" gradientUnits="userSpaceOnUse">
<stop stop-color="white"/>
<stop offset="1" stop-color="white" stop-opacity="0"/>
</linearGradient>
</defs>
</svg>`;

const filledSampleBackground = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="16" cy="16" r="16" fill="url(#paint0_linear_304_394)" fill-opacity="0.12"/>
<circle cx="16" cy="16" r="16" fill="url(#paint1_linear_304_394)" fill-opacity="0.12"/>
<circle cx="16" cy="16" r="15.625" stroke="url(#paint2_linear_304_394)" stroke-opacity="0.2" stroke-width="0.75"/>
<defs>
<linearGradient id="paint0_linear_304_394" x1="16" y1="0" x2="16" y2="32" gradientUnits="userSpaceOnUse">
<stop stop-color="white"/>
<stop offset="1" stop-color="white" stop-opacity="0"/>
</linearGradient>
<linearGradient id="paint1_linear_304_394" x1="16" y1="0" x2="16" y2="32" gradientUnits="userSpaceOnUse">
<stop stop-color="#13BC80"/>
<stop offset="1" stop-color="#13BC80" stop-opacity="0"/>
</linearGradient>
<linearGradient id="paint2_linear_304_394" x1="16" y1="0" x2="16" y2="32" gradientUnits="userSpaceOnUse">
<stop stop-color="#13BC80"/>
<stop offset="1" stop-color="#13BC80" stop-opacity="0.2"/>
</linearGradient>
</defs>
</svg>
`;

const verificationBackground = `<svg
    width="353"
    height="108"
    viewBox="0 0 353 108"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="353" height="108" rx="20" fill="white" fill-opacity="0.02" />
    <rect
      width="353"
      height="108"
      rx="20"
      fill="url(#paint0_linear_304_806)"
      fill-opacity="0.02"
    />
    <rect
      x="0.5"
      y="0.5"
      width="352"
      height="107"
      rx="19.5"
      stroke="white"
      stroke-opacity="0.04"
    />
    <rect
      opacity="0.04"
      y="43"
      width="353"
      height="1"
      fill="url(#paint1_linear_304_806)"
    />
    <defs>
      <linearGradient
        id="paint0_linear_304_806"
        x1="176.5"
        y1="0"
        x2="176.5"
        y2="108"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="#13BC80" />
        <stop offset="0.435896" stop-color="#13BC80" stop-opacity="0" />
      </linearGradient>
      <linearGradient
        id="paint1_linear_304_806"
        x1="0"
        y1="43.5"
        x2="353"
        y2="43.5"
        gradientUnits="userSpaceOnUse"
      >
        <stop stop-color="white" stop-opacity="0.2" />
        <stop offset="0.5" stop-color="white" />
        <stop offset="1" stop-color="white" stop-opacity="0.2" />
      </linearGradient>
    </defs>
  </svg>
`;

const proofDetailsBackground = `<svg width="353" height="462" viewBox="0 0 353 462" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="353" height="462" rx="20" fill="white" fill-opacity="0.02"/>
<rect width="353" height="462" rx="20" fill="url(#paint0_linear_304_680)" fill-opacity="0.02"/>
<rect x="0.5" y="0.5" width="352" height="461" rx="19.5" stroke="white" stroke-opacity="0.04"/>
<rect width="353" height="462" rx="20" fill="url(#paint1_linear_304_680)"/>
<rect x="0.5" y="0.5" width="352" height="461" rx="19.5" stroke="white" stroke-opacity="0.03"/>
<defs>
<linearGradient id="paint0_linear_304_680" x1="176.5" y1="0" x2="176.5" y2="462" gradientUnits="userSpaceOnUse">
<stop stop-color="#13BC80"/>
<stop offset="0.435896" stop-color="#13BC80" stop-opacity="0"/>
</linearGradient>
<linearGradient id="paint1_linear_304_680" x1="176.5" y1="0" x2="176.5" y2="462" gradientUnits="userSpaceOnUse">
<stop offset="0.65" stop-color="#0B0E13" stop-opacity="0"/>
<stop offset="1" stop-color="#0B0E13"/>
</linearGradient>
</defs>
</svg>
`;

// Helper function to create sample preview component
export const SamplePreview = ({
  sampleData,
  size = 48,
  className = "",
  verificationType,
}) => {
  const svgString = useMemo(() => {
    if (!sampleData) {
      return "";
    }
    if (verificationType === "signature") {
      console.log("sampleData", sampleData);
      return signatureToSVG(sampleData, size);
    }
    // For face verification, you would return a different preview
    return "";
  }, [sampleData, size, verificationType]);
  if (verificationType === "signature") console.log("sampleData", sampleData);

  if (verificationType === "signature") {
    return (
      <div
        className={`${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "hidden",
          backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(sampleData ? filledSampleBackground : emptySample)}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        dangerouslySetInnerHTML={{ __html: svgString }}
      />
    );
  }

  // For face verification, check if sampleData is a data URL (base64 image)
  if (
    verificationType === "face" &&
    sampleData &&
    typeof sampleData === "string" &&
    sampleData.startsWith("data:image")
  ) {
    return (
      <div
        className={`${className} overflow-hidden rounded-full`}
        style={{
          width: size * 0.7,
          height: size,
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          borderRadius: "50% 50% 50% 50% / 40% 40% 60% 60%",
        }}
      >
        <img
          src={sampleData}
          alt="Face sample"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>
    );
  }

  // Fallback for face verification when no image data is available
  return (
    <div
      className={`${className} flex items-center justify-center rounded-full`}
      style={{
        width: size,
        height: size,
        backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(sampleData ? filledSampleBackground : emptySample)}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {sampleData && <Check className="text-success h-6 w-6" />}
    </div>
  );
};

export const SamplesPreview = ({
  samples,
  verificationType,
  sampleSize = 3,
}) => {
  const samplesPreview = useMemo(() => {
    return Array.from({ length: sampleSize }).map((_, index) => (
      <div
        key={index}
        className="flex h-[32px] w-[32px] items-center justify-center overflow-hidden rounded-full"
      >
        <SamplePreview
          sampleData={samples[index] || null}
          size={32}
          verificationType={verificationType}
        />
      </div>
    ));
  }, [samples, sampleSize, verificationType]);

  return (
    <div className="mb-2 flex justify-center space-x-4 sm:mb-6">
      {samplesPreview}
    </div>
  );
};

// Verification Complete Screen Component
export const VerificationCompleteScreen = ({
  onBack,
  onGoHome,
  onRestart,
  onRetry,
  verificationType,
  chartDataProof,
  proofSample,
}) => {
  const stepConfig = {
    signature: {
      title: "Signature Verification",
      icon: <FingerprintIcon className="self-center" width={20} height={20} />,
    },
    face: {
      title: "Face Verification",
      icon: <FaceIcon className="self-center" width={20} height={20} />,
    },
  };

  const config = stepConfig[verificationType];
  const trueValue = chartDataProof?.find((d) => d.label === "True")?.value || 0;
  const falseValue =
    chartDataProof?.find((d) => d.label === "False")?.value || 0;
  const isMatch = trueValue > 50;
  const valueToShow = isMatch ? trueValue : falseValue;

  return (
    <ScreenLayout title="Verification Complete" onBack={onBack}>
      <div className="mx-auto flex h-full w-[360px] max-w-md flex-1 flex-col items-center justify-between text-center">
        <div
          style={{
            backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(verificationBackground)}")`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
          }}
          className="mb-8 w-full max-w-md cursor-pointer rounded-2xl p-4 hover:opacity-70"
          onClick={onRetry}
        >
          <div className="flex flex-col items-center gap-5">
            <div className="flex w-full flex-row items-center justify-start gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full">
                {config.icon}
              </div>
              <span className="gradient-white font-innovator inline-block text-[16px] font-bold">
                {config.title}
              </span>
            </div>

            <div className="flex w-full flex-row justify-between">
              <SamplePreview
                sampleData={proofSample}
                size={44}
                verificationType={verificationType}
              />

              <div className="flex flex-row items-center gap-2 text-[12px]">
                <div className="rounded-full border-1 border-[#616769] bg-[#282b2f] px-2 py-0.5 leading-[140%] tracking-[tight] text-[#616769] shadow">
                  EXP JUN 2026
                </div>
                <div
                  className={cn(
                    "rounded-full border-1 px-2 py-0.5 leading-[140%] tracking-tight text-[#11171B] shadow",
                    isMatch
                      ? "bg-success border-[#14b67a]"
                      : "bg-error border-[#b03b3a]"
                  )}
                >
                  {valueToShow.toFixed(1)}% {isMatch ? "MATCH" : "NO MATCH"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <ButtonContainer>
          <ActionButton onClick={onRestart} variant="outline" icon={RefreshCw} className="text-gray-900 border-gray-600 hover:bg-gray-800 hover:text-white">
            RESTART EXPERIENCE
          </ActionButton>

          <ActionButton onClick={onGoHome} variant="primary">
            <Home className="mr-2 h-5 w-5" />
            Go Home
          </ActionButton>
        </ButtonContainer>
      </div>
    </ScreenLayout>
  );
};

// Proof Details Screen Component
export const ProofDetailsScreen = ({
  onDone,
  proofText,
  chartDataProof,
  proofSample,
  verificationType,
  onBack,
  onRetry,
}) => {
  const trueValue = chartDataProof?.find((d) => d.label === "True")?.value || 0;
  const falseValue =
    chartDataProof?.find((d) => d.label === "False")?.value || 0;
  const isMatch = trueValue > 50;

  const verificationTypeConfig = {
    signature: {
      title: "Signature Verification",
      icon: <FingerprintIcon color="#1A3C2E" />,
    },
    face: {
      title: "Face Profile",
      icon: <FaceIcon color="#1A3C2E" />,
    },
  };

  const config = verificationTypeConfig[verificationType];

  return (
    <ScreenLayout onBack={onBack} title="Your Proof">
      <div className="flex flex-1 flex-col items-center px-5 pb-32">
        <div className="w-full max-w-md space-y-6 overflow-y-auto">
          <div
            style={{
              backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(proofDetailsBackground)}")`,
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
            }}
            className="w-full cursor-pointer rounded-2xl p-6 hover:opacity-70"
            onClick={onRetry}
          >
            <div className="flex flex-col items-center">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full">
                {config.icon}
              </div>
              <span className="gradient-white font-innovator mb-4 inline-block text-2xl font-bold">
                {config.title}
              </span>
              <div className="mb-6 flex h-28 w-28 items-center justify-center">
                <SamplePreview
                  sampleData={proofSample}
                  size={112}
                  verificationType={verificationType}
                />
              </div>
              <div
                className={cn(
                  "bg-opacity-90 mb-6 rounded-full border-1 px-3 py-0.5 text-[13px] tracking-widest text-[#11171B] shadow",
                  isMatch
                    ? "bg-success border-[#14b67a]"
                    : "bg-error border-[#b03b3a]"
                )}
              >
                {Math.round(trueValue)}% MATCH
              </div>
            </div>
            <div className="mb-6 space-y-3">
              <div className="flex items-center">
                <div className="relative mr-4 h-3 flex-1 overflow-hidden rounded-full border-1 border-[#11835c] bg-[#22332B]">
                  <div
                    className="bg-success absolute top-0 left-0 h-3 rounded-full"
                    style={{ width: `${trueValue}%` }}
                  ></div>
                </div>
                <span className="text-success w-[35px] text-right text-[12px] font-bold">
                  {Math.round(trueValue)}%
                </span>
              </div>
              <div className="flex items-center">
                <div className="relative mr-4 h-3 flex-1 overflow-hidden rounded-full border-1 border-[#b03b3a] bg-[#332223]">
                  <div
                    className="absolute top-0 left-0 h-3 rounded-full bg-[#F87171]"
                    style={{ width: `${falseValue}%` }}
                  ></div>
                </div>
                <span className="w-[35px] text-right text-[12px] font-bold text-[#F87171]">
                  {Math.round(falseValue)}%
                </span>
              </div>
            </div>
          </div>

          <div className="mb-2 w-full space-y-4">
            <div className="w-full">
              <h4 className="mb-3 text-center text-sm font-medium tracking-widest text-gray-400">
                PROOF CODE
              </h4>
              <div className="relative overflow-hidden rounded-xl border border-[#232B30] bg-[#181F2350] py-3 pl-4">
                <div className="custom-scrollbar max-h-30 overflow-y-auto">
                  <code className="font-pps pr-2 text-xs break-all whitespace-pre-wrap text-gray-300 opacity-90">
                    {proofText}
                  </code>
                </div>
                <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-10 h-full rounded-xl bg-gradient-to-t from-[#181F23] to-transparent"></div>
              </div>
            </div>
            <CopyButton value={proofText} copyText="COPY PROOF" />
          </div>
        </div>
        <div className="fixed right-0 bottom-0 left-0 z-20 flex flex-col gap-4 bg-[#0b0e13] px-5 pt-2 pb-5 sm:pb-15">
          {!isMatch && (
            <ActionButton icon={RefreshCw} onClick={onRetry} variant="primary">
              RETRY
            </ActionButton>
          )}
          <ActionButton onClick={onDone} variant="primary">
            DONE
          </ActionButton>
        </div>
      </div>
    </ScreenLayout>
  );
};

// Creating Authorization Screen Component
export const CreatingAuthorizationScreen = ({ verificationType }) => {
  const verificationTypeConfig = {
    signature: "SIGNATURE VERIFICATION",
    face: "FACE VERIFICATION",
  };

  return (
    <div className="bg-constellation relative flex h-svh flex-col overflow-hidden text-white">
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        <div className="mx-auto max-w-md pt-20 text-center">
          <span className="font-innovator gradient-white mb-4 inline-block w-full text-[26px] font-bold">
            Creating Authorization...
          </span>
          <span className="block w-full text-center text-[13px] text-gray-400">
            {verificationTypeConfig[verificationType]}
          </span>
        </div>
      </div>

      <div className="relative z-10 space-y-2 px-6 pb-5 text-center text-[10px] text-gray-500 sm:pb-15">
        <div className="gradient-white mb-4 text-center text-base text-[10px] tracking-widest">
          <div className="flex flex-row items-center justify-center gap-2">
            <span>CREATING PROOF AUTHORIZATION</span>
            <div className="gradient-white flex justify-center space-x-1">
              <div
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-white"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-white"
                style={{ animationDelay: "150ms" }}
              ></div>
              <div
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-white"
                style={{ animationDelay: "300ms" }}
              ></div>
            </div>
          </div>
        </div>
        <div
          style={{
            backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(appVersionFooter)}")`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            width: "337px",
            height: "102px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            margin: "0 auto",
          }}
        ></div>
      </div>
    </div>
  );
};

// Generating Proof Screen Component
export const GeneratingProofScreen = ({
  proofProgress,
  expectedRuntime,
  verificationType,
  provingError,
  onRetryProving,
  onSwitchToLocal,
}) => {
  const remainingSeconds = Math.ceil(
    ((100 - proofProgress) * expectedRuntime) / 100
  );

  // Special handling for 99% case
  const getProgressText = () => {
    if (proofProgress >= 99.0) {
      return "Expecting results momentarily...";
    } else {
      return `${proofProgress.toFixed(1)}% • ABOUT ${remainingSeconds} SECONDS REMAINING`;
    }
  };

  const verificationTypeConfig = {
    signature: "SIGNATURE VERIFICATION",
    face: "FACE VERIFICATION",
  };

  if (provingError) {
    return (
      <div className="bg-constellation relative flex h-dvh flex-col overflow-hidden text-white">
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
          <div className="mx-auto max-w-md pt-20 text-center">
            <span className="font-innovator gradient-white mb-4 inline-block w-full text-[26px] font-bold">
              Proving Error
            </span>
            <span className="mb-6 block w-full text-center text-[13px] text-gray-400">
              {verificationTypeConfig[verificationType]}
            </span>

            {/* Error Display */}
            <div className="mb-8 max-h-[60vh] overflow-y-auto rounded-lg border border-red-600 bg-red-900/20 p-4 text-left">
              <div className="mb-2 flex items-center">
                <div className="mr-2 h-2 w-2 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium text-red-300">
                  Delegated Proving Failed
                </span>
              </div>
              <p className="mb-4 text-sm text-red-200">
                {provingError.message.length > 40 
                  ? `${provingError.message.substring(0, 40)}...` 
                  : provingError.message}
              </p>
              <details className="text-xs text-red-300">
                <summary className="cursor-pointer hover:text-red-200">
                  Technical Details
                </summary>
                <div className="mt-2 max-h-48 overflow-y-auto">
                  <p className="font-mono text-red-400 break-words">
                    {provingError.message}
                  </p>
                  {provingError.originalError && (
                    <p className="mt-2 font-mono text-red-400 break-words">
                      {provingError.originalError}
                    </p>
                  )}
                </div>
              </details>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-4 px-6 pb-5 sm:pb-15">
          <div className="mx-auto flex max-w-md flex-col gap-3">
            {provingError.canRetry && (
              <ActionButton onClick={onRetryProving} variant="outline">
                Retry Proving Request
              </ActionButton>
            )}
            {provingError.canSwitchToLocal && (
              <ActionButton onClick={onSwitchToLocal} variant="primary">
                {verificationType === "face" ? (
                  <div className="flex flex-col">
                    <span>Switch to Local Proving</span>
                    <span className="text-xs">(strong machine required)</span>
                  </div>
                ) : (
                  "Switch to Local Proving"
                )}
              </ActionButton>
            )}
          </div>

          <div
            style={{
              backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(appVersionFooter)}")`,
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
              width: "337px",
              height: "102px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              margin: "0 auto",
            }}
          ></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-constellation relative flex h-svh flex-col overflow-hidden text-white">
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        <div className="mx-auto max-w-md pt-20 text-center">
          <span className="font-innovator gradient-white mb-4 inline-block w-full text-[26px] font-bold">
            Generating Proof...
          </span>
          <span className="block w-full text-center text-[13px] text-gray-400">
            {verificationTypeConfig[verificationType]}
          </span>
        </div>
      </div>

      <div className="relative z-10 space-y-2 px-6 pb-5 text-center text-[10px] text-gray-500 sm:pb-15">
        <div className="mb-4">
          <span className="text-white">
            {getProgressText()}
          </span>
        </div>
        <div
          style={{
            backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(appVersionFooter)}")`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            width: "337px",
            height: "102px",
            // center the div
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            margin: "0 auto",
          }}
        ></div>
      </div>
    </div>
  );
};

// Proof Generated Screen Component
export const ProofGeneratedScreen = ({
  setCurrentStep,
  verificationType,
  chartDataProof,
}) => {
  const verificationTypeConfig = {
    signature: "SIGNATURE",
    face: "FACE",
  };

  const trueValue = chartDataProof?.find((d) => d.label === "True")?.value || 0;
  const isMatch = trueValue > 50;

  return (
    <div className="bg-constellation relative flex h-svh flex-col overflow-hidden text-white">
      <div className="relative z-10 flex flex-1 flex-col items-center justify-between px-6">
        <div className="flex flex-1 flex-col items-center justify-center">
          <span className="gradient-green font-innovator mb-4 text-[26px] font-bold">
            Proof Generated
          </span>
          <p className="mb-8 text-[13px] text-white">
            {verificationTypeConfig[verificationType]}{" "}
            {isMatch ? "TRUE" : "FALSE"}: {trueValue.toFixed(1)}% MATCH
          </p>
        </div>

        <ButtonContainer>
          <div className="gradient-white mb-2 text-center text-base text-[10px] tracking-widest">
            COMPLETE
          </div>
          <div className="bg-success mx-auto mb-4 h-0.5 w-[337px] opacity-40" />

          <ActionButton
            onClick={() => setCurrentStep(VERIFICATION_STEPS.PROOF_DETAILS)}
            variant="primary"
          >
            CONTINUE
          </ActionButton>
        </ButtonContainer>
      </div>
    </div>
  );
};

export const ComputingHashesScreen = ({ 
  onBack,
  verificationType, 
  computedHash, 
  isComputing, 
  onContinue 
}) => {
  console.log("🖥️ ComputingHashesScreen rendering:", { verificationType, computedHash, isComputing });
  console.log("🖥️ ComputingHashesScreen props:", { onBack: !!onBack, onContinue: !!onContinue });
  
  const stepConfig = {
    signature: {
      title: "Computing Signature Hash",
      icon: <FingerprintIcon className="self-center" width={20} height={20} />,
    },
    face: {
      title: "Computing Face Hash", 
      icon: <FaceIcon className="self-center" width={20} height={20} />,
    },
  };

  const config = stepConfig[verificationType];
  console.log("🔧 Config:", config);

  return (
    <ScreenLayout onBack={onBack} title="Computing model hashes">
      <div className="mx-auto flex h-full w-[360px] max-w-md flex-1 flex-col items-center justify-between text-center">
        <div className="mb-8 w-full max-w-md rounded-2xl bg-white bg-opacity-5 p-6">
          <div className="flex flex-col items-center gap-5">
            <div className="flex w-full flex-row items-center justify-center gap-3">
              <Hash className="h-6 w-6 text-white" />
              <span className="text-white text-lg font-bold">
                Computing Model Hash
              </span>
            </div>

            {isComputing ? (
              <div className="flex w-full flex-col items-center justify-center gap-4">
                <div className="animate-spin">
                  <Hash className="h-12 w-12 text-white opacity-60" />
                </div>
                <span className="text-sm text-white opacity-70">
                  Computing BHP1024 hash of trained model parameters...
                </span>
              </div>
            ) : computedHash ? (
              <div className="flex w-full flex-col gap-3">
                <div className="text-sm text-white opacity-70">
                  Model Hash (BHP1024)
                </div>
                <div className="break-all rounded-lg bg-black bg-opacity-20 p-4 font-mono text-sm text-white">
                  {computedHash}
                </div>
                <CopyButton 
                  value={computedHash}
                  className="text-sm"
                >
                  Copy Hash
                </CopyButton>
              </div>
            ) : (
              <div className="text-sm text-white opacity-70">
                Ready to compute hash...
              </div>
            )}
          </div>
        </div>

        {!isComputing && computedHash && (
          <div className="mb-5 flex flex-col items-center justify-center gap-4">
            <ActionButton onClick={onContinue} variant="primary">
              Continue
            </ActionButton>
          </div>
        )}

        <div
          style={{
            backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(appVersionFooter)}")`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            width: "337px",
            height: "102px",
            margin: "0 auto",
          }}
        />
      </div>
    </ScreenLayout>
  );
};

// Creating Hash Authorization Screen Component
export const CreatingHashAuthorizationScreen = ({ verificationType }) => {
  const verificationTypeConfig = {
    signature: "SIGNATURE HASH COMPUTATION",
    face: "FACE HASH COMPUTATION",
  };

  return (
    <div className="bg-constellation relative flex h-svh flex-col overflow-hidden text-white">
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        <div className="mx-auto max-w-md pt-20 text-center">
          <span className="font-innovator gradient-white mb-4 inline-block w-full text-[26px] font-bold">
            Creating Hash Authorization...
          </span>
          <span className="block w-full text-center text-[13px] text-gray-400">
            {verificationTypeConfig[verificationType]}
          </span>
        </div>
      </div>

      <div className="relative z-10 space-y-2 px-6 pb-5 text-center text-[10px] text-gray-500 sm:pb-15">
        <div className="gradient-white mb-4 text-center text-base text-[10px] tracking-widest">
          <div className="flex flex-row items-center justify-center gap-2">
            <span>CREATING HASH PROOF AUTHORIZATION</span>
            <div className="gradient-white flex justify-center space-x-1">
              <div
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-white"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-white"
                style={{ animationDelay: "150ms" }}
              ></div>
              <div
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-white"
                style={{ animationDelay: "300ms" }}
              ></div>
            </div>
          </div>
        </div>
        <div
          style={{
            backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(appVersionFooter)}")`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            width: "337px",
            height: "102px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            margin: "0 auto",
          }}
        ></div>
      </div>
    </div>
  );
};

// Generating Hash Proof Screen Component
export const GeneratingHashProofScreen = ({
  hashProofProgress,
  expectedRuntime,
  verificationType,
  hashProvingError,
  onRetryHashProving,
}) => {
  const remainingSeconds = Math.ceil(
    ((100 - hashProofProgress) * expectedRuntime) / 100
  );

  // Special handling for 99% case
  const getProgressText = () => {
    if (hashProofProgress >= 99.0) {
      return "Expecting hash results momentarily...";
    } else {
      return `${hashProofProgress.toFixed(1)}% • ABOUT ${remainingSeconds} SECONDS REMAINING`;
    }
  };

  const verificationTypeConfig = {
    signature: "SIGNATURE HASH COMPUTATION",
    face: "FACE HASH COMPUTATION",
  };

  if (hashProvingError) {
    return (
      <div className="bg-constellation relative flex h-dvh flex-col overflow-hidden text-white">
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
          <div className="mx-auto max-w-md pt-20 text-center">
            <span className="font-innovator gradient-white mb-4 inline-block w-full text-[26px] font-bold">
              Hash Proving Error
            </span>
            <span className="mb-6 block w-full text-center text-[13px] text-gray-400">
              {verificationTypeConfig[verificationType]}
            </span>

            {/* Error Display */}
            <div className="mb-8 max-h-[60vh] overflow-y-auto rounded-lg border border-red-600 bg-red-900/20 p-4 text-left">
              <div className="mb-2 flex items-center">
                <div className="mr-2 h-2 w-2 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium text-red-300">
                  Hash Delegated Proving Failed
                </span>
              </div>
              <p className="mb-4 text-sm text-red-200">
                {hashProvingError.message.length > 40 
                  ? `${hashProvingError.message.substring(0, 40)}...` 
                  : hashProvingError.message}
              </p>
              <details className="text-xs text-red-300">
                <summary className="cursor-pointer hover:text-red-200">
                  Technical Details
                </summary>
                <div className="mt-2 max-h-48 overflow-y-auto">
                  <p className="font-mono text-red-400 break-words">
                    {hashProvingError.message}
                  </p>
                  {hashProvingError.originalError && (
                    <p className="mt-2 font-mono text-red-400 break-words">
                      {hashProvingError.originalError}
                    </p>
                  )}
                </div>
              </details>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-4 px-6 pb-5 sm:pb-15">
          <div className="mx-auto flex max-w-md flex-col gap-3">
            {hashProvingError.canRetry && (
              <ActionButton onClick={onRetryHashProving} variant="outline">
                Retry Hash Proving Request
              </ActionButton>
            )}
          </div>

          <div
            style={{
              backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(appVersionFooter)}")`,
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
              width: "337px",
              height: "102px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              margin: "0 auto",
            }}
          ></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-constellation relative flex h-svh flex-col overflow-hidden text-white">
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        <div className="mx-auto max-w-md pt-20 text-center">
          <span className="font-innovator gradient-white mb-4 inline-block w-full text-[26px] font-bold">
            Generating Hash Proof...
          </span>
          <span className="block w-full text-center text-[13px] text-gray-400">
            {verificationTypeConfig[verificationType]}
          </span>
        </div>
      </div>

      <div className="relative z-10 space-y-2 px-6 pb-5 text-center text-[10px] text-gray-500 sm:pb-15">
        <div className="mb-4">
          <span className="text-white">
            {getProgressText()}
          </span>
        </div>
        <div
          style={{
            backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(appVersionFooter)}")`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            width: "337px",
            height: "102px",
            // center the div
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            margin: "0 auto",
          }}
        ></div>
      </div>
    </div>
  );
};

// Hash Proof Generated Screen Component
export const HashProofGeneratedScreen = ({
  setCurrentStep,
  verificationType,
  computedHash,
}) => {
  const verificationTypeConfig = {
    signature: "SIGNATURE",
    face: "FACE",
  };

  return (
    <div className="bg-constellation relative flex h-svh flex-col overflow-hidden text-white">
      <div className="relative z-10 flex flex-1 flex-col items-center justify-between px-6">
        <div className="flex flex-1 flex-col items-center justify-center">
          <span className="gradient-green font-innovator mb-4 text-[26px] font-bold">
            Hash Proof Generated
          </span>
          <p className="mb-8 text-[13px] text-white">
            {verificationTypeConfig[verificationType]} MODEL HASH COMPUTED
          </p>
          {computedHash && (
            <div className="mb-4 max-w-md break-all rounded-lg bg-black bg-opacity-20 p-4 font-mono text-xs text-white">
              {computedHash}
            </div>
          )}
        </div>

        <ButtonContainer>
          <div className="gradient-white mb-2 text-center text-base text-[10px] tracking-widest">
            COMPLETE
          </div>
          <div className="bg-success mx-auto mb-4 h-0.5 w-[337px] opacity-40" />

          <ActionButton
            onClick={() => setCurrentStep(VERIFICATION_STEPS.REGISTERING_ADDRESS)}
            variant="primary"
          >
            CONTINUE
          </ActionButton>
        </ButtonContainer>
      </div>
    </div>
  );
};

// Waiting for Wallet Screen Component
export const WaitingForWalletScreen = ({ 
  verificationType, 
  provingError, 
  onRetryProving, 
  onBack,
  onBackToProof 
}) => {
  const verificationTypeConfig = {
    signature: "SIGNATURE VERIFICATION",
    face: "FACE VERIFICATION",
  };

  // If there's an error, show error UI instead of waiting animation
  if (provingError) {
    return (
      <div className="flex h-svh flex-col text-white">
        <div className="flex items-center justify-between p-2 text-[13px] uppercase sm:p-6">
          <Button variant="ghost" size="icon" onClick={onBackToProof || onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="font-innovator gradient-white text-[26px] font-semibold">
            Transaction Cancelled
          </span>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="mx-auto max-w-md text-center">
            <span className="mb-6 block w-full text-center text-[13px] text-gray-400">
              {verificationTypeConfig[verificationType]}
            </span>
            
            <div className="mb-6 rounded-lg bg-red-900/20 border border-red-500/30 p-4">
              <p className="text-sm text-red-300 mb-2">
                {provingError.message}
              </p>
              {provingError.originalError && (
                <p className="text-xs text-red-400">
                  {provingError.originalError}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {provingError.canRetry && (
                <button
                  onClick={onRetryProving}
                  className="w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-500"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-svh flex-col text-white">
      <div className="flex items-center justify-between p-2 text-[13px] uppercase sm:p-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="font-innovator gradient-white text-[26px] font-semibold">
          Waiting for Wallet...
        </span>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="mx-auto max-w-md text-center">
          <span className="block w-full text-center text-[13px] text-gray-400">
            {verificationTypeConfig[verificationType]}
          </span>
        </div>
      </div>

      <div className="space-y-2 px-6 pb-5 text-center text-[10px] text-gray-500 sm:pb-15">
        <div className="gradient-white mb-4 text-center text-base text-[10px] tracking-widest">
          WAITING FOR WALLET TO SIGN TRANSACTION
        </div>
        <div className="flex justify-center space-x-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:-0.3s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:-0.15s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-white"></div>
        </div>
      </div>
    </div>
  );
};

// Searching Network Screen Component
export const SearchingNetworkScreen = ({ verificationType, networkSearchAttempt, onBack }) => {
  const verificationTypeConfig = {
    signature: "SIGNATURE VERIFICATION",
    face: "FACE VERIFICATION",
  };

  const attemptText = networkSearchAttempt.current > 0 
    ? `ATTEMPT ${networkSearchAttempt.current} OF ${networkSearchAttempt.total}`
    : "SEARCHING FOR TRANSACTION ON NETWORK";

  return (
    <div className="flex h-svh flex-col text-white">
      <div className="flex items-center justify-between p-2 text-[13px] uppercase sm:p-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="font-innovator gradient-white text-[26px] font-semibold">
          Searching Network...
        </span>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="mx-auto max-w-md text-center">
          <span className="block w-full text-center text-[13px] text-gray-400">
            {verificationTypeConfig[verificationType]}
          </span>
        </div>
      </div>

      <div className="space-y-2 px-6 pb-5 text-center text-[10px] text-gray-500 sm:pb-15">
        <div className="gradient-white mb-4 text-center text-base text-[10px] tracking-widest">
          {attemptText}
        </div>
        <div className="flex justify-center space-x-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:-0.3s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:-0.15s]"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-white"></div>
        </div>
      </div>
    </div>
  );
};

export const RegisteringAddressScreen = ({
  onBack,
  verificationType,
  onSuccess,
  onError,
  computedHash
}) => {
  const { address, connected } = useWallet();
  const [isRegistering, setIsRegistering] = useState(true);
  const [error, setError] = useState(null);
  const [transactionId, setTransactionId] = useState(null);
  const hasRegisteredRef = useRef(null); // Use ref to persist across StrictMode remounts
  
  // Timer state for tracking registration duration
  const [registrationStartTime, setRegistrationStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerIntervalRef = useRef(null);
  
  // Progress calculation state
  const [registrationProgress, setRegistrationProgress] = useState(0);
  const [isProgressRunning, setIsProgressRunning] = useState(false);
  const progressIntervalRef = useRef(null);
  const expectedRuntime = 57; // 57 seconds total duration

  // Start progress simulation
  const startProgressSimulation = () => {
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    setIsProgressRunning(true);
    setRegistrationProgress(0);

    const intervalTime = 150; // Update every 150ms
    const expectedRuntimeInMilliseconds = expectedRuntime * 1000;
    const increment = (intervalTime / expectedRuntimeInMilliseconds) * 100;

    progressIntervalRef.current = setInterval(() => {
      setRegistrationProgress((oldProgress) => {
        var newProgress = oldProgress + increment;
        if (newProgress >= 99) {
          newProgress = 99; // Cap at 99% until actual completion
        }
        return Math.round(newProgress * 10) / 10;
      });
    }, intervalTime);
  };

  // Stop progress simulation
  const stopProgressSimulation = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setIsProgressRunning(false);
    setRegistrationProgress(100); // Set to 100% when completed
  };

  // Calculate remaining seconds
  const getRemainingSeconds = () => {
    return Math.ceil(((100 - registrationProgress) * expectedRuntime) / 100);
  };

  // Get progress text similar to GeneratingProofScreen
  const getProgressText = () => {
    if (registrationProgress >= 99.0) {
      return "Expecting results momentarily...";
    } else {
      const remainingSeconds = getRemainingSeconds();
      return `${registrationProgress.toFixed(1)}% • ABOUT ${remainingSeconds} SECONDS REMAINING`;
    }
  };


  // Start progress simulation when registration starts
  useEffect(() => {
    if (isRegistering) {
      startProgressSimulation();
    } else {
      stopProgressSimulation();
    }
  }, [isRegistering]);

  // Timeout handling - if registration takes longer than expected, show timeout message
  useEffect(() => {
    if (isRegistering && registrationStartTime) {
      const timeoutId = setTimeout(() => {
        if (isRegistering) {
          console.log('Registration timeout reached, showing timeout message');
          // The progress will already be at 99% and showing "Expecting results momentarily..."
        }
      }, expectedRuntime * 1000); // 57 seconds timeout

      return () => clearTimeout(timeoutId);
    }
  }, [isRegistering, registrationStartTime, expectedRuntime]);

  useEffect(() => {
    console.log('RegisteringAddressScreen useEffect triggered. address:', address, 'connected:', connected, 'hasRegistered:', hasRegisteredRef.current);

    const registerAddress = async () => {
      try {
        // Get wallet address from wallet adapter
        if (!connected || !address) {
          throw new Error('No wallet connected. Please connect your wallet first.');
        }

        // Guard against duplicate registrations for the same address
        if (hasRegisteredRef.current === address) {
          console.log('Registration already in progress or completed for:', address);
          return;
        }

        console.log('Registering address:', address);
        hasRegisteredRef.current = address; // Mark this address as being registered

        // Start timer for registration duration
        const startTime = Date.now();
        setRegistrationStartTime(startTime);
        setElapsedSeconds(0);
        
        // Start timer interval to update elapsed seconds every second
        timerIntervalRef.current = setInterval(() => {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          setElapsedSeconds(elapsed);
          console.log(`Registration in progress: ${elapsed} seconds elapsed`);
        }, 1000);

        // Determine which endpoint to use based on whether we have a computed hash
        const endpoint = computedHash ? '/api/rust/register-address-kya' : '/api/rust/verify';
        const requestBody = computedHash 
          ? { address: address, kya_hash: computedHash }
          : { address: address };

        console.log('Using endpoint:', endpoint, 'with body:', requestBody);

        // Call the appropriate endpoint
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        const result = await response.json();

        if (result.success) {
          // Parse the transaction ID from the response
          let txId = result.transactionId || result.transaction_id;
          console.log('Raw transaction ID:', txId);
          
          if (typeof txId === 'string' && txId.startsWith('{')) {
            try {
              const parsed = JSON.parse(txId);
              txId = parsed.id || txId;
              console.log('Parsed transaction ID:', txId);
            } catch (e) {
              console.log('Failed to parse transaction ID, using original:', txId);
            }
          }
          setTransactionId(txId);
          console.log('Address registered successfully:', result);
          
          // Stop timer
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          const finalElapsed = Math.floor((Date.now() - startTime) / 1000);
          console.log(`✅ Registration completed successfully in ${finalElapsed} seconds`);
          
          setIsRegistering(false);
        } else {
          throw new Error(result.error || 'Failed to register address');
        }
      } catch (err) {
        console.error('Error registering address:', err);
        
        // Stop timer
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        const finalElapsed = Math.floor((Date.now() - startTime) / 1000);
        console.log(`❌ Registration failed after ${finalElapsed} seconds:`, err.message);
        
        setError(err.message);
        setIsRegistering(false);
        onError && onError(err);
      }
    };

    if (address && connected) {
      registerAddress();
    }
  }, [address, connected]); // Only re-run when address or connection status changes

  // Cleanup timer and progress interval on component unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, []);

  // Debug logging
  console.log('RegisteringAddressScreen render state:', {
    isRegistering,
    error,
    transactionId,
    shouldShowButtons: !isRegistering && !error
  });

  const verificationTypeConfig = {
    signature: "SIGNATURE VERIFICATION",
    face: "FACE VERIFICATION",
  };

  if (error) {
    return (
      <div className="bg-constellation relative flex h-svh flex-col overflow-hidden text-white">
        <div className="relative z-10 flex flex-1 flex-col items-center justify-between px-6">
          <div className="flex flex-1 flex-col items-center justify-center">
            <span className="gradient-green font-innovator mb-4 text-[26px] font-bold">
              Registration Failed
            </span>
            <p className="mb-8 text-[13px] text-white text-center">
              {error}
            </p>
          </div>
          <ButtonContainer>
            <ActionButton
              onClick={onBack}
              variant="secondary"
            >
              BACK
            </ActionButton>
            <ActionButton
              onClick={() => {
                setError(null);
                setIsRegistering(true);
                // Retry registration
                const registerAddress = async () => {
                  try {
                    if (!connected || !address) {
                      throw new Error('No wallet connected. Please connect your wallet first.');
                    }
                    
                    // Start timer for retry registration
                    const startTime = Date.now();
                    setRegistrationStartTime(startTime);
                    setElapsedSeconds(0);
                    
                    // Start timer interval to update elapsed seconds every second
                    timerIntervalRef.current = setInterval(() => {
                      const elapsed = Math.floor((Date.now() - startTime) / 1000);
                      setElapsedSeconds(elapsed);
                      console.log(`Registration retry in progress: ${elapsed} seconds elapsed`);
                    }, 1000);
                    
                    // Use the same endpoint logic for retry
                    const endpoint = computedHash ? '/api/rust/register-address-kya' : '/api/rust/verify';
                    const requestBody = computedHash 
                      ? { address: address, kya_hash: computedHash }
                      : { address: address };
                      
                    const response = await fetch(endpoint, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(requestBody)
                    });
                    const result = await response.json();
                    if (result.success) {
                      // Parse the transaction ID from the response
                      let txId = result.transactionId || result.transaction_id;
                      if (typeof txId === 'string' && txId.startsWith('{')) {
                        try {
                          const parsed = JSON.parse(txId);
                          txId = parsed.id || txId;
                        } catch (e) {
                          // If parsing fails, use the original value
                        }
                      }
                      setTransactionId(txId);
                      
                        // Stop timer for retry
                        if (timerIntervalRef.current) {
                          clearInterval(timerIntervalRef.current);
                          timerIntervalRef.current = null;
                        }
                      const finalElapsed = Math.floor((Date.now() - startTime) / 1000);
                      console.log(`✅ Registration retry completed successfully in ${finalElapsed} seconds`);
                      
                      setIsRegistering(false);
                    } else {
                      throw new Error(result.error || 'Failed to register address');
                    }
                  } catch (err) {
                    // Stop timer for retry error
                    if (timerIntervalRef.current) {
                      clearInterval(timerIntervalRef.current);
                      timerIntervalRef.current = null;
                    }
                    const finalElapsed = Math.floor((Date.now() - startTime) / 1000);
                    console.log(`❌ Registration retry failed after ${finalElapsed} seconds:`, err.message);
                    
                    setError(err.message);
                    setIsRegistering(false);
                  }
                };
                registerAddress();
              }}
              variant="primary"
            >
              RETRY
            </ActionButton>
          </ButtonContainer>
        </div>
      </div>
    );
  }

  if (!isRegistering && !error && transactionId) {
    return (
      <div className="bg-constellation relative flex h-svh flex-col overflow-hidden text-white">
        <div className="relative z-10 flex flex-1 flex-col items-center justify-between px-6">
          <div className="flex flex-1 flex-col items-center justify-center">
            <span className="gradient-green font-innovator mb-4 text-[26px] font-bold">
              Registration Successful
            </span>
            <p className="mb-8 text-[13px] text-white text-center">
              YOUR WALLET ADDRESS HAS BEEN SUCCESSFULLY REGISTERED
            </p>
            
            <div className="mb-4">
              <div className="flex items-center justify-center">
                <Check className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="mb-4 max-w-md rounded-lg bg-black bg-opacity-20 p-4">
              <div className="mb-2 text-xs text-gray-300">Transaction ID:</div>
              <div className="break-all font-mono text-xs text-white">
                {transactionId}
              </div>
            </div>
          </div>
          <ButtonContainer>
            <ActionButton
              onClick={() => onSuccess && onSuccess()}
              variant="primary"
            >
              CONTINUE
            </ActionButton>
            <ActionButton
              onClick={() => window.open(`https://testnet.explorer.provable.com/transaction/${transactionId}`, '_blank')}
              variant="primary"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              VIEW IN BLOCK EXPLORER
            </ActionButton>
          </ButtonContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-constellation relative flex h-svh flex-col overflow-hidden text-white">
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        <div className="mx-auto max-w-md pt-20 text-center">
          <span className="font-innovator gradient-white mb-4 inline-block w-full text-[26px] font-bold">
            Registering Address...
          </span>
          <span className="block w-full text-center text-[13px] text-gray-400">
            {verificationTypeConfig[verificationType]}
          </span>
        </div>
      </div>

      <div className="relative z-10 space-y-2 px-6 pb-5 text-center text-[10px] text-gray-500 sm:pb-15">
        <div className="mb-4">
          <span className="text-white">
            {getProgressText()}
          </span>
        </div>
        <div
          style={{
            backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(appVersionFooter)}")`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            width: "337px",
            height: "102px",
            // center the div
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            margin: "0 auto",
          }}
        ></div>
      </div>
    </div>
  );
};

export const ButtonContainer = ({ children }) => {
  return (
    <div className="mb-5 flex flex-col items-center justify-center gap-4 sm:mb-15">
      {children}
    </div>
  );
};
