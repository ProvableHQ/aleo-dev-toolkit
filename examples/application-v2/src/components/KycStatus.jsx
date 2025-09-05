import SumsubWebSdk from "@sumsub/websdk-react";
import MockSumsubSDK from "./MockSumsubSDK";

// Development mode flag - set to false for production
const USE_MOCK_SDK = false;

const KycStatus = ({
  status,
  kycVerificationStatus,
  isLoading,
  onStartKyc,
  accessToken,
  onTokenExpiration,
  onMessage,
  onError,
}) => {
  if (!accessToken && status === "not_started" && kycVerificationStatus === "unverified") {
    // Initial state when KYC has not been started and KYC is unverified
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-semibold text-white mb-4">
          Start Your KYC Verification
        </h2>
        <p className="text-gray-400 mb-6">
          Complete the verification process to continue
        </p>
        <button
          onClick={onStartKyc}
          disabled={isLoading}
          className="inline-flex items-center px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-black"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Starting KYC...
            </>
          ) : (
            "Start KYC Process"
          )}
        </button>
      </div>
    );
  }

  if (accessToken && status !== "completed") {
    if (USE_MOCK_SDK) {
      return (
        <MockSumsubSDK
          onMessage={onMessage}
          onError={onError}
        />
      );
    }

    return (
      <div className="h-full border border-gray-600 rounded-lg overflow-hidden">
        <SumsubWebSdk
          accessToken={accessToken}
          expirationHandler={onTokenExpiration}
          config={{
            lang: "en",
            email: "",
            phone: "",
          }}
          options={{
            addViewportTag: false,
            adaptIframeHeight: true,
          }}
          onMessage={onMessage}
          onError={onError}
        />
      </div>
    );
  }

  if (status === "completed" && kycVerificationStatus === "updating") {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700 mb-4">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            ></path>
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-white mb-2">
          Verification Completed!
        </h2>
        <p className="text-gray-400">
          Your KYC verification has been successfully completed. Processing...
        </p>
      </div>
    );
  }

  if (status === "completed" && kycVerificationStatus === "verified") {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-600 mb-4">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            ></path>
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-white mb-2">
          KYC Verification Successful!
        </h2>
        <p className="text-gray-400">
          Your identity has been successfully verified.
        </p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-600 mb-4">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-red-400 mb-2">
          Verification Failed
        </h2>
        <p className="text-gray-400">
          Your KYC verification could not be completed. Please try again.
        </p>
      </div>
    );
  }

  return null;
};

export default KycStatus;