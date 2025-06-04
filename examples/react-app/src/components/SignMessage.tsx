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
    <div className="sign-message">
      <div className="input-group">
        <label htmlFor="message">Message to sign:</label>
        <input
          id="message"
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Enter message to sign"
        />
      </div>

      <button onClick={handleSignMessage} disabled={!connected} className="action-button">
        {connected ? 'Sign Message' : 'Connect Wallet to Sign'}
      </button>

      {signedResult && (
        <div className="result-container">
          <p className="result-label">Signed Message:</p>
          <p className="result-value">{signedResult}</p>
        </div>
      )}
    </div>
  );
}
