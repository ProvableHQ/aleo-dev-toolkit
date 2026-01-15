import { Network } from '@provablehq/aleo-types';
import { PROVABLE_API_CANARY, PROVABLE_API_MAINNET, PROVABLE_API_TESTNET } from '../constants';

export const getAPIEndpoint = (network: Network): string => {
  switch (network) {
    case Network.MAINNET:
      return PROVABLE_API_MAINNET;
    case Network.TESTNET:
      return PROVABLE_API_TESTNET;
    case Network.CANARY:
      return PROVABLE_API_CANARY;
    default:
      return PROVABLE_API_TESTNET;
  }
};
