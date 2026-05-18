import {
  ShieldWalletAdapter,
  ShieldWallet,
  ShieldTransaction,
} from '@provablehq/aleo-wallet-adaptor-shield';
import { TransactionOptions } from '@provablehq/aleo-types';

export type ShieldPayExecutedTransaction = {
  transactionId: string;
};

export type ExtendedShieldWallet = ShieldWallet & {
  deriveEvmAddress(index: number): Promise<string>;
  deriveAleoAddress(index: number): Promise<string>;
  executeTransactionOnDerivedAccount(
    index: number,
    transaction: ShieldTransaction,
  ): Promise<ShieldPayExecutedTransaction>;
  signEvmTransaction?(chain: string, index: number, tx: string): Promise<string>;
  openRecoveryFlow?(chain: string, index: number): Promise<string>;
};

interface ExtendedShieldWindow extends Window {
  shield?: ExtendedShieldWallet;
}

function getExtendedShieldWallet(): ExtendedShieldWallet | undefined {
  return (window as ExtendedShieldWindow).shield;
}

export class ShieldPayAdapter extends ShieldWalletAdapter {
  deriveEvmAddress(index: number): Promise<string> {
    const shield = getExtendedShieldWallet();
    if (!shield?.deriveEvmAddress) {
      return Promise.reject(new Error('Shield Pay: deriveEvmAddress is not available'));
    }
    return shield.deriveEvmAddress(index);
  }

  deriveAleoAddress(index: number): Promise<string> {
    const shield = getExtendedShieldWallet();
    if (!shield?.deriveAleoAddress) {
      return Promise.reject(new Error('Shield Pay: deriveAleoAddress is not available'));
    }
    return shield.deriveAleoAddress(index);
  }

  executeTransactionOnDerivedAccount(
    index: number,
    transaction: TransactionOptions,
  ): Promise<ShieldPayExecutedTransaction> {
    const shield = getExtendedShieldWallet();
    const network = this.network;
    if (!network) {
      return Promise.reject(new Error('Shield Pay: network is not available'));
    }
    if (!shield?.executeTransactionOnDerivedAccount) {
      return Promise.reject(
        new Error('Shield Pay: executeTransactionOnDerivedAccount is not available'),
      );
    }
    return shield.executeTransactionOnDerivedAccount(index, {
      ...transaction,
      network,
    });
  }
}

export function isShieldPayAdapter(adapter: unknown): adapter is ShieldPayAdapter {
  return adapter instanceof ShieldPayAdapter;
}
