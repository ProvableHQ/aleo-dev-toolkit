import { atomWithStorage } from 'jotai/utils';
import { Network } from '@provablehq/aleo-types';

export const networkToken = atomWithStorage<Network>('network', Network.TESTNET3);
