import { atomWithStorage } from 'jotai/utils';
import { Network } from '@provablehq/aleo-types';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';

/**
 * Adapter default values
 */
export const networkAtom = atomWithStorage<Network>('network', Network.TESTNET3);
export const decryptPermissionAtom = atomWithStorage<DecryptPermission>(
  'decryptPermission',
  DecryptPermission.UponRequest,
);
export const autoConnectAtom = atomWithStorage<boolean>('autoConnect', true);
export const programsAtom = atomWithStorage<string[]>('programs', [
  'credits.aleo',
  'hello_world.aleo',
]);

/**
 * UI state
 */
export const useDynamicInputsAtom = atomWithStorage<boolean>('useDynamicInputs', true);
