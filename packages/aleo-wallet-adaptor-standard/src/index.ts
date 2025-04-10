// Chain identifiers (extendable for multiple chains)
export type ChainId = string;

export const ALEO_TESTNET_CHAIN: ChainId = 'aleo:testnet';
export const ALEO_CHAINS: readonly ChainId[] = [ALEO_TESTNET_CHAIN];
// (Additional chain IDs like ALEO_MAINNET_CHAIN can be added in the future)

// Account type representing a blockchain account (address on a specific chain)
export interface WalletAccount {
  chain: ChainId;
  address: string;
}

// Standard wallet features interfaces
export interface ConnectFeature {
  connect(): Promise<readonly WalletAccount[]>;
}

export interface DisconnectFeature {
  disconnect(): Promise<void> | void;
}

// Aggregated features a wallet may support. 
// 'standard:connect' is required for all wallets; 'standard:disconnect' is optional.
export type WalletFeatures = {
  'standard:connect': ConnectFeature;
  'standard:disconnect'?: DisconnectFeature;
  // Future feature interfaces (e.g., sign transactions/messages) can be added here.
};

// Wallet interface that all Aleo wallet adaptors should implement.
export interface Wallet {
  name: string;
  icon?: string;
  chains: readonly ChainId[];
  features: WalletFeatures;
  accounts: readonly WalletAccount[];
}
