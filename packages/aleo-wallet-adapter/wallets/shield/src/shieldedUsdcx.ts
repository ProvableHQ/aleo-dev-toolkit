import type {
  PreparedShieldedUsdcxMint,
  ShieldedUsdcxMintPreparation,
} from '@provablehq/aleo-types';

export const SHIELDED_USDCX_MINT_FEATURE = 'shield:prepare-shielded-usdcx-mint';

/** Copy only public fields; extra provider fields must never escape preparation. */
export function shieldedUsdcxMintPreparation(
  response: PreparedShieldedUsdcxMint,
  requestId: string,
): ShieldedUsdcxMintPreparation {
  return {
    requestId,
    mintId: response.mintId,
    commitmentHex: response.commitmentHex,
    sourceChain: response.sourceChain,
    chainId: response.chainId,
    xReserve: response.xReserve,
    deposit: {
      amount: response.deposit.amount,
      maxFee: response.deposit.maxFee,
      localToken: response.deposit.localToken,
      remoteDomain: response.deposit.remoteDomain,
      remoteRecipient: response.deposit.remoteRecipient,
      hookData: response.deposit.hookData,
    },
  };
}
