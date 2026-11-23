import { useLayoutEffect, useState } from 'react';
import { Network } from '@provablehq/aleo-types';
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';

/** Cancel old connection work before the browser can act on a changed wallet. */
export function useHyperlaneConnection(): AbortSignal | undefined {
  const { wallet, address, connected, network, supportsAddressEncoding, algorithmsSupported } =
    useWallet();
  const adapter = wallet?.adapter;
  const [connection, setConnection] = useState<AbortSignal>();
  const eligible = connected && network === Network.TESTNET && supportsAddressEncoding;
  useLayoutEffect(() => {
    // Invalidate before paint; creating here also handles StrictMode's cleanup/setup.
    const controller = new AbortController();
    setConnection(undefined);
    if (eligible)
      void algorithmsSupported().then(
        supported => {
          if (
            !controller.signal.aborted &&
            ['route-bound-commitment-secret', 'program-freezelist-exclusion-proof'].every(name =>
              supported.includes(name),
            )
          )
            setConnection(controller.signal);
        },
        () => {
          /* Failed capability checks leave this connection unavailable. */
        },
      );
    return () => controller.abort();
  }, [adapter, address, network, eligible, algorithmsSupported]);
  return eligible && connection && !connection.aborted ? connection : undefined;
}
