import { useState } from 'react';
import { useHyperlaneConnection } from '@/hooks/useHyperlaneConnection';
import { HyperlaneRecipient } from '@/components/functions/HyperlaneRecipient';
import { HyperlaneTestnetMint } from '@/components/functions/HyperlaneTestnetMint';
import { HyperlaneAleoActions } from '@/components/functions/HyperlaneAleoActions';
import { CodePanel } from '@/components/CodePanel';
import { codeExamples } from '@/lib/codeExamples';

export function HyperlaneRecipientPage() {
  const connection = useHyperlaneConnection();
  const [issued, setIssued] = useState<{ connection: AbortSignal; encoding: string }>();
  const encoding = connection && issued?.connection === connection ? issued.encoding : undefined;
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-3">
        <h1 className="h2">Hyperlane testnet ETH</h1>
        <p>
          Connect your updated Shield wallet on testnet and approve the bridge permissions, then
          request an encoding. Keep that encoding and use the same issuing wallet for the claim.
          Private burns can also use an existing private ETH record.
        </p>
        <p role="status">
          {connection
            ? 'Wallet ready for private claims and burns.'
            : 'Reconnect a compatible Shield wallet to approve the claim-secret, freeze-list proof, and private record selection grants. Deposits stay disabled until these capabilities are available.'}
        </p>
      </div>
      <HyperlaneRecipient
        connection={connection}
        onEncoding={value => {
          if (connection && !connection.aborted) setIssued({ connection, encoding: value });
        }}
      />
      <HyperlaneTestnetMint issuedRecipient={encoding} connection={connection} />
      <HyperlaneAleoActions connection={connection} issuedRecipient={encoding} mode="claim" />
      <HyperlaneAleoActions connection={connection} mode="burn" />
      <CodePanel code={codeExamples.hyperlaneRecipient} language="tsx" />
    </div>
  );
}
