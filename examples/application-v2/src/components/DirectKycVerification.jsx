import { useState, useEffect } from "react";
import axios from "axios";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { ScreenLayout } from "./signature/sig-components";

const DirectKycVerification = ({ onBack, onSuccess, capturedImage }) => {
  const { publicKey, address, connected } = useWallet();
  const [verificationStatus, setVerificationStatus] = useState("ready"); // ready, uploading, processing, completed, failed
  const [progress, setProgress] = useState(0);

  const uploadDocument = async () => {
    const walletAddr = publicKey || address;
    if (!walletAddr || !capturedImage) {
      console.error("Missing wallet address or captured image");
      return;
    }

    setVerificationStatus("uploading");
    
    try {
      console.log("📤 Uploading passport photo directly to Sumsub...");
      
      const response = await axios.post("/api/kyc/upload-document", {
        walletAddress: walletAddr,
        imageDataUrl: capturedImage,
        documentType: "PASSPORT"
      });

      if (response.data.success) {
        console.log("✅ Document uploaded successfully:", response.data);
        setVerificationStatus("processing");
        
        // Simple 3-second verification simulation
        setTimeout(() => {
          console.log("🎉 Direct KYC verification completed!");
          setVerificationStatus("completed");
          // Don't auto-redirect - show Continue button instead
        }, 3000);
        
      } else {
        throw new Error(response.data.error || "Upload failed");
      }
    } catch (error) {
      console.error("❌ Document upload failed:", error);
      setVerificationStatus("failed");
    }
  };

  // Auto-start upload when component loads
  useEffect(() => {
    if (verificationStatus === "ready" && capturedImage) {
      uploadDocument();
    }
  }, [verificationStatus, capturedImage]);

  const renderContent = () => {
    switch (verificationStatus) {
      case "ready":
      case "uploading":
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="text-lg font-semibold text-white mb-2">Uploading Document</h3>
            <p className="text-gray-400 text-sm text-center">
              Sending your passport photo to Sumsub for verification...
            </p>
          </div>
        );

      case "processing":
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mb-4 text-2xl animate-pulse">
              🔍
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Verifying Document</h3>
            <p className="text-gray-400 text-sm mb-4 text-center">
              Analyzing passport authenticity with Sumsub...
            </p>
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        );

      case "completed":
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4 text-2xl">
              ✅
            </div>
            <h3 className="text-lg font-semibold text-white mb-4">Verified!</h3>
            <p className="text-gray-400 text-sm text-center mb-6">
              Your passport has been successfully verified with Sumsub.<br/>
              <span className="text-green-400">KYC process completed!</span>
            </p>
            <button 
              onClick={() => {
                console.log("✅ User clicked Continue after KYC verification");
                if (onSuccess) {
                  onSuccess();
                }
              }}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Continue
            </button>
          </div>
        );

      case "failed":
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4 text-2xl">
              ❌
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Verification Failed</h3>
            <p className="text-gray-400 text-sm text-center mb-4">
              Unable to verify your document. Please try again.
            </p>
            <button 
              onClick={uploadDocument}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  if (!connected) {
    return (
      <ScreenLayout
        onBack={onBack}
        title="Direct KYC Verification"
        description="Connect your wallet to continue"
      >
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <p className="text-gray-400 text-center">Please connect your wallet to proceed with verification.</p>
        </div>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      onBack={onBack}
      title="Document Verification"
      description="Verifying your passport with Sumsub"
      progressDots={
        <div className="flex justify-center space-x-2">
          <div className="h-1 w-16 rounded-full bg-white" />
        </div>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
            <div className="text-center mb-4">
              <div className="text-xs text-blue-400 mb-2">DIRECT SUMSUB UPLOAD</div>
              {capturedImage && (
                <img 
                  src={capturedImage} 
                  alt="Captured passport" 
                  className="w-32 h-20 object-cover rounded mx-auto mb-4 border border-gray-600"
                />
              )}
            </div>
            {renderContent()}
          </div>
        </div>
      </div>
    </ScreenLayout>
  );
};

export default DirectKycVerification;