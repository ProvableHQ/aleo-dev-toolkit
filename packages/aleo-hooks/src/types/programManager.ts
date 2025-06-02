import {
  ProgramManager as TestnetProgramManager,
  // AleoNetworkClientOptions as TestnetClientOptions,
  FunctionKeyProvider as TestnetFunctionKeyProvider,
  RecordProvider as TestnetRecordProvider,
} from '@provablehq/sdk/testnet.js';

import {
  ProgramManager as MainnetProgramManager,
  // AleoNetworkClientOptions as MainnetClientOptions,
  FunctionKeyProvider as MainnetFunctionKeyProvider,
  RecordProvider as MainnetRecordProvider,
} from '@provablehq/sdk/mainnet.js';

import { Network } from './network';

// export type AleoNetworkClientOptions<N extends Network> = N extends Network.MAINNET ? MainnetClientOptions : TestnetClientOptions
export type FunctionKeyProvider<N extends Network> = N extends Network.MAINNET
  ? MainnetFunctionKeyProvider
  : TestnetFunctionKeyProvider;
export type RecordProvider<N extends Network> = N extends Network.MAINNET
  ? MainnetRecordProvider
  : TestnetRecordProvider;

export type ProgramManager<N extends Network> = N extends Network.MAINNET
  ? MainnetProgramManager
  : TestnetProgramManager;

export function newProgramManager<N extends Network>(
  network: N,
  host?: string | undefined,
  functionKeyProvider?: FunctionKeyProvider<N> | undefined,
  recordProvider?: RecordProvider<N> | undefined,
  // networkClientOptions?: AleoNetworkClientOptions<N> | undefined,
): ProgramManager<N> {
  let programManager;
  switch (network) {
    case Network.MAINNET:
      programManager = new MainnetProgramManager(
        host,
        functionKeyProvider,
        <MainnetRecordProvider | undefined>recordProvider,
      );
      break;
    case Network.TESTNET:
      programManager = new TestnetProgramManager(
        host,
        functionKeyProvider,
        <TestnetRecordProvider | undefined>recordProvider,
      );
      break;
  }
  return <ProgramManager<N>>programManager;
}
