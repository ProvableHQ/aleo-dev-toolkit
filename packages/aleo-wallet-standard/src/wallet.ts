import { AleoChain } from './chains';
import {
  AccountsFeature,
  ChainFeature,
  ConnectFeature,
  ExecuteFeature,
  SignFeature,
  WalletFeature,
} from './features';

/**
 * Standard Aleo wallet interface
 */
export interface StandardWallet {
  /**
   * The wallet name
   */
  name: string;

  /**
   * The wallet version
   */
  version: string;

  /**
   * The wallet icon, as a data URL
   */
  icon?: string;

  /**
   * The chains supported by the wallet
   */
  chains: AleoChain[];

  /**
   * The wallet features
   */
  features: WalletFeatures;
}

/**
 * Wallet features
 */
export interface WalletFeatures {
  /**
   * The connect feature
   */
  [WalletFeatureName.CONNECT]?: ConnectFeature;

  /**
   * The accounts feature
   */
  [WalletFeatureName.ACCOUNTS]?: AccountsFeature;

  /**
   * The sign feature
   */
  [WalletFeatureName.SIGN]?: SignFeature;

  /**
   * The execute feature
   */
  [WalletFeatureName.EXECUTE]?: ExecuteFeature;

  /**
   * The chain feature
   */
  [WalletFeatureName.CHAINS]?: ChainFeature;

  /**
   * Other features
   */
  [featureName: string]: WalletFeature | undefined;
}

/**
 * Wallet feature names
 */
export enum WalletFeatureName {
  CONNECT = 'standard:connect',
  ACCOUNTS = 'standard:accounts',
  SIGN = 'aleo:sign',
  EXECUTE = 'aleo:execute',
  CHAINS = 'standard:chains',
}

/**
 * Wallet ready state
 */
export enum WalletReadyState {
  /**
   * User needs to install the wallet
   */
  UNSUPPORTED = 'unsupported',

  /**
   * Wallet is installed but not ready to connect
   */
  NOT_READY = 'not_ready',

  /**
   * Wallet is installed and ready to connect
   */
  READY = 'ready',

  /**
   * Wallet is installed, ready, and already connected
   */
  CONNECTED = 'connected',
}
