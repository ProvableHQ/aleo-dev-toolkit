import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Coins, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAtomValue } from 'jotai';
import { useWallet } from '@provablehq/aleo-wallet-adapter-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adapter-react-ui';
import type { BalancesResult, BalanceValue } from '@provablehq/aleo-types';
import { ALEO_BALANCE_TOKEN, type BalanceToken } from '@provablehq/aleo-wallet-adapter-core';
import { decryptPermissionAtom } from '@/lib/store/global';
import { CodePanel } from '../CodePanel';
import { codeExamples } from '@/lib/codeExamples';

/**
 * Tokens read for a wallet that has no `getBalances` of its own, which cannot
 * list them. Shield lists its own and ignores this.
 */
const FALLBACK_TOKENS: BalanceToken[] = [
  ALEO_BALANCE_TOKEN,
  { programId: 'usdcx_stablecoin.aleo', symbol: 'USDCx', decimals: 6 },
  { programId: 'usad_stablecoin.aleo', symbol: 'USAD', decimals: 6 },
];

/** At most four decimals, cut rather than rounded. */
function formatAmount(amount: string, decimals: number): string {
  const digits = amount.padStart(decimals + 1, '0');
  const whole = decimals ? digits.slice(0, -decimals) : digits;
  const fraction = decimals ? digits.slice(-decimals).slice(0, 4).replace(/0+$/, '') : '';
  const grouped = BigInt(whole).toLocaleString('en-US');
  return fraction ? `${grouped}.${fraction}` : grouped;
}

const STATUS_HINT: Record<BalanceValue['status'], string> = {
  ok: '',
  stale: 'stale',
  syncing: 'syncing…',
  not_granted: 'not granted',
  unavailable: 'unavailable',
};

function Reading({ value, decimals }: { value: BalanceValue; decimals: number }) {
  return (
    <span>
      {value.amount !== null ? formatAmount(value.amount, decimals) : '—'}
      {STATUS_HINT[value.status] && (
        <span className="ml-2 text-xs text-muted-foreground">{STATUS_HINT[value.status]}</span>
      )}
    </span>
  );
}

export default function Balances() {
  const { connected, getBalances } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();
  const decryptPermission = useAtomValue(decryptPermissionAtom);
  const [result, setResult] = useState<BalancesResult>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchBalances = async () => {
    if (!connected) {
      openWalletModal(true);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setResult(await getBalances(undefined, { tokens: FALLBACK_TOKENS }));
    } catch (err) {
      console.error('Error fetching balances', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
      toast.error('Failed to fetch balances');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Private balances need a decrypt permission that does not ask each time (
        <code>AUTO_DECRYPT</code> or <code>ON_CHAIN_HISTORY</code>); the current setting is{' '}
        <code>{decryptPermission}</code>. Without it they come back as “not granted”.
      </p>

      <Button onClick={fetchBalances} disabled={loading} className="w-full md:w-auto">
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Coins className="mr-2 h-4 w-4" />
        )}
        {loading ? 'Reading…' : connected ? 'Get balances' : 'Connect wallet'}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Token</th>
                <th className="p-3">Public</th>
                <th className="p-3">Private</th>
              </tr>
            </thead>
            <tbody>
              {result.balances.map(balance => (
                <tr
                  key={`${balance.programId}/${balance.tokenId ?? ''}`}
                  className="border-t"
                  data-testid={`balance-${balance.symbol}`}
                >
                  <td className="p-3 font-medium">{balance.symbol}</td>
                  <td className="p-3">
                    <Reading value={balance.public} decimals={balance.decimals} />
                  </td>
                  <td className="p-3">
                    <Reading value={balance.private} decimals={balance.decimals} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CodePanel code={codeExamples.getBalances} />
    </section>
  );
}
