import { atomWithStorage } from 'jotai/utils';
import { Network } from '@provablehq/aleo-types';

export const networkAtom = atomWithStorage<Network>('network', Network.TESTNET3);
