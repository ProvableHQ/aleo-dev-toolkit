import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import {
  reservationState,
  type Reservation,
  type ReservationStore,
} from '@provablehq/aleo-wallet-algorithms/lifecycle';
import {
  RECORD_FIXTURE,
  acceptAddress,
  buildComplianceProof,
  checkShieldOracle,
  deriveAtCounter,
  grants,
  listReservations,
  openStore,
  prepareInWallet,
  recoverClaim,
  scope,
  swapRequest,
  type PreparedSwap,
} from '@/lib/walletPrivateInputs';

function pretty(value: unknown) {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function Output({ children }: { children: string }) {
  return (
    <pre className="body-s font-mono whitespace-pre-wrap break-all rounded-xl border bg-muted/40 p-4 text-foreground">
      {children}
    </pre>
  );
}

function ReservationAction({
  row,
  onResume,
  onClaim,
}: {
  row: Reservation;
  onResume: (txId: string) => void;
  onClaim: (address: string) => void;
}) {
  const state = reservationState(row);
  switch (state.kind) {
    case 'approval':
      return (
        <Button variant="outline" size="sm" disabled>
          Reserved by an approval; cancel in its owning tab
        </Button>
      );
    case 'submitted':
      return (
        <Button variant="outline" size="sm" onClick={() => onResume(state.row.txId)}>
          Resume transaction
        </Button>
      );
    case 'confirmed':
      return (
        <Button variant="outline" size="sm" onClick={() => onClaim(state.row.blindedAddress)}>
          Use for claim
        </Button>
      );
    case 'reverted':
      return (
        <Button variant="outline" size="sm" disabled>
          Available after chain recheck
        </Button>
      );
    default: {
      const unreachable: never = state;
      throw new Error(`Unexpected reservation state: ${String(unreachable)}`);
    }
  }
}

const GUIDE_URL =
  'https://github.com/ProvableHQ/aleo-dev-toolkit/blob/master/docs/wallet-private-inputs.md';
const AGENT_URL =
  'https://github.com/ProvableHQ/aleo-dev-toolkit/blob/master/packages/aleo-wallet-algorithms/AGENTS.md';

export function WalletPrivateInputs() {
  const storeRef = useRef<ReservationStore | null>(null);
  const preparedRef = useRef<PreparedSwap | undefined>(undefined);
  const [status, setStatus] = useState('Opening IndexedDB…');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hasPrepared, setHasPrepared] = useState(false);
  const [activeId, setActiveId] = useState<string | undefined>();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [counter, setCounter] = useState('0');
  const [target, setTarget] = useState('');
  const [requestText, setRequestText] = useState('Loading request…');
  const [proofOutput, setProofOutput] = useState('Select “Build compliance proof”.');
  const [directOutput, setDirectOutput] = useState(
    'Select “Derive inputs” to check the public test vector.',
  );
  const [resolved, setResolved] = useState('No request prepared.');
  const [claimOutput, setClaimOutput] = useState('No claim prepared.');

  const refresh = async (store: ReservationStore) => {
    setReservations(await listReservations(store));
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const store = await openStore();
        if (cancelled) return;
        storeRef.current = store;
        setReady(true);
        setRequestText(pretty(await swapRequest()));
        await refresh(store);
        setStatus('Ready. Cryptography and IndexedDB are real. Chain reads are simulated.');
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : 'Unable to open the example store');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const run = async (action: () => Promise<void>) => {
    const store = storeRef.current;
    if (busy || !store) return;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Operation failed');
    } finally {
      await refresh(store);
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="h2 text-foreground">Wallet private inputs</h1>
        <p className="body-l text-muted-foreground max-w-2xl">
          Three checks for an embedded wallet: an ARC-22 record, an ARC-22 compliance proof, and a
          blinded address for private swaps. Each check compares a public fixture with the reference
          output.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <p className="label-xs text-muted-foreground">Start here</p>
        <h2 className="h3">Integrate a wallet</h2>
        <ol className="body-s text-muted-foreground list-decimal space-y-2 pl-5 max-w-2xl">
          <li>
            Read the guide,{' '}
            <a className="underline text-foreground" href={GUIDE_URL}>
              docs/wallet-private-inputs.md
            </a>
            . It is also on the docs site as “Wallet private inputs.” Work through the record, the
            proof, then the blinded address.
          </li>
          <li>
            Agents follow{' '}
            <a className="underline text-foreground" href={AGENT_URL}>
              packages/aleo-wallet-algorithms/AGENTS.md
            </a>
            . Finish one area and its check before the next. Implement that in the target wallet.
          </li>
          <li>
            Use sections 01–03 on this page as those checks. Section 04 is an optional counter
            store. A wallet can keep its own.
          </li>
        </ol>
        <p className="body-s text-muted-foreground">
          From the repo root, run <code>pnpm adapter-app:dev</code> and open Wallet Inputs.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Public test fixtures only</AlertTitle>
        <AlertDescription>
          Cryptography and IndexedDB are real. Chain reads and transactions are simulated. No wallet
          connection, proving, or funds are required. Production wallets keep factors and counters
          private.
        </AlertDescription>
      </Alert>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <p className="label-xs text-muted-foreground">01 / ARC-22 record</p>
        <div className="space-y-2">
          <h2 className="h3">Select the compliance record</h2>
          <p className="body-s text-muted-foreground">
            The wallet already holds this record. It does not derive it. A private send or unshield
            passes the recipient, the amount, this record, then the compliance proof.
          </p>
        </div>
        <Output>{RECORD_FIXTURE}</Output>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <p className="label-xs text-muted-foreground">02 / ARC-22 proof</p>
        <div className="space-y-2">
          <h2 className="h3">Prove the signer is not frozen</h2>
          <p className="body-s text-muted-foreground">
            This builds a depth-16 <code>[MerkleProof; 2]</code> from two public frozen addresses. A
            production wallet passes the published freeze-list tree instead of rebuilding it.
          </p>
        </div>
        <Button
          onClick={() =>
            void run(async () => {
              setProofOutput(pretty(await buildComplianceProof()));
              setStatus('Compliance proof built from the public fixture addresses.');
            })
          }
          disabled={busy}
        >
          Build compliance proof
        </Button>
        <Output>{proofOutput}</Output>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <p className="label-xs text-muted-foreground">03 / Blinded addresses</p>
        <div className="space-y-2">
          <h2 className="h3">Derive a blinded address for a private swap</h2>
          <p className="body-s text-muted-foreground">
            Supply explicit inputs and choose a counter. These functions do not read storage or
            contact a network.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-2 w-full sm:max-w-[220px]">
            <Label htmlFor="counter">Counter</Label>
            <Input
              id="counter"
              type="number"
              min={0}
              max={4294967295}
              step={1}
              value={counter}
              onChange={event => setCounter(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                void run(async () => {
                  if (counter.trim() === '') throw new Error('Enter a counter');
                  const value = Number(counter);
                  setDirectOutput(pretty(await deriveAtCounter(value)));
                  setStatus('Blinded address derived from the public fixture.');
                })
              }
              disabled={busy}
            >
              Derive inputs
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                void run(async () => {
                  setDirectOutput(pretty(await checkShieldOracle()));
                  setStatus('Compared the derivation with the Shield wallet oracle.');
                })
              }
              disabled={busy}
            >
              Check Shield oracle
            </Button>
          </div>
        </div>
        <Output>{directOutput}</Output>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <p className="label-xs text-muted-foreground">04 / Optional counter store</p>
        <div className="space-y-2">
          <h2 className="h3">Follow a swap through settlement</h2>
          <p className="body-s text-muted-foreground">
            The simulated wallet validates a dapp request, reserves a counter, and fills both
            inputs. Use the controls to report transaction outcomes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() =>
              void run(async () => {
                const store = storeRef.current;
                if (!store) return;
                const prepared = await prepareInWallet(await swapRequest(), await grants(), store);
                preparedRef.current = prepared;
                setHasPrepared(true);
                setResolved(pretty(prepared.inputs));
                setStatus(
                  'Inputs prepared. The counter is reserved until cancellation or settlement.',
                );
              })
            }
            disabled={busy || hasPrepared || !ready}
          >
            Prepare swap
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              void run(async () => {
                await preparedRef.current?.session.release();
                preparedRef.current = undefined;
                setHasPrepared(false);
                setStatus('Approval cancelled; reservation released.');
              })
            }
            disabled={busy || !hasPrepared}
          >
            Cancel approval
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              void run(async () => {
                const store = storeRef.current;
                const prepared = preparedRef.current;
                if (!store || !prepared) return;
                const local = `local-${crypto.randomUUID()}`;
                await prepared.session.commit(local);
                const onChain = `simulated-${crypto.randomUUID()}`;
                await store.remap(await scope(), local, onChain);
                setActiveId(onChain);
                await prepared.session.release();
                preparedRef.current = undefined;
                setHasPrepared(false);
                setStatus(
                  'Submission simulated. Reservation remains pending until a definitive outcome.',
                );
              })
            }
            disabled={busy || !hasPrepared}
          >
            Simulate submission
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              void run(async () => {
                await settle(true);
              })
            }
            disabled={busy || !activeId}
          >
            Simulate acceptance
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              void run(async () => {
                await settle(false);
              })
            }
            disabled={busy || !activeId}
          >
            Simulate rejection
          </Button>
        </div>
        <p className="body-m-bold" role="status">
          {status}
        </p>
        <details className="rounded-xl border border-border px-4">
          <summary className="body-s-bold cursor-pointer py-3">Dapp request</summary>
          <Output>{requestText}</Output>
        </details>
        <details className="rounded-xl border border-border px-4">
          <summary className="body-s-bold cursor-pointer py-3">
            Resolved inputs (public fixtures)
          </summary>
          <Output>{resolved}</Output>
        </details>

        <div className="space-y-2">
          <h3 className="body-l-bold">Persistent reservations</h3>
          <p className="body-s text-muted-foreground">
            Reload to inspect saved reservations and resume a pending simulated transaction. An
            interrupted, uncommitted approval stays reserved. Cancel an active approval in its
            owning tab.
          </p>
          {reservations.length === 0 ? (
            <p className="body-s text-muted-foreground">No reservations.</p>
          ) : (
            <div className="space-y-3">
              {reservations.map(row => (
                <article
                  key={row.blindedAddress}
                  className="rounded-xl border border-border p-4 space-y-2"
                >
                  <p className="body-s">
                    Counter {row.counter} · {row.status} · {row.txId ?? 'uncommitted approval'}
                  </p>
                  <code className="body-s font-mono break-all">{row.blindedAddress}</code>
                  <div>
                    <ReservationAction
                      row={row}
                      onClaim={setTarget}
                      onResume={txId => {
                        setActiveId(txId);
                        setStatus('Pending transaction selected. Report its simulated outcome.');
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => {
              window.location.reload();
            }}
          >
            Reload example
          </Button>
        </div>

        <div className="space-y-3">
          <h3 className="body-l-bold">Recover a claim</h3>
          <div className="space-y-2">
            <Label htmlFor="target">Accepted blinded address</Label>
            <Input
              id="target"
              value={target}
              placeholder="Select an accepted reservation above"
              onChange={event => setTarget(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                void run(async () => {
                  const store = storeRef.current;
                  if (!store) return;
                  if (!target.trim()) throw new Error('Select an accepted address');
                  setClaimOutput(pretty(await recoverClaim(store, target.trim(), false)));
                  setStatus('Claim pair recovered. No new counter was reserved.');
                })
              }
              disabled={busy}
            >
              Prepare claim
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                void run(async () => {
                  const store = storeRef.current;
                  if (!store) return;
                  if (!target.trim()) throw new Error('Select an accepted address');
                  setClaimOutput(pretty(await recoverClaim(store, target.trim(), true)));
                  setStatus('Claim pair recovered. No new counter was reserved.');
                })
              }
              disabled={busy}
            >
              Recover with empty local index
            </Button>
          </div>
          <Output>{claimOutput}</Output>
        </div>
      </div>
    </section>
  );

  async function settle(accepted: boolean) {
    const store = storeRef.current;
    if (!store || !activeId) throw new Error('No pending transaction selected');
    const row = (await listReservations(store)).find(
      item => item.txId === activeId && item.status === 'pending',
    );
    if (!row) throw new Error('No pending transaction selected');
    if (accepted) acceptAddress(row.blindedAddress);
    await store.settle(await scope(), activeId, accepted ? 'confirmed' : 'reverted');
    if (accepted) setTarget(row.blindedAddress);
    setActiveId(undefined);
    setStatus(
      accepted
        ? 'Acceptance simulated; the address is recorded in the simulated mapping.'
        : 'Rejection simulated; the counter can be reconsidered after a chain recheck.',
    );
  }
}
