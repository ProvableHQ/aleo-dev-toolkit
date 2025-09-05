import { useState, useEffect } from 'react';

const MockSumsubSDK = ({ onMessage, onError }) => {
  const [step, setStep] = useState('loading');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate Sumsub WebSDK loading and verification process
    const simulateVerification = async () => {
      // Step 1: Loading
      setStep('loading');
      setTimeout(() => {
        setStep('document_capture');
      }, 2000);

      // Step 2: Document Capture (simulate taking passport photo)
      setTimeout(() => {
        setStep('processing');
      }, 5000);

      // Step 3: Processing with progress
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += 20;
        setProgress(currentProgress);
        
        if (currentProgress >= 100) {
          clearInterval(progressInterval);
          setStep('completed');
          
          // Simulate successful KYC completion after processing
          setTimeout(() => {
            onMessage('idCheck.onApplicantStatusChanged', {
              reviewStatus: 'completed',
              reviewResult: {
                reviewAnswer: 'GREEN'
              }
            });
          }, 1000);
        }
      }, 800);
    };

    simulateVerification();
  }, [onMessage]);

  const renderStep = () => {
    switch (step) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="text-lg font-semibold text-white mb-2">Initializing Verification</h3>
            <p className="text-gray-400 text-sm">Loading Sumsub SDK...</p>
          </div>
        );

      case 'document_capture':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4">
              📷
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Document Verification</h3>
            <p className="text-gray-400 text-sm text-center">
              Verifying your passport document...<br/>
              <em className="text-xs text-green-400">(Using uploaded passport photo)</em>
            </p>
          </div>
        );

      case 'processing':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mb-4">
              ⚡
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Processing Verification</h3>
            <p className="text-gray-400 text-sm mb-4">Analyzing document authenticity...</p>
            <div className="w-64 bg-gray-700 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400">{progress}% complete</p>
          </div>
        );

      case 'completed':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
              ✅
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Verification Successful!</h3>
            <p className="text-gray-400 text-sm text-center">
              Your passport has been successfully verified.<br/>
              <em className="text-xs text-green-400">KYC process completed</em>
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full border border-gray-600 rounded-lg overflow-hidden bg-gray-800">
      <div className="bg-gray-700 px-4 py-2 text-xs text-gray-300 border-b border-gray-600">
        🧪 Mock Sumsub SDK - Development Mode
      </div>
      {renderStep()}
    </div>
  );
};

export default MockSumsubSDK;