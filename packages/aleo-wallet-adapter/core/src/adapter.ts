import {
  Account,
  AlgorithmArg,
  Network,
  TransactionInput,
  TransactionOptions,
  TransactionStatusResponse,
  TxHistoryResult,
} from '@provablehq/aleo-types';
import {
  AleoChain,
  ConnectOptions,
  StandardWallet,
  WalletAdapter,
  WalletFeatureName,
  WalletReadyState,
  EventEmitter,
  WalletEvents,
  WalletName,
  WalletDecryptPermission,
  AleoDeployment,
  RecordStatusFilter,
} from '@provablehq/aleo-wallet-standard';
import {
  WalletAddressWithheldError,
  WalletFeatureNotAvailableError,
  WalletInputRequestInvalidError,
  WalletNotConnectedError,
} from './errors';
import { WalletConnectionError } from './errors';

/**
 * Base class for Aleo wallet adapters
 */
export abstract class BaseAleoWalletAdapter
  extends EventEmitter<WalletEvents>
  implements WalletAdapter
{
  /**
   * The wallet name
   */
  abstract name: WalletName<string>;

  /**
   * The wallet URL
   */
  abstract url?: string;

  /**
   * The wallet icon
   */
  abstract icon?: string;

  /**
   * The wallet's ready state
   */
  abstract _readyState: WalletReadyState;
  get readyState(): WalletReadyState {
    return this._readyState;
  }
  protected set readyState(state: WalletReadyState) {
    if (state !== this._readyState) {
      this._readyState = state;
      this.emit('readyStateChange', state);
    }
  }

  /**
   * The connected account, if any
   */
  account?: Account;

  /**
   * The wallet's network
   */
  abstract network: Network;

  /**
   * The wallet's decrypt permission
   */
  abstract decryptPermission: WalletDecryptPermission;

  /**
   * The wallet's standard interface, if available
   */
  protected _wallet?: StandardWallet;

  /**
   * The supported chains
   */
  get chains(): AleoChain[] {
    return this._wallet?.features[WalletFeatureName.CHAINS]?.chains || [];
  }

  /**
   * The wallet's connected state
   */
  get connected(): boolean {
    return !!this.account;
  }

  /**
   * Tracks `options.readAddress` for adapters that go through the wallet-standard
   * feature surface. Concrete extension adapters may forward options directly to
   * the provider and let the wallet enforce the permission boundary itself.
   */
  protected _readAddress: boolean = true;

  protected assertReadAddressCompatibleWithDecryptPermission(
    decryptPermission: WalletDecryptPermission,
    options?: ConnectOptions,
  ): void {
    if (options?.readAddress === false && decryptPermission !== WalletDecryptPermission.NoDecrypt) {
      throw new WalletConnectionError(
        'readAddress: false is only valid with decryptPermission: NoDecrypt. ' +
          'Plaintext-bearing operations would leak the owner address.',
      );
    }
  }

  protected setReadAddressFromConnectOptions(options?: ConnectOptions): void {
    this._readAddress = options?.readAddress !== false;
  }

  protected resetReadAddress(): void {
    this._readAddress = true;
  }

  protected assertReadAddressAllowed(method: string): void {
    if (!this._readAddress) {
      throw new WalletAddressWithheldError(method);
    }
  }

  /**
   * Connect to the wallet
   * @param network The network to connect to
   * @param decryptPermission The decrypt permission
   * @param programs The programs to connect to
   * @param options Optional additive connect-time options
   * @returns The connected account
   */
  async connect(
    network: Network,
    decryptPermission: WalletDecryptPermission,
    programs?: string[],
    options?: ConnectOptions,
  ): Promise<Account> {
    if (!this._wallet) {
      throw new WalletConnectionError('No wallet provider found');
    }
    this.assertReadAddressCompatibleWithDecryptPermission(decryptPermission, options);
    const feature = this._wallet.features[WalletFeatureName.CONNECT];
    if (!feature || !feature.available) {
      throw new WalletFeatureNotAvailableError(WalletFeatureName.CONNECT);
    }
    try {
      const account = await feature.connect(network, decryptPermission, programs, options);
      this.account = account;
      this.setReadAddressFromConnectOptions(options);
      this.emit('connect', account);
      return account;
    } catch (err) {
      this.emit('error', err as Error);
      throw err;
    }
  }

  /**
   * Disconnect from the wallet
   */
  async disconnect(): Promise<void> {
    if (!this._wallet) return;
    const feature = this._wallet.features[WalletFeatureName.CONNECT];
    if (feature && feature.available) {
      try {
        await feature.disconnect();
      } catch (err) {
        this.emit('error', err as Error);
      }
    }
    this.account = undefined;
    this.resetReadAddress();
    this.emit('disconnect');
  }

  /**
   * Sign a message
   * @param options Transaction options
   * @returns The signed transaction
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this._wallet || !this.account) {
      throw new WalletNotConnectedError();
    }
    const feature = this._wallet.features[WalletFeatureName.SIGN];
    if (!feature || !feature.available) {
      throw new WalletFeatureNotAvailableError(WalletFeatureName.SIGN);
    }
    return feature.signMessage(message);
  }

  /**
   * Execute a transaction
   * @param options Transaction options
   * @returns The executed temporary transaction ID
   */
  async executeTransaction(options: TransactionOptions): Promise<{ transactionId: string }> {
    if (!this._wallet || !this.account) {
      throw new WalletNotConnectedError();
    }
    validateInputRequests(options.inputs);
    const feature = this._wallet.features[WalletFeatureName.EXECUTE];
    if (!feature || !feature.available) {
      throw new WalletFeatureNotAvailableError(WalletFeatureName.EXECUTE);
    }
    return feature.executeTransaction(options);
  }

  /**
   * Get transaction status
   * @param transactionId The transaction ID
   * @returns The transaction status
   */
  async transactionStatus(transactionId: string): Promise<TransactionStatusResponse> {
    if (!this._wallet || !this.account) {
      throw new WalletNotConnectedError();
    }
    const feature = this._wallet.features[WalletFeatureName.TRANSACTION_STATUS];
    if (!feature || !feature.available) {
      throw new WalletFeatureNotAvailableError(WalletFeatureName.TRANSACTION_STATUS);
    }
    return feature.transactionStatus(transactionId);
  }

  async switchNetwork(network: Network): Promise<void> {
    if (!this._wallet || !this.account) {
      throw new WalletNotConnectedError();
    }
    const feature = this._wallet.features[WalletFeatureName.SWITCH_NETWORK];
    if (!feature || !feature.available) {
      throw new WalletFeatureNotAvailableError(WalletFeatureName.SWITCH_NETWORK);
    }
    await feature.switchNetwork(network);
    this.emit('networkChange', network);
  }

  async decrypt(
    cipherText: string,
    tpk?: string,
    programId?: string,
    functionName?: string,
    index?: number,
  ): Promise<string> {
    if (!this._wallet || !this.account) {
      throw new WalletNotConnectedError();
    }
    this.assertReadAddressAllowed('decrypt');
    const feature = this._wallet.features[WalletFeatureName.DECRYPT];
    if (!feature || !feature.available) {
      throw new WalletFeatureNotAvailableError(WalletFeatureName.DECRYPT);
    }
    return feature.decrypt(cipherText, tpk, programId, functionName, index);
  }

  async requestRecords(
    program: string,
    includePlaintext: boolean,
    statusFilter?: RecordStatusFilter,
  ): Promise<unknown[]> {
    if (!this._wallet || !this.account) {
      throw new WalletNotConnectedError();
    }
    this.assertReadAddressAllowed('requestRecords');
    const feature = this._wallet.features[WalletFeatureName.REQUEST_RECORDS];
    if (!feature || !feature.available) {
      throw new WalletFeatureNotAvailableError(WalletFeatureName.REQUEST_RECORDS);
    }

    return feature.requestRecords(program, includePlaintext, statusFilter);
  }

  async executeDeployment(deployment: AleoDeployment): Promise<{ transactionId: string }> {
    if (!this._wallet || !this.account) {
      throw new WalletNotConnectedError();
    }
    const feature = this._wallet.features[WalletFeatureName.EXECUTE_DEPLOYMENT];
    if (!feature || !feature.available) {
      throw new WalletFeatureNotAvailableError(WalletFeatureName.EXECUTE_DEPLOYMENT);
    }
    return feature.executeDeployment(deployment);
  }

  async transitionViewKeys(transactionId: string): Promise<string[]> {
    if (!this._wallet || !this.account) {
      throw new WalletNotConnectedError();
    }
    this.assertReadAddressAllowed('transitionViewKeys');
    const feature = this._wallet.features[WalletFeatureName.TRANSITION_VIEWKEYS];
    if (!feature || !feature.available) {
      throw new WalletFeatureNotAvailableError(WalletFeatureName.TRANSITION_VIEWKEYS);
    }
    return feature.transitionViewKeys(transactionId);
  }

  async requestTransactionHistory(program: string): Promise<TxHistoryResult> {
    if (!this._wallet || !this.account) {
      throw new WalletNotConnectedError();
    }
    this.assertReadAddressAllowed('requestTransactionHistory');
    const feature = this._wallet.features[WalletFeatureName.REQUEST_TRANSACTION_HISTORY];
    if (!feature || !feature.available) {
      throw new WalletFeatureNotAvailableError(WalletFeatureName.REQUEST_TRANSACTION_HISTORY);
    }
    return feature.requestTransactionHistory(program);
  }

  /**
   * Return the algorithm names this wallet implements for `type: "derived"`
   * InputRequests. A dapp calls this before connect to learn which entries
   * are valid in `ConnectOptions.algorithmsAllowed`. Wallets that do not
   * support derived inputs at all should return `[]`.
   *
   * Override in adapters that support derived inputs.
   */
  async algorithmsSupported(): Promise<string[]> {
    return [];
  }
}

export function scopePollingDetectionStrategy(detect: () => boolean): void {
  // Early return when server-side rendering
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const disposers: (() => void)[] = [];

  function detectAndDispose() {
    const detected = detect();
    if (detected) {
      for (const dispose of disposers) {
        dispose();
      }
    }
  }

  // Strategy #1: Try detecting every second.
  const interval =
    // TODO: #334 Replace with idle callback strategy.
    setInterval(detectAndDispose, 1000);
  disposers.push(() => clearInterval(interval));

  // Strategy #2: Detect as soon as the DOM becomes 'ready'/'interactive'.
  if (
    // Implies that `DOMContentLoaded` has not yet fired.
    document.readyState === 'loading'
  ) {
    document.addEventListener('DOMContentLoaded', detectAndDispose, { once: true });
    disposers.push(() => document.removeEventListener('DOMContentLoaded', detectAndDispose));
  }

  // Strategy #3: Detect after the `window` has fully loaded.
  if (
    // If the `complete` state has been reached, we're too late.
    document.readyState !== 'complete'
  ) {
    window.addEventListener('load', detectAndDispose, { once: true });
    disposers.push(() => window.removeEventListener('load', detectAndDispose));
  }

  // Strategy #4: Detect synchronously, now.
  detectAndDispose();
}

export function validateInputRequests(inputs: TransactionInput[]): void {
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    if (typeof input === 'string') continue;
    if (input.type === 'record' && input.uid !== undefined && input.filters !== undefined) {
      throw new WalletInputRequestInvalidError(
        `inputs[${i}]: type "record" cannot specify both \`uid\` and \`filters\`. \`uid\` pins a specific record returned by requestRecords; filters are ignored when \`uid\` is set.`,
      );
    }
    if (input.type === 'derived') {
      if (typeof input.algorithm !== 'string' || input.algorithm.length === 0) {
        throw new WalletInputRequestInvalidError(
          `inputs[${i}]: type "derived" requires a non-empty \`algorithm\` string.`,
        );
      }
      if (input.args === null || typeof input.args !== 'object' || Array.isArray(input.args)) {
        throw new WalletInputRequestInvalidError(
          `inputs[${i}]: type "derived" requires \`args\` to be an object (Record<string, AlgorithmArg>).`,
        );
      }
      for (const [argName, arg] of Object.entries(input.args)) {
        const invalidReason = invalidAlgorithmArgReason(arg);
        if (invalidReason) {
          throw new WalletInputRequestInvalidError(
            `inputs[${i}]: args["${argName}"]${invalidReason}`,
          );
        }
      }
    }
  }
}

function invalidAlgorithmArgReason(arg: unknown): string | null {
  if (arg === null || typeof arg !== 'object') {
    return ' must be { type, value }.';
  }
  if (!hasAlgorithmArgType(arg)) {
    return '.type must be an ArgType string (a LiteralType or "string").';
  }
  if (!hasAlgorithmArgValue(arg)) {
    return '.value must be a string Aleo literal.';
  }
  return null;
}

function hasAlgorithmArgType(arg: object): arg is { type: AlgorithmArg['type'] } {
  return 'type' in arg && typeof arg.type === 'string';
}

function hasAlgorithmArgValue(arg: object): arg is AlgorithmArg {
  return 'value' in arg && typeof arg.value === 'string';
}
