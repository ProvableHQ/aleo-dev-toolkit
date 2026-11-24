import type { HyperlaneConnection } from '@/lib/hyperlaneConnection';
import { useLayoutEffect, useState } from 'react';
import { Network } from '@provablehq/aleo-types';
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';

/** Cancel old connection work before the browser can act on a changed wallet. */
export function useHyperlaneConnection(): HyperlaneConnection | undefined {
  const { wallet, address, connected, network, supportsAddressEncoding, algorithmsSupported } =
    useWallet();
  const adapter = wallet?.adapter;
  const [connection, setConnection] = useState<HyperlaneConnection>();
  const eligible = connected && network === Network.TESTNET && supportsAddressEncoding;
  useLayoutEffect(() => {
    // Invalidate before paint; creating here also handles StrictMode's cleanup/setup.
    let current = true;
    const session: HyperlaneConnection = { isCurrent: () => current };
    setConnection(undefined);
    if (eligible)
      void algorithmsSupported().then(
        supported => {
          if (
            session.isCurrent() &&
            ['route-bound-commitment-secret', 'program-freezelist-exclusion-proof'].every(name =>
              supported.includes(name),
            )
          )
            setConnection(session);
        },
        () => {
          /* Failed capability checks leave this connection unavailable. */
        },
      );
    return () => {
      current = false;
    };
  }, [adapter, address, network, eligible, algorithmsSupported]);
  return eligible && connection && connection.isCurrent() ? connection : undefined;
}
