import type { HyperlaneConnection } from '@/lib/hyperlaneConnection';
import { Network } from '@provablehq/aleo-types';
import { DecryptPermission } from '@provablehq/aleo-wallet-adapter-core';
import {
  HYPERLANE_GRANTS,
  HYPERLANE_PROGRAMS,
  HYPERLANE_RECORD_ACCESS,
} from './hyperlaneAleoTestnet';

// This standalone app requests its complete permissions at connection time.
// It has no unrelated page grants to merge or reconcile.
export const HYPERLANE_CONNECTION = {
  network: Network.TESTNET,
  decryptPermission: DecryptPermission.NoDecrypt,
  programs: HYPERLANE_PROGRAMS,
  algorithmsAllowed: HYPERLANE_GRANTS,
  recordAccess: HYPERLANE_RECORD_ACCESS,
  readAddress: true,
};

export function assertHyperlaneReady(connection: HyperlaneConnection | undefined): void {
  if (!connection || !connection.isCurrent())
    throw new Error(
      'Reconnect a compatible Aleo testnet wallet and approve Hyperlane permissions before continuing.',
    );
}
