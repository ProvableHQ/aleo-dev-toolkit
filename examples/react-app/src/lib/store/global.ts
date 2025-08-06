import { atomWithStorage } from 'jotai/utils';
import { Network } from '@provablehq/aleo-types';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';

export const networkAtom = atomWithStorage<Network>('network', Network.TESTNET3);
export const decryptPermissionAtom = atomWithStorage<DecryptPermission>(
  'decryptPermission',
  DecryptPermission.NoDecrypt,
);
export const autoConnectAtom = atomWithStorage<boolean>('autoConnect', true);
export const programsAtom = atomWithStorage<string[]>('programs', [
  'credits.aleo',
  'hello_world.aleo',
]);
