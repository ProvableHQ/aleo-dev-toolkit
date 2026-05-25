import {
  ShieldWalletAdapter,
  ShieldWallet,
  ShieldTransaction,
} from '@provablehq/aleo-wallet-adaptor-shield';
import { TransactionOptions } from '@provablehq/aleo-types';

export type ShieldPayExecutedTransaction = {
  transactionId: string;
};

export type EvmChain = 'ethereum' | 'ethereum-sepolia' | 'base' | 'base-sepolia';

export const EVM_CHAINS: readonly EvmChain[] = [
  'ethereum',
  'ethereum-sepolia',
  'base',
  'base-sepolia',
] as const;

export type EvmTransactionParams = {
  to?: string;
  data?: string;
  value?: string | number;
  gas?: string | number;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
  chainId?: number;
  type?: 'legacy' | 'eip1559' | 'eip2930';
};

export type ExecutedEvmTransaction = {
  transactionHash: string;
};

export const DEFAULT_DERIVE_CHAINS: readonly string[] = ['aleo', 'ethereum'] as const;

export type DerivedAddresses = Record<string, string>;

export type ExtendedShieldWallet = ShieldWallet & {
  deriveAddresses(index: number, chains?: string[]): Promise<DerivedAddresses>;
  executeTransactionOnDerivedAccount(
    index: number,
    transaction: ShieldTransaction,
  ): Promise<ShieldPayExecutedTransaction>;
  executeEvmTransaction(
    chain: string,
    index: number,
    transaction: EvmTransactionParams,
  ): Promise<ExecutedEvmTransaction>;
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
  deriveAddresses(
    index: number,
    chains: string[] = [...DEFAULT_DERIVE_CHAINS],
  ): Promise<DerivedAddresses> {
    const shield = getExtendedShieldWallet();
    if (!shield?.deriveAddresses) {
      return Promise.reject(new Error('Shield Pay: deriveAddresses is not available'));
    }
    return shield.deriveAddresses(index, chains);
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

  executeEvmTransaction(
    chain: EvmChain,
    index: number,
    transaction: EvmTransactionParams,
  ): Promise<ExecutedEvmTransaction> {
    const shield = getExtendedShieldWallet();
    if (!shield?.executeEvmTransaction) {
      return Promise.reject(new Error('Shield Pay: executeEvmTransaction is not available'));
    }
    return shield.executeEvmTransaction(chain, index, transaction);
  }
}

export function isShieldPayAdapter(adapter: unknown): adapter is ShieldPayAdapter {
  return adapter instanceof ShieldPayAdapter;
}
