import { Network } from './network';

/** Public deposit preparation inputs. Amounts are decimal USDC base units. */
export interface PrepareShieldedUsdcxMintOptions {
  network: Network.MAINNET | Network.TESTNET;
  sourceChain: 'ethereum' | 'ethereum-sepolia' | 'arc' | 'arc-testnet';
  amount: string;
  maxFee: string;
  /** Optional expected EVM depositor. Omit before selecting the source account. */
  depositor?: string;
  /** Any valid Aleo recipient; omitted means the connected wallet account. */
  recipient?: string;
  /** Optional retry identity; the request factory generates one when omitted. */
  requestId?: string;
}

/** Generate once per deposit attempt and retain this ID for every retry. */
export interface PrepareShieldedUsdcxMintRequest extends PrepareShieldedUsdcxMintOptions {
  /** Required deposit retry identity, independent of the request object's reference. */
  requestId: string;
}

/** Public response from the wallet. Contains no user recipient or secret scalar. */
export interface PreparedShieldedUsdcxMint {
  mintId: string;
  commitmentHex: string;
  sourceChain: PrepareShieldedUsdcxMintOptions['sourceChain'];
  chainId: number;
  xReserve: string;
  deposit: {
    amount: string;
    maxFee: string;
    localToken: string;
    remoteDomain: number;
    remoteRecipient: string;
    hookData: string;
  };
}

/** Public adapter result, including the request's ID for retries across reloads. */
export interface ShieldedUsdcxMintPreparation extends PreparedShieldedUsdcxMint {
  requestId: string;
}
