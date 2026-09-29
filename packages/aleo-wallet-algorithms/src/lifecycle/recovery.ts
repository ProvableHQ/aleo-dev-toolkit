export interface RecoveryOptions {
  targetAddress: string;
  cachedCounter?: number;
  deriveAddress: (counter: number) => string | Promise<string>;
  isUsed: (address: string) => Promise<boolean>;
  maxGap?: number;
  maxCounter?: number;
}
/** Recover a counter without requiring local storage. Limits bound chain reads. */
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
    gap = (await isUsed(address)) ? 0 : gap + 1;
    if (gap >= maxGap) break;
  }
  throw new Error('Counter recovery search exhausted its limits');
}
