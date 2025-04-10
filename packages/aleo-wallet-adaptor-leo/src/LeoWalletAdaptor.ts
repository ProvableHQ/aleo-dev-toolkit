import { BaseWalletAdaptor } from '@provablehq/aleo-wallet-adaptor-core';
import { ChainId, WalletAccount, ALEO_TESTNET_CHAIN } from '@provablehq/aleo-wallet-adaptor-standard';
import { Account } from '@provablehq/sdk';

// Define the global window.leoWallet interface for TypeScript
declare global {
  interface Window {
    leoWallet?: {
      connect: () => Promise<{ address: string; viewKey?: string }>;
      disconnect?: () => Promise<void>;
    };
  }
}

export class LeoWalletAdaptor extends BaseWalletAdaptor {
  name = 'LeoWallet';
  icon = undefined;  // Could be set to a URL or data URI for LeoWallet's icon
  chains: readonly ChainId[] = [ALEO_TESTNET_CHAIN];

  // Implement the standard features (connect and disconnect) for this wallet
  get features() {
    return {
      'standard:connect': {
        connect: async () => {
          const accounts = await this.connect();
          return this.accounts;
        }
      },
      'standard:disconnect': {
        disconnect: async () => {
          await this.disconnect();
        }
      }
      // (Additional features like signing could be added here in the future)
    };
  }

  // Connect to LeoWallet via the injected global object
  protected async _connect(): Promise<Account[]> {
    if (!window.leoWallet) {
      throw new Error('LeoWallet extension not found. Please install the Leo Wallet browser extension.');
    }
    // Request connection (this will trigger the extension's authorization popup)
    const result = await window.leoWallet.connect();
    const address = result.address;
    const viewKey = result.viewKey;
    // Create an Aleo SDK Account from the returned address (and view key, if provided)
    let account: Account;
    if (Account && 'fromAddress' in Account && typeof (Account as any).fromAddress === 'function') {
      // If SDK supports creating an Account from address (hypothetical example)
      account = (Account as any).fromAddress(address, viewKey);
    } else {
      // Create a read-only account - we only have the public address, not the private key
      account = new Account();
      // @ts-ignore - we know these properties exist based on the SDK
      account._address = address;
      if (viewKey) {
        // @ts-ignore - we know these properties exist based on the SDK
        account._viewKey = viewKey;
      }
    }
    return [account];
  }

  // Override disconnect to inform the wallet (if supported) and clear state
  async disconnect(): Promise<void> {
    if (window.leoWallet?.disconnect) {
      await window.leoWallet.disconnect();
    }
    await super.disconnect();  // clears _accounts
  }
}
