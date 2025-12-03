import { useState } from 'react';
import { Button } from './ui/button';
import { Copy, Check } from 'lucide-react';

interface HookCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: 'executeTransaction' | 'signMessage' | 'decrypt' | 'requestRecords' | 'executeDeployment';
}

export function HookCodeModal({ isOpen, onClose, action }: HookCodeModalProps) {
  const [copied, setCopied] = useState(false);

  const generateCode = () => {
    switch (action) {
      case 'executeTransaction':
        return `import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

export function ExecuteTransactionComponent() {
  const { connected, executeTransaction } = useWallet();
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecuteTransaction = async () => {
    if (!connected) return;
    
    setIsExecuting(true);
    try {
      const tx = await executeTransaction({
        program: 'hello_world.aleo',
        function: 'main',
        inputs: ['1u32', '1u32'],
        fee: 100000,
      });
      console.log('Transaction ID:', tx?.id);
    } catch (error) {
      console.error('Transaction failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <button 
      onClick={handleExecuteTransaction}
      disabled={!connected || isExecuting}
    >
      {isExecuting ? 'Executing...' : 'Execute Transaction'}
    </button>
  );
}`;

      case 'signMessage':
        return `import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

export function SignMessageComponent() {
  const { connected, signMessage } = useWallet();
  const [isSigning, setIsSigning] = useState(false);

  const handleSignMessage = async () => {
    if (!connected) return;
    
    setIsSigning(true);
    try {
      const signedMessage = await signMessage('Hello, Aleo!');
      const decoder = new TextDecoder();
      const signedMessageStr = decoder.decode(signedMessage);
      console.log('Signed message:', signedMessageStr);
    } catch (error) {
      console.error('Signing failed:', error);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <button 
      onClick={handleSignMessage}
      disabled={!connected || isSigning}
    >
      {isSigning ? 'Signing...' : 'Sign Message'}
    </button>
  );
}`;

      case 'decrypt':
        return `import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

export function DecryptComponent() {
  const { connected, decrypt } = useWallet();
  const [isDecrypting, setIsDecrypting] = useState(false);

  const handleDecrypt = async () => {
    if (!connected) return;
    
    setIsDecrypting(true);
    try {
      const decryptedText = await decrypt('your_cipher_text_here');
      console.log('Decrypted data:', decryptedText);
    } catch (error) {
      console.error('Decryption failed:', error);
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <button 
      onClick={handleDecrypt}
      disabled={!connected || isDecrypting}
    >
      {isDecrypting ? 'Decrypting...' : 'Decrypt'}
    </button>
  );
}`;

      case 'requestRecords':
        return `import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

export function RequestRecordsComponent() {
  const { connected, requestRecords } = useWallet();
  const [isFetching, setIsFetching] = useState(false);

  const handleRequestRecords = async () => {
    if (!connected) return;
    
    setIsFetching(true);
    try {
      const records = await requestRecords('credits.aleo', false);
      console.log('Records:', records);
    } catch (error) {
      console.error('Failed to fetch records:', error);
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <button 
      onClick={handleRequestRecords}
      disabled={!connected || isFetching}
    >
      {isFetching ? 'Fetching...' : 'Fetch Records'}
    </button>
  );
}`;

      case 'executeDeployment':
        return `import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

export function DeployProgramComponent() {
  const { connected, executeDeployment, address } = useWallet();
  const [isDeploying, setIsDeploying] = useState(false);

  const handleDeployProgram = async () => {
    if (!connected || !address) return;
    
    setIsDeploying(true);
    try {
      const deployment = {
        program: \`program hello_world.aleo;
        
        function main(a: u32, b: u32) -> u32 {
            return a + b;
        }\`,
        address: address,
        priorityFee: 100000,
        privateFee: false,
      };
      
      const tx = await executeDeployment(deployment);
      console.log('Deployment Transaction ID:', tx?.transactionId);
    } catch (error) {
      console.error('Deployment failed:', error);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <button 
      onClick={handleDeployProgram}
      disabled={!connected || isDeploying}
    >
      {isDeploying ? 'Deploying...' : 'Deploy Program'}
    </button>
  );
}`;

      default:
        return '';
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateCode());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const getActionTitle = () => {
    switch (action) {
      case 'executeTransaction':
        return 'Execute Transaction Hook';
      case 'signMessage':
        return 'Sign Message Hook';
      case 'decrypt':
        return 'Decrypt Hook';
      case 'requestRecords':
        return 'Request Records Hook';
      case 'executeDeployment':
        return 'Execute Deployment Hook';
      default:
        return 'Hook Code';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-border">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex flex-col items-start gap-2">
            <h2 className="text-xl font-semibold text-card-foreground">{getActionTitle()}</h2>
            <span className="text-sm text-muted-foreground">
              How to use the useWallet hook for this action
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Code
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
          <div className="bg-muted rounded-lg p-4 border border-border">
            <pre className="text-sm text-muted-foreground overflow-x-auto">
              <code>{generateCode()}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
