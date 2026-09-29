/**
 * Search settings for recovering an existing swap's counter.
 *
 * @property targetAddress Blinded address whose original counter is needed.
 * @property cachedCounter Optional saved counter. Checked before searching from zero.
 * @property deriveAddress Computes the blinded address for a candidate counter.
 * @property isUsed Checks whether a candidate address exists in the contract's mapping.
 * @property maxGap Maximum consecutive absent addresses before stopping. Defaults to 1,000; minimum 1.
 * @property maxCounter Highest counter to search, inclusive. Defaults to 100,000; must fit in u32.
 */
export interface RecoveryOptions {
  targetAddress: string;
  cachedCounter?: number;
  deriveAddress: (counter: number) => string | Promise<string>;
  isUsed: (address: string) => Promise<boolean>;
  maxGap?: number;
  maxCounter?: number;
}
/**
 * Finds the counter that reproduces a swap's blinded address.
 * Uses the supplied derivation and membership callbacks without storing a reservation.
 *
 * @param options Target address, optional saved counter, and search limits.
 * @returns The verified saved counter or the matching counter found by searching from zero.
 * @throws If limits are invalid, a callback fails, or the search reaches a limit without a match.
 */
export async function findCounterForAddress(options: RecoveryOptions): Promise<number> {
  const { targetAddress, deriveAddress, isUsed, cachedCounter } = options;
  const maxGap = options.maxGap ?? 1000;
  const maxCounter = options.maxCounter ?? 100000;
  if (
    !Number.isInteger(maxGap) ||
    maxGap < 1 ||
    !Number.isInteger(maxCounter) ||
    maxCounter < 0 ||
    maxCounter > 0xffff_ffff
  )
    throw new Error('Invalid recovery limits');
  // Verify the saved counter by deriving its address; storage alone is not proof of a match.
  // maxCounter bounds the scan, so a verified saved counter may exceed it.
  if (
    cachedCounter !== undefined &&
    Number.isInteger(cachedCounter) &&
    cachedCounter >= 0 &&
    cachedCounter <= 0xffff_ffff &&
    (await deriveAddress(cachedCounter)) === targetAddress
  )
    return cachedCounter;
  let gap = 0;
  for (let counter = 0; counter <= maxCounter; counter++) {
    const address = await deriveAddress(counter);
    if (address === targetAddress) return counter;
    // Used addresses reset the gap; cancelled approvals can leave unused counters between swaps.
    gap = (await isUsed(address)) ? 0 : gap + 1;
    if (gap >= maxGap) break;
  }
  throw new Error('Counter recovery search exhausted its limits');
}
