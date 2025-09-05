import { useState } from "react";
import LoadingScreen from "@/components/loading-screen";
import MainScreen from "@/components/main-screen";
import FaceVerificationScreen from "@/components/face-verification-screen";
import PassportVerificationScreen from "@/components/passport-verification-screen";
import KycVerificationScreen from "@/components/KycVerificationScreen";
import OptionsScreen from "@/components/options-screen";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState("loading");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [importedModelData, setImportedModelData] = useState(null);
  const [, setLoadedResources] = useState(null);

  const handleLoadingComplete = (resources) => {
    setLoadedResources(resources);
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentScreen("main");
      setIsTransitioning(false);
    }, 300);
  };

  const handleVerificationChoice = (type) => {
    setIsTransitioning(true);
    setTimeout(() => {
      if (type === "passport") {
        setCurrentScreen("passport-verification");
      } else {
        setCurrentScreen("face-verification");
      }
      setIsTransitioning(false);
    }, 300);
  };

  const handleModelImport = (modelData) => {
    setImportedModelData(modelData);
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentScreen("face-verification");
      setIsTransitioning(false);
    }, 300);
  };

  const handleBack = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentScreen("main");
      setImportedModelData(null); // Clear imported model data when going back
      setIsTransitioning(false);
    }, 300);
  };

  const handleOptionsClick = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentScreen("options");
      setIsTransitioning(false);
    }, 300);
  };

  const handleKycStart = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentScreen("kyc-verification");
      setIsTransitioning(false);
    }, 300);
  };

  const handleKycSuccess = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentScreen("main");
      setIsTransitioning(false);
    }, 300);
  };

  return (
    <div className="h-dvh text-white">
      <div
        className={`transition-opacity duration-300 ${
          isTransitioning ? "opacity-0" : "opacity-100"
        }`}
      >
        {currentScreen === "loading" && (
          <LoadingScreen onLoadingComplete={handleLoadingComplete} />
        )}
        {currentScreen === "main" && (
          <MainScreen
            onVerificationChoice={handleVerificationChoice}
            onOptionsClick={handleOptionsClick}
            onModelImport={handleModelImport}
          />
        )}
        {currentScreen === "face-verification" && (
          <FaceVerificationScreen
            onBack={handleBack}
            importedModelData={importedModelData}
          />
        )}
        {currentScreen === "passport-verification" && (
          <PassportVerificationScreen
            onBack={handleBack}
            onKycStart={handleKycStart}
          />
        )}
        {currentScreen === "kyc-verification" && (
          <KycVerificationScreen
            onBack={handleBack}
            onSuccess={handleKycSuccess}
          />
        )}
        {currentScreen === "options" && <OptionsScreen onBack={handleBack} />}
      </div>
    </div>
  );
}
