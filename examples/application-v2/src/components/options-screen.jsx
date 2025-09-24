"use client";

import { ArrowLeft, Settings } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAtom } from "jotai";
import { useState, useEffect } from "react";
import kyaLogo from "../assets/kya.svg";
import {
  isDelegatedProvingAtom,
  privateKeyAtom,
  shouldBroadcastTxAtom,
  useWalletAdapterAtom,
} from "../store/atoms/settings";

export default function OptionsScreen({ onBack }) {
  const [isDelegatedProvingAtomValue, setIsDelegatedProvingAtom] = useAtom(
    isDelegatedProvingAtom
  );
  const [privateKeyAtomValue, setPrivateKeyAtom] = useAtom(privateKeyAtom);
  const [shouldBroadcastTxAtomValue, setShouldBroadcastTxAtom] = useAtom(
    shouldBroadcastTxAtom
  );
  const [useWalletAdapterAtomValue, setUseWalletAdapterAtom] = useAtom(
    useWalletAdapterAtom
  );

  // Local state for form inputs
  const [isDelegatedProving, setIsDelegatedProving] = useState(
    isDelegatedProvingAtomValue
  );
  const [privateKey, setPrivateKey] = useState(privateKeyAtomValue);
  const [shouldBroadcastTx, setShouldBroadcastTx] = useState(
    shouldBroadcastTxAtomValue
  );
  const [useWalletAdapter, setUseWalletAdapter] = useState(
    useWalletAdapterAtomValue
  );

  const [isSaving, setIsSaving] = useState(false);

  // Update local state when atoms change (e.g., on initial load)
  useEffect(() => {
    setIsDelegatedProving(isDelegatedProvingAtomValue);
    setPrivateKey(privateKeyAtomValue);
    setShouldBroadcastTx(shouldBroadcastTxAtomValue);
    setUseWalletAdapter(useWalletAdapterAtomValue);
  }, [
    isDelegatedProvingAtomValue,
    privateKeyAtomValue,
    shouldBroadcastTxAtomValue,
    useWalletAdapterAtomValue,
  ]);

  const handleSaveSettings = () => {
    setIsSaving(true);
    // Update atoms with current form values
    setIsDelegatedProvingAtom(isDelegatedProving);
    setPrivateKeyAtom(privateKey);
    setShouldBroadcastTxAtom(shouldBroadcastTx);
    setUseWalletAdapterAtom(useWalletAdapter);

    console.log("Settings saved:", {
      isDelegatedProving,
      privateKey,
      shouldBroadcastTx,
    });
    onBack();
  };

  return (
    <div className="h-dvh text-white">
      {/* Header */}
      <div className="flex items-center p-6 md:mx-auto md:max-w-4xl">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="mr-4 hover:bg-gray-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <h2 className="font-innovator text-lg font-medium">Options</h2>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 md:mx-auto md:max-w-2xl">
        <div className="space-y-8">
          {/* zPass Logo */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-wider md:text-4xl">
              <img src={kyaLogo} alt="zPass with KYA Logo" className="mx-auto h-20 w-80" />
            </h1>
          </div>

          {/* Proving Method Section */}
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <h3 className="mb-4 text-lg font-medium text-gray-200">
              Proving Method
            </h3>

            <div className="mb-4 space-y-3">
              <Label className="font-medium text-gray-300">
                Select your preferred proving method:
              </Label>

              <div className="grid grid-cols-1 gap-3">
                <Button
                  onClick={() => setIsDelegatedProving(true)}
                  variant={isDelegatedProving ? "default" : "outline"}
                  className={`h-auto justify-start p-4 text-left ${
                    isDelegatedProving
                      ? "border-blue-600 bg-[#298ff9] text-white hover:bg-blue-500"
                      : "border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  <div className="flex w-full flex-col items-start">
                    <span className="font-medium">Delegated Proving</span>
                    <span className="text-sm whitespace-normal opacity-80">
                      Proofs are generated on remote servers
                    </span>
                  </div>
                </Button>

                <Button
                  onClick={() => setIsDelegatedProving(false)}
                  variant={!isDelegatedProving ? "default" : "outline"}
                  className={`h-auto justify-start p-4 text-left ${
                    !isDelegatedProving
                      ? "border-blue-600 bg-[#298ff9] text-white hover:bg-blue-500"
                      : "border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  <div className="flex w-full flex-col items-start">
                    <span className="font-medium">Local Proving</span>
                    <span className="text-sm whitespace-normal opacity-80">
                      Proofs are generated locally on your device
                    </span>
                  </div>
                </Button>
              </div>
            </div>
          </div>

          {/* Wallet Adapter Section */}
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <h3 className="mb-4 text-lg font-medium text-gray-200">
              Wallet Integration
            </h3>

            <div className="space-y-3">
              <Label className="font-medium text-gray-300">
                Use Wallet Adapter for Proof Generation
              </Label>

              <div className="grid grid-cols-1 gap-3">
                <Button
                  onClick={() => setUseWalletAdapter(true)}
                  variant={useWalletAdapter ? "default" : "outline"}
                  className={`h-auto justify-start p-4 text-left ${
                    useWalletAdapter
                      ? "border-blue-600 bg-[#298ff9] text-white hover:bg-blue-500"
                      : "border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  <div className="flex w-full flex-col items-start">
                    <span className="font-medium">Yes - Use Wallet Adapter</span>
                    <span className="text-sm whitespace-normal opacity-80">
                      Use connected wallet for proof generation and transaction signing
                    </span>
                  </div>
                </Button>

                <Button
                  onClick={() => setUseWalletAdapter(false)}
                  variant={!useWalletAdapter ? "default" : "outline"}
                  className={`h-auto justify-start p-4 text-left ${
                    !useWalletAdapter
                      ? "border-blue-600 bg-[#298ff9] text-white hover:bg-blue-500"
                      : "border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  <div className="flex w-full flex-col items-start">
                    <span className="font-medium">No - Use Traditional Method</span>
                    <span className="text-sm whitespace-normal opacity-80">
                      Use the original proving method with private key from settings
                    </span>
                  </div>
                </Button>
              </div>
              
              <p className="text-xs text-gray-400">
                When enabled, the app will use your connected wallet for proof generation instead of the private key configured below.
              </p>
            </div>
          </div>

          {/* Private Key Section */}
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <h3 className="mb-4 text-lg font-medium text-gray-200">
              Wallet Configuration
            </h3>

            <div className="space-y-3">
              <Label
                htmlFor="private-key"
                className="font-medium text-gray-300"
              >
                Private Key
              </Label>
              <Input
                id="private-key"
                type="password"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                className="border-gray-600 text-sm text-white placeholder-gray-400 focus:border-blue-500"
                placeholder="Enter your Aleo private key"
              />
              <p className="text-xs text-gray-400">
                Your Aleo private key for signing transactions. Never share this
                key.
              </p>
            </div>
          </div>


          {/* Network Broadcast Section */}
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <h3 className="mb-4 text-lg font-medium text-gray-200">
              Network Settings
            </h3>

            <div className="space-y-3">
              <Label className="font-medium text-gray-300">
                Transaction Broadcasting
              </Label>

              <div className="grid grid-cols-1 gap-3">
                <Button
                  onClick={() => setShouldBroadcastTx(true)}
                  variant={shouldBroadcastTx ? "default" : "outline"}
                  className={`h-auto justify-start p-4 text-left ${
                    shouldBroadcastTx
                      ? "border-blue-600 bg-[#298ff9] text-white hover:bg-blue-500"
                      : "border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  <div className="flex w-full flex-col items-start">
                    <span className="font-medium">Send to Network</span>
                    <span className="text-sm whitespace-normal opacity-80">
                      Transactions will be broadcast to the Aleo network
                    </span>
                  </div>
                </Button>

                <Button
                  onClick={() => setShouldBroadcastTx(false)}
                  variant={!shouldBroadcastTx ? "default" : "outline"}
                  className={`h-auto justify-start p-4 text-left ${
                    !shouldBroadcastTx
                      ? "border-blue-600 bg-[#298ff9] text-white hover:bg-blue-500"
                      : "border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  <div className="flex w-full flex-col items-start">
                    <span className="font-medium">Local Only</span>
                    <span className="text-sm whitespace-normal opacity-80">
                      Transactions will only be generated locally (not sent to
                      network)
                    </span>
                  </div>
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                Controls whether generated transactions are broadcast to the
                Aleo network or kept local only.
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="pb-8">
            <Button
              onClick={handleSaveSettings}
              className="h-14 w-full rounded-full bg-gray-200 px-6 text-base font-medium text-gray-900 uppercase hover:bg-gray-300"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
