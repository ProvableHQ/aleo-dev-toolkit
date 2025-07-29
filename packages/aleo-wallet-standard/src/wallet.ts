import { AleoChain } from './chains';
import {
  AccountsFeature,
  ChainFeature,
  ConnectFeature,
  ExecuteFeature,
  SignFeature,
  SwitchNetworkFeature,
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
   * The switch network feature
   */
  [WalletFeatureName.SWITCH_NETWORK]?: SwitchNetworkFeature;

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
  SWITCH_NETWORK = 'standard:switch-network',
}

/**
 * A wallet's readiness describes a series of states that the wallet can be in,
 * depending on what kind of wallet it is. An installable wallet (eg. a browser
 * extension like Puzzle wallet) might be `Installed` if we've found the Puzzle API
 * in the global scope, or `NotDetected` otherwise. A loadable, zero-install
 * runtime (eg. Torus Wallet) might simply signal that it's `Loadable`. Use this
 * metadata to personalize the wallet list for each user (eg. to show their
 * installed wallets first).
 */
export enum WalletReadyState {
  /**
   * User-installable wallets can typically be detected by scanning for an API
   * that they've injected into the global context. If such an API is present,
   * we consider the wallet to have been installed.
   */
  INSTALLED = 'Installed',
  NOT_DETECTED = 'NotDetected',
  /**
   * Loadable wallets are always available to you. Since you can load them at
   * any time, it's meaningless to say that they have been detected.
   */
  LOADABLE = 'Loadable',
  /**
   * If a wallet is not supported on a given platform (eg. server-rendering, or
   * mobile) then it will stay in the `Unsupported` state.
   */
  UNSUPPORTED = 'Unsupported',
}

export type WalletName<T extends string = string> = T & { __brand__: 'WalletName' };
