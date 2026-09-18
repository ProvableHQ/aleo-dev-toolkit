import type { FC, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlgorithmGrant,
  isWalletConnectable,
  WalletName,
  WalletReadyState,
  WalletAdapter,
  AleoDeployment,
  ConnectOptions,
  ConnectPairing,
  ConnectUrlContext,
  RecordAccessGrant,
  RecordStatusFilter,
} from '@provablehq/aleo-wallet-standard';
import { Network, TransactionOptions } from '@provablehq/aleo-types';
import { Wallet, WalletContext, SelectWalletOptions } from './context';
import { useLocalStorage } from './useLocalStorage';
import {
  WalletError,
  WalletConnectionCancelledError,
  WalletNotConnectedError,
  WalletNotReadyError,
  WalletNotSelectedError,
  MethodNotImplementedError,
  WalletSwitchNetworkError,
  DecryptPermission,
} from '@provablehq/aleo-wallet-adapter-core';

export interface WalletProviderProps {
  children: ReactNode;
  wallets: WalletAdapter[];
  network?: Network;
  autoConnect?: boolean;
  onError?: (error: WalletError) => void;
  localStorageKey?: string;
  decryptPermission?: DecryptPermission;
  programs?: string[];
  /**
   * Opt-in record/field narrowing on top of `programs`. Forwarded to the
   * wallet's connect call. Only honored by wallets that support it (e.g. shield).
   */
  recordAccess?: RecordAccessGrant;
  /**
   * When `false`, the dapp transacts without learning the user's address.
   * Defaults to `true`. Only valid with `decryptPermission: NoDecrypt`.
   */
  readAddress?: boolean;
  /**
   * Strict opt-in allowlist for `type: "derived"` InputRequests. Each grant
   * authorizes exactly one (algorithm, program, function, inputPosition)
   * call site. Default undefined → every derived request is refused.
   */
  algorithmsAllowed?: AlgorithmGrant[];
}

function withPairing(
  base: ConnectOptions | undefined,
  pairing: ConnectPairing | undefined,
): ConnectOptions | undefined {
  if (!pairing) return base;
  return { ...base, pairing };
}

const initialState: {
  wallet: Wallet | null;
  adapter: WalletAdapter | null;
  publicKey: string | null;
  connected: boolean;
  network: Network | null;
} = {
  wallet: null,
  adapter: null,
  publicKey: null,
  connected: false,
  network: null,
};

export const AleoWalletProvider: FC<WalletProviderProps> = ({
  children,
  wallets: adapters,
  autoConnect = false,
  network: initialNetwork = Network.TESTNET,
  onError,
  localStorageKey = 'walletName',
  decryptPermission = DecryptPermission.NoDecrypt,
  programs,
  recordAccess,
  readAddress,
  algorithmsAllowed,
}) => {
  const connectOptions = useMemo<ConnectOptions | undefined>(() => {
    if (
      recordAccess === undefined &&
      readAddress === undefined &&
      (algorithmsAllowed === undefined || algorithmsAllowed.length === 0)
    ) {
      return undefined;
    }
    return { recordAccess, readAddress, algorithmsAllowed };
  }, [recordAccess, readAddress, algorithmsAllowed]);
  const [name, setName] = useLocalStorage<WalletName | null>(localStorageKey, null);
  const [{ wallet, adapter, publicKey, connected, network }, setState] = useState(initialState);
  const readyState = adapter?.readyState || WalletReadyState.UNSUPPORTED;
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  // Pairing URL for adapters that connect to a wallet app out-of-band. Kept
  // out of `state` because it is cleared on its own schedule — the moment a
  // connect resolves, fails, or the user picks a different wallet, a stale
  // QR code is worse than none.
  const [pairingUrl, setPairingUrl] = useState<string | null>(null);
  const [pairingSameDevice, setPairingSameDevice] = useState(false);
  const [pairingIntent, setPairingIntent] = useState<ConnectPairing | undefined>();
  const [reconnecting, setReconnecting] = useState(false);
  const isConnecting = useRef(false);
  const isDisconnecting = useRef(false);
  const isReconnecting = useRef(false);
  const isUnloading = useRef(false);
  const lastAuthorizedAccount = useRef<string | null>(null);
  const adapterRef = useRef<WalletAdapter | null>(null);
  const connectingAdapterRef = useRef<WalletAdapter | null>(null);
  const pairingIntentRef = useRef<ConnectPairing | undefined>(undefined);
  adapterRef.current = adapter;
  pairingIntentRef.current = pairingIntent;

  // Wrap adapters to conform to the `Wallet` interface
  const [wallets, setWallets] = useState(() =>
    adapters.map(adapter => ({
      adapter,
      readyState: adapter.readyState,
    })),
  );

  // When the adapters change, start to listen for changes to their `readyState`
  useEffect(() => {
    // When the adapters change, wrap them to conform to the `Wallet` interface
    setWallets(wallets =>
      adapters.map((adapter, index) => {
        const wallet = wallets[index];
        // If the wallet hasn't changed, return the same instance
        return wallet && wallet.adapter === adapter && wallet.readyState === adapter.readyState
          ? wallet
          : {
              adapter: adapter,
              readyState: adapter.readyState,
            };
      }),
    );

    function handleReadyStateChange(this: WalletAdapter, readyState: WalletReadyState): void {
      setWallets(prevWallets => {
        const index = prevWallets.findIndex(({ adapter }) => adapter === this);
        if (index === -1) return prevWallets;

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const { adapter } = prevWallets[index]!;
        return [
          ...prevWallets.slice(0, index),
          { adapter, readyState },
          ...prevWallets.slice(index + 1),
        ];
      });
    }

    function handleNetworkChange(this: WalletAdapter, network: Network): void {
      setState(state => ({
        ...state,
        network,
      }));
    }

    function handleConnectUrl(this: WalletAdapter, url: string, context: ConnectUrlContext): void {
      // Attached to every remote-capable adapter from mount so a connect
      // started in a layout effect cannot emit the URL before a listener
      // exists. Ignore wallets we are not connecting through.
      if (this !== adapterRef.current && this !== connectingAdapterRef.current) return;
      setPairingUrl(url);
      setPairingSameDevice(context.sameDevice);
    }

    adapters.forEach(adapter => adapter.on('readyStateChange', handleReadyStateChange, adapter));
    adapters.forEach(adapter => adapter.on('networkChange', handleNetworkChange, adapter));
    adapters.forEach(adapter => {
      if (adapter.supportsRemotePairing) adapter.on('connectUrl', handleConnectUrl, adapter);
    });
    return () => {
      adapters.forEach(adapter => adapter.off('readyStateChange', handleReadyStateChange, adapter));
      adapters.forEach(adapter => adapter.off('networkChange', handleNetworkChange, adapter));
      adapters.forEach(adapter => {
        if (adapter.supportsRemotePairing) adapter.off('connectUrl', handleConnectUrl, adapter);
      });
    };
  }, [adapters]);

  // When the selected wallet changes, initialize the state
  useEffect(() => {
    const wallet = name && wallets.find(({ adapter }) => adapter.name === name);
    if (wallet) {
      setState({
        wallet,
        adapter: wallet.adapter,
        connected: wallet.adapter.connected,
        publicKey: wallet.adapter.account?.address ?? null,
        network: wallet.adapter.network ?? null,
      });
      lastAuthorizedAccount.current = wallet.adapter.account?.address ?? null;
    } else {
      setState(initialState);
      lastAuthorizedAccount.current = null;
    }
  }, [name, wallets]);

  // If the window is closing or reloading, ignore disconnect and error events from the adapter
  useEffect(() => {
    function listener() {
      isUnloading.current = true;
    }

    window.addEventListener('beforeunload', listener);
    return () => window.removeEventListener('beforeunload', listener);
  }, [isUnloading]);

  const clearPairingUrl = useCallback(() => {
    setPairingUrl(null);
    setPairingSameDevice(false);
  }, []);

  // Handle the adapter's connect event
  const handleConnect = useCallback(() => {
    if (!adapter) return;
    // Pairing is done — the URL is no longer actionable.
    clearPairingUrl();
    setPairingIntent(undefined);
    setState(state => ({
      ...state,
      connected: adapter.connected,
      publicKey: adapter.account?.address ?? null,
      network: adapter.network ?? null,
    }));
    lastAuthorizedAccount.current = adapter.account?.address ?? null;
  }, [adapter, clearPairingUrl]);

  // Handle the adapter's disconnect event
  const handleDisconnect = useCallback(() => {
    // A disconnect is also how a pairing still waiting on the user is
    // cancelled, so the URL dies with it. Cleared here rather than only in
    // the adapter-change cleanup: that is a render away, and in the meantime
    // a still-set URL re-opens the modal the user has just dismissed.
    clearPairingUrl();
    setPairingIntent(undefined);
    // Clear the selected wallet unless the window is unloading
    if (!isUnloading.current) setName(null);
    lastAuthorizedAccount.current = null;
  }, [isUnloading, setName, clearPairingUrl]);

  // Disconnect the adapter from the wallet
  const disconnect = useCallback(async () => {
    if (isDisconnecting.current) return;
    if (!adapter) return setName(null);

    isDisconnecting.current = true;
    setDisconnecting(true);
    try {
      await adapter.disconnect();
    } catch (error: unknown) {
      // Clear the selected wallet
      setName(null);
      // Rethrow the error, and handleError will also be called
      throw error;
    } finally {
      setDisconnecting(false);
      isDisconnecting.current = false;
    }
  }, [isDisconnecting, adapter, setName]);

  // Handle the adapter's error event, and local errors
  const handleError = useCallback(
    (error: WalletError) => {
      // A failed connect leaves any pending pairing URL dead — the remote
      // wallet has already torn its relay session down.
      clearPairingUrl();
      setPairingIntent(undefined);
      // A cancel is the user getting what they asked for, not a failure —
      // reporting it puts an error in front of someone who just pressed Back.
      if (error instanceof WalletConnectionCancelledError) return error;
      // Call onError unless the window is unloading
      if (!isUnloading.current) (onError || console.error)(error);
      return error;
    },
    [isUnloading, onError, clearPairingUrl],
  );

  // Handle the adapter's account change event
  const handleAccountChange = useCallback(async () => {
    if (!adapter || isReconnecting.current) return;

    isReconnecting.current = true;
    setReconnecting(true);
    setState(state => ({
      ...state,
      publicKey: null,
      connected: false,
    }));

    try {
      const account = await adapter.connect(
        initialNetwork,
        decryptPermission,
        programs,
        connectOptions,
      );
      setState(state => ({
        ...state,
        publicKey: account.address,
        connected: adapter.connected,
        network: adapter.network ?? state.network,
      }));
      lastAuthorizedAccount.current = account.address ?? null;
    } catch (error: unknown) {
      handleError(error as WalletError);
      await disconnect();
    } finally {
      setReconnecting(false);
      isReconnecting.current = false;
    }
  }, [
    adapter,
    disconnect,
    handleError,
    initialNetwork,
    decryptPermission,
    programs,
    connectOptions,
  ]);

  // Setup and teardown event listeners when the adapter changes
  useEffect(() => {
    if (adapter) {
      adapter.on('connect', handleConnect);
      adapter.on('disconnect', handleDisconnect);
      adapter.on('error', handleError);
      adapter.on('accountChange', handleAccountChange);
      return () => {
        adapter.off('connect', handleConnect);
        adapter.off('disconnect', handleDisconnect);
        adapter.off('error', handleError);
        adapter.off('accountChange', handleAccountChange);
        // Switching wallets abandons any pairing the old one had pending.
        clearPairingUrl();
      };
    }
  }, [adapter, handleConnect, handleDisconnect, handleError, handleAccountChange, clearPairingUrl]);

  // When the adapter changes, disconnect the old one
  useEffect(() => {
    return () => {
      if (adapter && adapter.connected) {
        adapter.disconnect();
      }
    };
  }, [adapter]);

  // If autoConnect is enabled, try to connect when the adapter changes and is ready
  useEffect(() => {
    if (
      isConnecting.current ||
      isReconnecting.current ||
      connected ||
      !autoConnect ||
      !adapter ||
      !isWalletConnectable(readyState)
    )
      return;

    (async function () {
      isConnecting.current = true;
      setConnecting(true);
      try {
        const account = await adapter.connect(
          initialNetwork,
          decryptPermission,
          programs,
          connectOptions,
        );
        lastAuthorizedAccount.current = account.address ?? null;
      } catch (error: unknown) {
        // Clear the selected wallet
        setName(null);

        adapter.emit('error', error as WalletError);
      } finally {
        setConnecting(false);
        isConnecting.current = false;
      }
    })();
  }, [
    isConnecting,
    connected,
    autoConnect,
    adapter,
    readyState,
    setName,
    initialNetwork,
    decryptPermission,
    programs,
    connectOptions,
  ]);

  useEffect(() => {
    if (adapter && connected && adapter.network !== initialNetwork) {
      try {
        switchNetwork(initialNetwork);
      } catch (error: unknown) {
        console.error('Failed to switch network, disconnecting');
        disconnect();
      }
    }
  }, [initialNetwork]);

  useEffect(() => {
    if (adapter && connected) {
      disconnect();
    }
  }, [decryptPermission, programs, connectOptions]);

  // Connect the adapter to the wallet
  const connect = useCallback(async () => {
    if (isConnecting.current || isDisconnecting.current || connected) return;
    if (!adapter) throw handleError(new WalletNotSelectedError());

    if (!isWalletConnectable(readyState)) {
      // Clear the selected wallet
      setName(null);

      if (typeof window !== 'undefined') {
        window.open(adapter.url, '_blank');
      }

      throw handleError(new WalletNotReadyError());
    }

    isConnecting.current = true;
    setConnecting(true);
    connectingAdapterRef.current = adapter;
    try {
      const account = await adapter.connect(
        initialNetwork,
        decryptPermission,
        programs,
        withPairing(
          connectOptions,
          adapter.supportsRemotePairing ? pairingIntentRef.current : undefined,
        ),
      );
      lastAuthorizedAccount.current = account.address ?? null;
    } catch (error: unknown) {
      // Clear the selected wallet
      setName(null);
      // Rethrow the error, and handleError will also be called
      adapter.emit('error', error as WalletError);
      throw error;
    } finally {
      connectingAdapterRef.current = null;
      setConnecting(false);
      isConnecting.current = false;
    }
  }, [
    isConnecting,
    isDisconnecting,
    connected,
    adapter,
    readyState,
    handleError,
    setName,
    initialNetwork,
    decryptPermission,
    programs,
    connectOptions,
  ]);

  // Select a wallet, or deselect with `null`.
  const selectWallet = useCallback(
    (walletName: WalletName | null, options?: SelectWalletOptions) => {
      if (walletName === null) {
        // Deselecting is a cancel, and has to reach the adapter to be one.
        // The adapter-swap effect only disconnects an adapter it believes is
        // connected, and a pairing waiting on the user is not. Tear down iff
        // this connect was actually going remote — capability
        // (`supportsRemotePairing`) is not the same as this connect's decision.
        if (
          adapter &&
          !adapter.connected &&
          (adapter.willPairRemotely || pairingIntentRef.current === 'remote')
        ) {
          adapter.disconnect().catch(() => undefined);
        }
        setPairingIntent(undefined);
        setName(null);
        return;
      }
      setPairingIntent(options?.pairing);
      setName(walletName);
    },
    [adapter, setName],
  );

  const executeTransaction = useCallback(
    async (transaction: TransactionOptions) => {
      if (!connected) throw handleError(new WalletNotConnectedError());
      if (!adapter || !('executeTransaction' in adapter))
        throw handleError(new MethodNotImplementedError('executeTransaction'));

      await checkNetwork();

      return await adapter.executeTransaction(transaction);
    },
    [adapter, handleError, connected],
  );

  const transactionStatus = useCallback(
    async (transactionId: string) => {
      if (!connected) throw handleError(new WalletNotConnectedError());
      if (!adapter || !('transactionStatus' in adapter))
        throw handleError(new MethodNotImplementedError('transactionStatus'));

      return await adapter.transactionStatus(transactionId);
    },
    [adapter, handleError, connected],
  );

  // Sign an arbitrary message if the wallet supports it
  const signMessage = useMemo(
    () =>
      async (message: Uint8Array | string): Promise<Uint8Array | undefined> => {
        if (!connected) throw handleError(new WalletNotConnectedError());
        if (!adapter || !('signMessage' in adapter))
          throw handleError(new MethodNotImplementedError('signMessage'));

        return await adapter.signMessage(
          typeof message === 'string' ? new TextEncoder().encode(message) : message,
        );
      },
    [adapter, handleError, connected],
  );

  const switchNetwork = useCallback(
    async (network: Network) => {
      if (!connected) throw handleError(new WalletNotConnectedError());
      if (!adapter || !('switchNetwork' in adapter))
        throw handleError(new MethodNotImplementedError('switchNetwork'));
      let switched = false;
      try {
        isConnecting.current = true;
        setConnecting(true);
        await adapter.switchNetwork(network);
        switched = true;
      } catch (error: unknown) {
        if (error instanceof MethodNotImplementedError) {
          await disconnect();
        }

        console.error('Failed to switch network');
      } finally {
        isConnecting.current = false;
        setConnecting(false);
      }
      return switched;
    },
    [adapter, handleError, connected],
  );

  const decrypt = useCallback(
    async (cipherText: string) => {
      if (!connected) throw handleError(new WalletNotConnectedError());
      if (!adapter || !('decrypt' in adapter))
        throw handleError(new MethodNotImplementedError('decrypt'));

      return await adapter.decrypt(cipherText);
    },
    [adapter, handleError, connected],
  );

  const requestRecords = useCallback(
    async (program: string, includePlaintext?: boolean, statusFilter?: RecordStatusFilter) => {
      if (!connected) throw handleError(new WalletNotConnectedError());
      if (!adapter || !('requestRecords' in adapter))
        throw handleError(new MethodNotImplementedError('requestRecords'));

      return await adapter.requestRecords(program, includePlaintext, statusFilter);
    },
    [adapter, handleError, connected],
  );

  const executeDeployment = useCallback(
    async (deployment: AleoDeployment) => {
      if (!connected) throw handleError(new WalletNotConnectedError());
      if (!adapter || !('executeDeployment' in adapter))
        throw handleError(new MethodNotImplementedError('executeDeployment'));

      return await adapter.executeDeployment(deployment);
    },
    [adapter, handleError, connected],
  );

  const transitionViewKeys = useCallback(
    async (transactionId: string) => {
      if (!connected) throw handleError(new WalletNotConnectedError());
      if (!adapter || !('transitionViewKeys' in adapter))
        throw handleError(new MethodNotImplementedError('transitionViewKeys'));

      return await adapter.transitionViewKeys(transactionId);
    },
    [adapter, handleError, connected],
  );

  const requestTransactionHistory = useCallback(
    async (program: string) => {
      if (!connected) throw handleError(new WalletNotConnectedError());
      if (!adapter || !('requestTransactionHistory' in adapter))
        throw handleError(new MethodNotImplementedError('requestTransactionHistory'));

      return await adapter.requestTransactionHistory(program);
    },
    [adapter, handleError, connected],
  );

  // Doesn't require a connection — dapps may call this before connect to discover
  // which algorithms a wallet supports and to populate `algorithmsAllowed`.
  const algorithmsSupported = useCallback(async () => {
    if (!adapter || !('algorithmsSupported' in adapter)) return [];
    try {
      return await adapter.algorithmsSupported();
    } catch {
      return [];
    }
  }, [adapter]);

  const checkNetwork = useCallback(async () => {
    if (adapter && adapter.network !== initialNetwork) {
      const switchResult = await switchNetwork(initialNetwork);
      if (!switchResult) {
        throw handleError(new WalletSwitchNetworkError('Failed to switch network'));
      }
    }
  }, [adapter, initialNetwork, switchNetwork]);

  return (
    <WalletContext.Provider
      value={{
        autoConnect,
        wallets,
        wallet,
        address: publicKey ?? null,
        connected,
        connecting,
        reconnecting,
        disconnecting,
        network,
        pairingUrl,
        pairingSameDevice,
        pairing: pairingIntent,
        selectWallet,
        connect,
        disconnect,
        executeTransaction,
        transactionStatus,
        signMessage,
        switchNetwork,
        decrypt,
        requestRecords,
        executeDeployment,
        transitionViewKeys,
        requestTransactionHistory,
        algorithmsSupported,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
