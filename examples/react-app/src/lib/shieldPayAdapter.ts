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

export type ShieldExperimentalApi = {
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
  openRecoveryFlow?(chain: string, index: number): Promise<string>;
};

export type ExtendedShieldWallet = ShieldWallet & {
  experimental?: ShieldExperimentalApi;
};

interface ExtendedShieldWindow extends Window {
  shield?: ExtendedShieldWallet;
}

function getExtendedShieldWallet(): ExtendedShieldWallet | undefined {
  return (window as ExtendedShieldWindow).shield;
}

function getShieldExperimentalApi(): ShieldExperimentalApi | undefined {
  return getExtendedShieldWallet()?.experimental;
}

export class ShieldPayAdapter extends ShieldWalletAdapter {
  deriveAddresses(
    index: number,
    chains: string[] = [...DEFAULT_DERIVE_CHAINS],
  ): Promise<DerivedAddresses> {
    const experimental = getShieldExperimentalApi();
    if (!experimental?.deriveAddresses) {
      return Promise.reject(new Error('Shield Pay: experimental.deriveAddresses is not available'));
    }
    return experimental.deriveAddresses(index, chains);
  }

  executeTransactionOnDerivedAccount(
    index: number,
    transaction: TransactionOptions,
  ): Promise<ShieldPayExecutedTransaction> {
    const experimental = getShieldExperimentalApi();
    const network = this.network;
    if (!network) {
      return Promise.reject(new Error('Shield Pay: network is not available'));
    }
    if (!experimental?.executeTransactionOnDerivedAccount) {
      return Promise.reject(
        new Error('Shield Pay: experimental.executeTransactionOnDerivedAccount is not available'),
      );
    }
    return experimental.executeTransactionOnDerivedAccount(index, {
      ...transaction,
      network,
    });
  }

  executeEvmTransaction(
    chain: EvmChain,
    index: number,
    transaction: EvmTransactionParams,
  ): Promise<ExecutedEvmTransaction> {
    const experimental = getShieldExperimentalApi();
    if (!experimental?.executeEvmTransaction) {
      return Promise.reject(
        new Error('Shield Pay: experimental.executeEvmTransaction is not available'),
      );
    }
    return experimental.executeEvmTransaction(chain, index, transaction);
  }
}

export function isShieldPayAdapter(adapter: unknown): adapter is ShieldPayAdapter {
  return adapter instanceof ShieldPayAdapter;
}
