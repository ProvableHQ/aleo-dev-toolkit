import { atomWithStorage } from 'jotai/utils';
import { Network } from '@provablehq/aleo-types';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';

/**
 * Adapter default values
 */
export const networkAtom = atomWithStorage('network', Network.TESTNET3);
export const decryptPermissionAtom = atomWithStorage(
  'decryptPermission',
  DecryptPermission.UponRequest,
);
export const autoConnectAtom = atomWithStorage('autoConnect', true);
export const programsAtom = atomWithStorage('programs', [
  'credits.aleo',
  'hello_world.aleo',
]);