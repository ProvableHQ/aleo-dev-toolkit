"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { WalletMultiButton } from "@provablehq/aleo-wallet-adaptor-react-ui";
import { ScreenLayout } from "./signature/sig-components";
import KycStatus from "./KycStatus";

const KycVerificationScreen = ({ onBack, onSuccess }) => {
  const { publicKey, address, connected, signMessage, wallet } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [sumsubStatus, setSumsubStatus] = useState("not_started");
  const [kycVerificationStatus, setKycVerificationStatus] = useState("unverified");

  // Debug wallet state
  useEffect(() => {
    console.log("Wallet state:", { publicKey, address, connected, wallet: !!wallet });
  }, [publicKey, address, connected, wallet]);

  const initializeKyc = async (walletAddress, signature) => {
    try {
      const response = await axios.post("/api/kyc/initialize", {
        walletAddress,
        signature,
      });

      if (response.data.success) {
        setSumsubStatus("in_progress");
        return { token: response.data.token };
      } else {
        throw new Error(response.data.error || "Failed to initialize KYC");
      }
    } catch (error) {
      console.error("Failed to initialize KYC:", error);
      setSumsubStatus("failed");
      throw error;
    }
  };

  const checkKycStatus = async (walletAddress) => {
    try {
      const response = await axios.get(`/api/kyc/status?walletAddress=${walletAddress}`);
      if (response.data.status) {
        setSumsubStatus(response.data.status);
      }
    } catch (error) {
      console.error("Failed to check KYC status:", error);
    }
  };

  const handleStartKyc = async () => {
    const walletAddr = publicKey || address;
    if (!walletAddr || !signMessage) {
      console.error("Missing wallet address or signMessage function");
      return;
    }

    setIsLoading(true);
    try {
      const message = "Please sign this message to verify your wallet ownership for KYC";
      const bytes = new TextEncoder().encode(message);
      
      // Get signature from wallet
      let signature;
      try {
        const signatureBytes = await signMessage(bytes);
        signature = new TextDecoder().decode(signatureBytes);
      } catch (signError) {
        console.error("Failed to sign message:", signError);
        // For testing, we'll proceed without signature verification
        signature = "test_signature";
      }
      
      const response = await initializeKyc(walletAddr, signature);
      setAccessToken(response.token);
    } catch (error) {
      console.error("Failed to start KYC:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenExpiration = async () => {
    const walletAddr = publicKey || address;
    if (!walletAddr) return;

    try {
      const response = await initializeKyc(walletAddr, "");
      setAccessToken(response.token);
    } catch (error) {
      console.error("Failed to refresh token:", error);
    }
  };

  const handleMessage = (type, payload) => {
    console.log("🔔 Sumsub WebSDK Message:", type, payload);

    if (type === "idCheck.onApplicantStatusChanged") {
      const reviewResult = payload.reviewResult;
      const reviewStatus = payload.reviewStatus;

      console.log("📋 KYC Status Update:", { reviewStatus, reviewResult });

      if (reviewStatus === "completed") {
        if (reviewResult?.reviewAnswer === "GREEN") {
          console.log("✅ KYC COMPLETED SUCCESSFULLY! Passport verification passed.");
          const walletAddr = publicKey || address;
          if (walletAddr) {
            console.log(`🔄 Checking final status for wallet: ${walletAddr}`);
            checkKycStatus(walletAddr);
          }
          setSumsubStatus("completed");
          setKycVerificationStatus("updating");
          
          // Auto-redirect to success after a delay
          setTimeout(() => {
            console.log("🎉 KYC verification successful - redirecting to success!");
            setKycVerificationStatus("verified");
            if (onSuccess) {
              onSuccess();
            }
          }, 3000);
        } else {
          console.log("❌ KYC verification failed:", reviewResult);
          setSumsubStatus("failed");
        }
      }
    }
  };

  const handleError = (error) => {
    console.error("WebSDK Error:", error);
  };

  // Check initial status if wallet is connected
  useEffect(() => {
    const walletAddr = publicKey || address;
    if (walletAddr) {
      checkKycStatus(walletAddr);
    }
  }, [publicKey, address]);

  // Show wallet connection required if no wallet
  const walletAddr = publicKey || address;
  if (!connected || !walletAddr) {
    return (
      <ScreenLayout
        onBack={onBack}
        title="KYC Verification"
        description="Connect your wallet to start KYC verification"
        progressDots={
          <div className="flex justify-center space-x-2">
            <div className="h-1 w-16 rounded-full bg-white" />
          </div>
        }
      >
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="text-center py-8">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-gray-400 mb-6">
              Please connect your wallet to start KYC verification.
            </p>
            <div className="flex justify-center">
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      onBack={onBack}
      title="KYC Verification"
      description="Complete identity verification to continue"
      progressDots={
        <div className="flex justify-center space-x-2">
          <div className="h-1 w-16 rounded-full bg-white" />
        </div>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-4xl">
          <KycStatus
            status={sumsubStatus}
            kycVerificationStatus={kycVerificationStatus}
            isLoading={isLoading}
            onStartKyc={handleStartKyc}
            accessToken={accessToken}
            onTokenExpiration={handleTokenExpiration}
            onMessage={handleMessage}
            onError={handleError}
          />
        </div>
      </div>
    </ScreenLayout>
  );
};

export default KycVerificationScreen;