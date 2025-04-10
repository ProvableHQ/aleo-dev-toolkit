import { Account } from '@provablehq/sdk';
import { Wallet, WalletAccount, ChainId } from '@provablehq/aleo-wallet-adaptor-standard';

export abstract class BaseWalletAdaptor implements Wallet {
  abstract name: string;
  abstract icon?: string;
  abstract chains: readonly ChainId[];
  abstract get features(): Wallet['features'];

  // Internal list of connected accounts (as SDK Account instances)
  protected _accounts: Account[] = [];

  // Expose connected accounts as standard WalletAccount objects
  get accounts(): readonly WalletAccount[] {
    return this._accounts.map(acc => {
      // Convert Account to address string (handle if address is a method or property)
      let addr: unknown;
      if (acc && typeof (acc as any).address === 'function') {
        addr = (acc as any).address();          // if Account.address() method
      } else if (acc && 'address' in acc) {
        addr = (acc as any).address;            // if Account.address property
      }
      const addressStr = addr ? addr.toString() : '';
      return { chain: this.chains[0], address: addressStr };
    });
  }

  get connected(): boolean {
    return this._accounts.length > 0;
  }

  // High-level connect: calls subclass implementation then stores accounts
  async connect(): Promise<readonly WalletAccount[]> {
    if (this.connected) {
      return this.accounts;
    }
    this._accounts = await this._connect();
    return this.accounts;
  }

  // High-level disconnect: can be overridden by subclass for wallet-specific behavior
  async disconnect(): Promise<void> {
    this._accounts = [];
  }

  // Subclasses implement this to perform the actual connection logic
  protected abstract _connect(): Promise<Account[]>;
}
