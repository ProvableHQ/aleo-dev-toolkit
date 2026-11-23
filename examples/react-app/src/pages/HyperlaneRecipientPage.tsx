import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { HyperlaneRecipient } from '@/components/functions/HyperlaneRecipient';
import { CodePanel } from '@/components/CodePanel';
import { codeExamples } from '@/lib/codeExamples';

export function HyperlaneRecipientPage() {
  const { wallet, address, network, connected } = useWallet();
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="h2">Address encoding</h1>
      <p>Request a public commitment for the connected Aleo account.</p>
      {/* Reset displayed results when the connected wallet context changes. */}
      <HyperlaneRecipient key={`${wallet?.adapter.name}:${address}:${network}:${connected}`} />
      <CodePanel code={codeExamples.hyperlaneRecipient} language="tsx" />
    </div>
  );
}
