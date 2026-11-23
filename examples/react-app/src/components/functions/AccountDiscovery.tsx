import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adapter-react-ui';
import {
  createShieldMultichainClient,
  getInjectedShieldMultichainProvider,
  ShieldMultichainError,
  type AccountFamily,
  type MultichainAccount,
} from '@provablehq/shield-multichain';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CodePanel } from '@/components/CodePanel';
import { codeExamples } from '@/lib/codeExamples';

const families: AccountFamily[] = ['evm', 'solana'];

type SharedAccount = MultichainAccount & { owner: object; adapter: object; network: string | null };

export function AccountDiscovery() {
  const { wallet, connected, address, network } = useWallet();
  const [multichain] = useState(() => createShieldMultichainClient());
  const { setVisible } = useWalletModal();
  const [accounts, setAccounts] = useState<Partial<Record<AccountFamily, SharedAccount>>>({});
  const [pending, setPending] = useState<AccountFamily | null>(null);
  const [trading, setTrading] = useState<string>();
  const [error, setError] = useState('');
  const epoch = useRef(0);
  const inFlight = useRef(false);
  const adapter = wallet?.adapter;

  useEffect(() => {
    const clear = () => {
      epoch.current += 1;
      inFlight.current = false;
      setAccounts({});
      setTrading(undefined);
      setPending(null);
      setError('');
    };
    clear();
    const events = ['accountChange', 'disconnect', 'networkChange', 'connect'] as const;
    for (const event of events) adapter?.on(event, clear);
    const provider = getInjectedShieldMultichainProvider();
    const canListen = typeof provider?.on === 'function' && typeof provider?.off === 'function';
    if (canListen) {
      provider.on('accountsChanged', clear);
      provider.on('disconnect', clear);
    }
    return () => {
      epoch.current += 1;
      inFlight.current = false;
      for (const event of events) adapter?.off(event, clear);
      if (canListen) {
        provider.off('accountsChanged', clear);
        provider.off('disconnect', clear);
      }
    };
  }, [adapter, connected, address, network]);

  const request = async (family: AccountFamily) => {
    if (!connected) {
      setVisible(true);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    const current = epoch.current;
    setPending(family);
    setError('');
    try {
      if (adapter?.name !== 'Shield Wallet') {
        throw new ShieldMultichainError('UNSUPPORTED', 'Select Shield Wallet for this lab.');
      }
      const account = await multichain[family].requestAccount();
      if (current === epoch.current && adapter?.account) {
        const shared = { ...account, owner: adapter.account, adapter, network };
        setAccounts(previous => ({ ...previous, [family]: shared }));
      }
    } catch (thrown) {
      if (current === epoch.current) {
        const code = thrown instanceof ShieldMultichainError ? thrown.code : 'REQUEST_FAILED';
        // Do not render raw wallet/transport error payloads in a public demo.
        setError(
          `Multichain account request did not complete (${code}). The wallet may not support this feature, or approval was declined. No account was added.`,
        );
      }
    } finally {
      if (current === epoch.current) {
        inFlight.current = false;
        setPending(null);
      }
    }
  };

  const requestTrading = async (fresh: boolean) => {
    if (!connected) return setVisible(true);
    if (inFlight.current) return;
    inFlight.current = true;
    const current = epoch.current;
    setPending('evm');
    setError('');
    try {
      const account = await multichain.evm.requestTradingAccount({ fresh });
      if (epoch.current === current) setTrading(account.address);
    } catch {
      if (epoch.current === current) setError('Trading account request did not complete.');
    } finally {
      if (epoch.current === current) { inFlight.current = false; setPending(null); }
    }
  };

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="h2">Shield multichain accounts</h1>
        <p className="text-muted-foreground">
          Ask Shield's separate multichain provider to share an EVM or Solana account. The wallet
          derives and approves it internally; this page receives only its public address.
        </p>
      </div>
      <Alert>
        <AlertDescription>
          Sharing an address lets this site look up its public balances and activity. Each family is
          requested separately. Connecting or granting Aleo record access does not grant this
          feature, signing authority, or access to private keys.
        </AlertDescription>
      </Alert>
      <p className="body-m break-all">
        Wallet: {wallet?.adapter.name ?? 'Not connected'} · Aleo account:{' '}
        {connected ? address || 'Withheld' : 'Not connected'}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {families.map(family => {
          const shared = accounts[family];
          const value =
            connected &&
            shared?.adapter === adapter &&
            shared?.owner === adapter?.account &&
            shared?.network === network
              ? shared.address
              : undefined;
          return (
            <div key={family} className="space-y-3 rounded-lg border p-4">
              <h2 className="body-m-bold">{family === 'evm' ? 'EVM' : 'Solana'}</h2>
              <p className="break-all" data-account-family={family}>
                {value ?? 'Not shared'}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button disabled={pending !== null} onClick={() => void request(family)}>
                  {pending === family
                    ? 'Waiting for wallet…'
                    : `Request ${family === 'evm' ? 'EVM' : 'Solana'} account`}
                </Button>
                {value ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(value)
                        .catch(() => setError('Could not copy the address.'));
                    }}
                  >
                    Copy address
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="space-y-3 rounded-lg border p-4">
        <h2 className="body-m-bold">Hyperliquid trading account</h2>
        {connected && trading && <p className="break-all">{trading}</p>}
        <div className="flex gap-2">
          <Button disabled={pending !== null} onClick={() => void requestTrading(false)}>Request trading account</Button>
          <Button disabled={pending !== null} variant="outline" onClick={() => void requestTrading(true)}>New trading account</Button>
        </div>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      <p className="text-sm text-muted-foreground">
        This lab uses window.shield.multichain through a standalone client. The Aleo adapter is used
        only for the existing connect control. A matching wallet build is required; older builds
        report unsupported. Trading agent approval requires a separate request.
      </p>
      <CodePanel code={codeExamples.accountDiscovery} language="tsx" />
    </section>
  );
}
