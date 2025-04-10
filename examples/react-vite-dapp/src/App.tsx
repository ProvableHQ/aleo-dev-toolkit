// App.tsx
import React, {  useMemo } from 'react';
import { WalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { ConnectWalletButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { LeoWalletAdaptor } from '@provablehq/aleo-wallet-adaptor-leo';

const App: React.FC = () => {
  // Initialize the Leo wallet adapter (and any other adapters you want to support)
  const wallets = useMemo(() => [
    new LeoWalletAdaptor()  // We are using Leo Wallet Adapter for this example
  ], []);

  // const [account, setAccount] = useState<string | null>(null);

  // // Handle changes to account (this can be expanded to handle multiple wallets or accounts)
  // const handleAccountChange = (newAccount: string) => {
  //   setAccount(newAccount);
  // };

  return (
    <div>
      {/* Provide the wallet context to the application */}
      {/* <WalletProvider wallets={wallets} autoConnect={false} onAccountChange={handleAccountChange}> */}
      <WalletProvider wallets={wallets} autoConnect={false} >
        <h1>Aleo DApp Example</h1>
        {/* ConnectWalletButton handles connecting and disconnecting the wallet */}
        <ConnectWalletButton />
        
        {/* {account ? (
          <p>Connected account: <code>{account}</code></p>
        ) : (
          <p>Please connect your wallet</p>
        )} */}
         {/* Other app components can go here */}
      </WalletProvider>
    </div>
  );
};

export default App;
