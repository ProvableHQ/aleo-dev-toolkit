import { atom } from 'jotai';
import { Network } from '@provablehq/aleo-types';
import type { AlgorithmGrant, RecordAccessGrant } from '@provablehq/aleo-wallet-adapter-core';

// This app's provider settings are isolated from the generic adapter example.
export const networkAtom = atom(Network.TESTNET);
export const programsAtom = atom<string[]>([]);
export const algorithmsAllowedAtom = atom<AlgorithmGrant[] | undefined>(undefined);
export const recordAccessAtom = atom<RecordAccessGrant | undefined>(undefined);
export const readAddressAtom = atom<boolean | undefined>(undefined);
