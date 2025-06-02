import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useState } from 'react';

export default function SignMessage() {
  const { signMessage, connected } = useWallet();
  const [message, setMessage] = useState('Hello, world!');
  const [signedResult, setSignedResult] = useState<string | null>(null);

  const handleSignMessage = async () => {
    if (!connected) return;
    try {
      const signedMessage = await signMessage(message);
      // Convert Uint8Array to string
      const decoder = new TextDecoder();
      const signedMessageStr = decoder.decode(signedMessage);
      setSignedResult(signedMessageStr);
      console.log(signedMessageStr);
    } catch (error) {
      console.error('Error signing message:', error);
      setSignedResult(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 mt-10">
      <div className="flex flex-col gap-2">
        <label htmlFor="message" className="text-sm font-medium">
          Message to sign:
        </label>
        <input
          id="message"
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="px-3 py-2 border rounded-md"
          placeholder="Enter message to sign"
        />
      </div>

      <button
        onClick={handleSignMessage}
        disabled={!connected}
        className="px-4 py-2 bg-blue-500 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {connected ? 'Sign Message' : 'Connect Wallet to Sign'}
      </button>

      {signedResult && (
        <div className="mt-4 p-4 bg-gray-100 rounded-md max-w-full break-all">
          <p className="font-medium">Signed Message:</p>
          <p className="text-sm max-w-[500px] truncate">{signedResult}</p>
        </div>
      )}
    </div>
  );
}
