import { Network, TransactionStatus } from '@provablehq/aleo-types';
import { CheckCircle, Copy, Loader2, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type TransactionStatusAlertProps = {
  txStatus: string | null;
  onchainTxId: string | null;
  txError: string | null;
  network: Network | null;
  copy: (text: string) => void;
};

export function TransactionStatusAlert({
  txStatus,
  onchainTxId,
  txError,
  network,
  copy,
}: TransactionStatusAlertProps) {
  if (!txStatus && !onchainTxId) return null;

  const lowerStatus = txStatus?.toLowerCase();
  const explorerPrefix =
    network === Network.TESTNET ? 'testnet.' : network === Network.CANARY ? 'canary.' : '';

  return (
    <Alert>
      {lowerStatus === TransactionStatus.ACCEPTED.toLowerCase() ? (
        <CheckCircle className="h-4 w-4" />
      ) : lowerStatus === TransactionStatus.REJECTED.toLowerCase() ||
        lowerStatus === TransactionStatus.FAILED.toLowerCase() ? (
        <XCircle className="h-4 w-4" />
      ) : (
        <Loader2 className="h-4 w-4 animate-spin" />
      )}
      <AlertDescription>
        <div className="space-y-2">
          <p className="body-m">
            Transaction status:{' '}
            <span className="body-m-bold capitalize">{txStatus || 'Pending'}</span>
          </p>
          {onchainTxId && (
            <>
              <div className="flex items-center justify-between bg-muted p-2 rounded-lg label-xs break-all border">
                <span className="truncate normal-case">Transaction Id: {onchainTxId}</span>
                <Button variant="ghost" size="sm" onClick={() => copy(onchainTxId)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(
                    `https://${explorerPrefix}explorer.provable.com/transaction/${onchainTxId}`,
                    '_blank',
                  )
                }
              >
                See on the explorer
              </Button>
            </>
          )}
          {txError && <p className="body-s text-destructive">Error: {txError}</p>}
        </div>
      </AlertDescription>
    </Alert>
  );
}
