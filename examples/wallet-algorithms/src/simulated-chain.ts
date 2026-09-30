import { scope } from './fixtures';
const key = 'wallet-algorithms-example:accepted-addresses';
/** Explicit simulation: a public-fixture membership mapping saved across reloads. */
export const chain = {
  async readMapping(program: string, mapping: string, address: string): Promise<string | null> {
    if (program !== scope.program || mapping !== 'used_blinded_addresses')
      throw new Error('Unknown simulated mapping');
    const entries = JSON.parse(localStorage.getItem(key) ?? '[]') as string[];
    return entries.includes(address) ? 'true' : null;
  },
  accept(address: string): void {
    const entries = new Set(JSON.parse(localStorage.getItem(key) ?? '[]') as string[]);
    entries.add(address);
    localStorage.setItem(key, JSON.stringify([...entries]));
  },
};
