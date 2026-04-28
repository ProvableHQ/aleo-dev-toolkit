import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { TransactionStatus } from '@provablehq/aleo-types';
import type { DispatchProgramEntry, DispatchPrepStep } from '@/lib/dispatchPrograms';

type StepState = {
  status: 'idle' | 'submitting' | 'pending' | 'accepted' | 'rejected' | 'failed';
  transactionId?: string;
  error?: string;
};

interface DispatchPrepPanelProps {
  entry: DispatchProgramEntry;
}

const PREP_FEE = 10000;

export function DispatchPrepPanel({ entry }: DispatchPrepPanelProps) {
  const { connected, address, executeTransaction, transactionStatus } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();
  const [stepStates, setStepStates] = useState<Record<number, StepState>>({});
  const pollIntervalsRef = useRef<Record<number, ReturnType<typeof setInterval>>>({});

  useEffect(() => {
    return () => {
      Object.values(pollIntervalsRef.current).forEach(id => clearInterval(id));
    };
  }, []);

  if (!entry.prepFlow || entry.prepFlow.length === 0) {
    return null;
  }

  const setStep = (i: number, partial: Partial<StepState>) => {
    setStepStates(prev => ({ ...prev, [i]: { ...(prev[i] ?? { status: 'idle' }), ...partial } }));
  };

  const startPolling = (i: number, transactionId: string) => {
    const intervalId = setInterval(async () => {
      try {
        const resp = await transactionStatus(transactionId);
        const lower = resp.status.toLowerCase();
        if (lower === TransactionStatus.ACCEPTED.toLowerCase()) {
          clearInterval(intervalId);
          delete pollIntervalsRef.current[i];
          setStep(i, { status: 'accepted', transactionId: resp.transactionId ?? transactionId });
        } else if (
          lower === TransactionStatus.REJECTED.toLowerCase() ||
          lower === TransactionStatus.FAILED.toLowerCase()
        ) {
          clearInterval(intervalId);
          delete pollIntervalsRef.current[i];
          setStep(i, {
            status: lower as StepState['status'],
            transactionId: resp.transactionId ?? transactionId,
            error: resp.error,
          });
        }
      } catch (err) {
        console.error('Prep step polling error:', err);
      }
    }, 1000);
    pollIntervalsRef.current[i] = intervalId;
  };

  const runStep = async (i: number, step: DispatchPrepStep) => {
    if (!connected) {
      openWalletModal(true);
      return;
    }
    if (!address) {
      toast.error('No connected address');
      return;
    }
    const inputs = step.inputs.map(s => s.replace('${address}', address));
    setStep(i, { status: 'submitting', error: undefined, transactionId: undefined });
    try {
      const tx = await executeTransaction({
        program: step.program,
        function: step.function,
        inputs,
        fee: PREP_FEE,
        privateFee: false,
      });
      if (tx?.transactionId) {
        toast.success(`${step.label} submitted`);
        setStep(i, { status: 'pending', transactionId: tx.transactionId });
        startPolling(i, tx.transactionId);
      } else {
        setStep(i, { status: 'failed', error: 'No transaction ID returned' });
      }
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Failed to submit';
      toast.error(message);
      setStep(i, { status: 'failed', error: message });
    }
  };

  const renderIcon = (state: StepState) => {
    if (state.status === 'submitting' || state.status === 'pending') {
      return <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
    }
    if (state.status === 'accepted') {
      return <CheckCircle className="mr-2 h-4 w-4" />;
    }
    if (state.status === 'failed' || state.status === 'rejected') {
      return <XCircle className="mr-2 h-4 w-4" />;
    }
    return <Wrench className="mr-2 h-4 w-4" />;
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="space-y-1">
        <p className="body-m-bold flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          First-time setup
        </p>
        <p className="body-s text-muted-foreground">
          <span className="body-s-bold">{entry.program}</span> uses <code>call.dynamic</code> to
          invoke a function on a target token program. For that nested call to land, this address
          needs to (1) hold a balance on the target token (via <code>mint_public</code>) and (2)
          approve <span className="body-s-bold">{entry.program}</span> as a spender (via{' '}
          <code>approve_public</code>). Skip this section if you've already minted and approved on
          this address.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {entry.prepFlow.map((step, i) => {
          const state = stepStates[i] ?? { status: 'idle' };
          const busy = state.status === 'submitting' || state.status === 'pending';
          return (
            <Button
              key={`${step.program}-${step.function}-${i}`}
              variant="outline"
              onClick={() => runStep(i, step)}
              disabled={busy}
              className="justify-start"
            >
              {renderIcon(state)}
              <span className="truncate">{step.label}</span>
            </Button>
          );
        })}
      </div>
      {Object.entries(stepStates).some(([, s]) => s.error) && (
        <ul className="body-s text-destructive list-disc list-inside">
          {Object.entries(stepStates)
            .filter(([, s]) => s.error)
            .map(([i, s]) => (
              <li key={i}>
                {entry.prepFlow?.[Number(i)]?.label}: {s.error}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
