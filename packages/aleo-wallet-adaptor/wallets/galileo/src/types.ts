import { Network } from '@provablehq/aleo-types';

export interface GalileoWalletAdapterConfig {}

export interface GalileoWallet {
  publicKey?: string;
  connect(network: Network): Promise<{ address: string }>;
  disconnect(): Promise<void>;
}

export interface GalileoWindow extends Window {
  galileo?: GalileoWallet;
}
