import { deriveBlindingFactor } from '@provablehq/aleo-wallet-algorithms/program-scoped-blinding-factor';
import { deriveBlindedAddress } from '@provablehq/aleo-wallet-algorithms/program-scoped-blinded-address';
import { complianceProofFromAddresses } from '@provablehq/aleo-wallet-algorithms/compliance-proof';
import { openIndexedDBStore } from '@provablehq/aleo-wallet-algorithms/storage/indexeddb';
import {
  createMemoryStore,
  BLINDING_TEST_VECTOR,
  SHIELD_BLINDING_VECTOR,
} from '@provablehq/aleo-wallet-algorithms/testing';
import { prepareInWallet } from './wallet';
import { grants, request, scope } from './fixtures';
import { chain } from './simulated-chain';
import './style.css';

const fixture = BLINDING_TEST_VECTOR;
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const button = (id: string) => element<HTMLButtonElement>(id);
const text = (id: string, value: unknown) => {
  element(id).textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
};
const store = await openIndexedDBStore({ name: 'aleo-wallet-algorithms-example-v1' });
let prepared: Awaited<ReturnType<typeof prepareInWallet>> | undefined;
let activeId: string | undefined;
let busy = false;
const updateButtons = () => {
  button('prepare').disabled = busy || !!prepared;
  button('cancel').disabled = busy || !prepared;
  button('submit').disabled = busy || !prepared;
  button('accept').disabled = busy || !activeId;
  button('reject').disabled = busy || !activeId;
  button('claim').disabled = busy;
  button('cold-claim').disabled = busy;
};
const run = async (action: () => Promise<void>) => {
  if (busy) return;
  busy = true;
  updateButtons();
  try {
    await action();
  } catch (error) {
    text('status', error instanceof Error ? error.message : 'Operation failed');
  } finally {
    busy = false;
    await refresh();
    updateButtons();
  }
};
async function refresh() {
  const rows = await store.list(scope);
  const container = element('reservations');
  container.replaceChildren();
  if (!rows.length) {
    container.textContent = 'No reservations.';
    return;
  }
  for (const row of rows.sort((a, b) => a.counter - b.counter)) {
    const card = document.createElement('article');
    const summary = document.createElement('p');
    summary.textContent = `Counter ${row.counter} · ${row.status} · ${row.txId ?? 'uncommitted approval'}`;
    card.append(summary);
    const address = document.createElement('code');
    address.textContent = row.blindedAddress;
    card.append(address);
    const action = document.createElement('button');
    if (row.status === 'pending' && row.txId === null) {
      // This tab cannot establish whether another tab still owns the approval.
      action.textContent = 'Reserved by an approval; cancel in its owning tab';
      action.disabled = true;
    } else if (row.status === 'pending') {
      action.textContent = 'Resume transaction';
      action.onclick = () => {
        activeId = row.txId!;
        text('status', 'Pending transaction selected. Report its simulated outcome.');
        updateButtons();
      };
    } else if (row.status === 'confirmed') {
      action.textContent = 'Use for claim';
      action.onclick = () => {
        element<HTMLInputElement>('target').value = row.blindedAddress;
      };
    } else {
      action.textContent = 'Available after chain recheck';
      action.disabled = true;
    }
    card.append(action);
    container.append(card);
  }
}
button('prove').onclick = () => {
  const frozen = [
    'aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px',
    'aleo1s3ws5tra87fjycnjrwsjcrnw2qxr8jfqqdugnf0xzqqw29q9m5pqem2u4t',
  ];
  const signer = 'aleo1kypwp5m7qtk9mwazgcpg0tq8aal23mnrvwfvug65qgcg9xvsrqgspyjm6n';
  const proof = complianceProofFromAddresses(signer, frozen);
  const again = complianceProofFromAddresses(signer, [...frozen].reverse());
  text('proof-output', {
    signer,
    depth: 16,
    stableWhenAddressesAreReordered: proof === again,
    proof,
  });
};
button('shield-vector').onclick = () => {
  const vector = SHIELD_BLINDING_VECTOR;
  const blindingFactor = deriveBlindingFactor(vector);
  const blindedAddress = deriveBlindedAddress({ ...vector, blindingFactor });
  text('direct-output', {
    source: 'Shield wallet oracle',
    counter: vector.counter,
    blindingFactor,
    blindedAddress,
    matchesShieldOracle:
      blindingFactor === vector.blindingFactor && blindedAddress === vector.blindedAddress,
  });
};
button('derive').onclick = () => {
  try {
    const value = element<HTMLInputElement>('counter').value;
    if (value.trim() === '') throw new Error('Enter a counter');
    const counter = Number(value);
    const blindingFactor = deriveBlindingFactor({ ...fixture, counter });
    const blindedAddress = deriveBlindedAddress({ ...fixture, blindingFactor });
    text('direct-output', {
      counter,
      blindingFactor,
      blindedAddress,
      ...(counter === 0
        ? {
            matchesSyntheticVector:
              blindingFactor === fixture.blindingFactor &&
              blindedAddress === fixture.blindedAddress,
          }
        : {}),
    });
  } catch (error) {
    text('direct-output', String(error));
  }
};
button('prepare').onclick = () =>
  void run(async () => {
    // In production, these are grants already approved for the dapp connection.
    prepared = await prepareInWallet(request(), grants, store, chain.readMapping);
    text('resolved', prepared.inputs);
    text('status', 'Inputs prepared. The counter is reserved until cancellation or settlement.');
  });
button('cancel').onclick = () =>
  void run(async () => {
    await prepared!.session.release();
    prepared = undefined;
    text('status', 'Approval cancelled; reservation released.');
  });
button('submit').onclick = () =>
  void run(async () => {
    const local = `local-${crypto.randomUUID()}`;
    // Save the ID before submission so an unknown outcome cannot make the counter reusable.
    await prepared!.session.commit(local);
    const onChain = `simulated-${crypto.randomUUID()}`;
    await store.remap(scope, local, onChain);
    activeId = onChain;
    // Drop cached inputs; commit keeps the reservation pending until a known outcome.
    await prepared!.session.release();
    prepared = undefined;
    text('status', 'Submission simulated. Reservation remains pending until a definitive outcome.');
  });
const settle = async (accepted: boolean) => {
  const row = (await store.list(scope)).find(r => r.txId === activeId && r.status === 'pending');
  if (!row) throw new Error('No pending transaction selected');
  if (accepted) chain.accept(row.blindedAddress);
  await store.settle(scope, activeId!, accepted ? 'confirmed' : 'reverted');
  if (accepted) element<HTMLInputElement>('target').value = row.blindedAddress;
  activeId = undefined;
  text(
    'status',
    accepted
      ? 'Acceptance simulated; the address is recorded in the simulated mapping.'
      : 'Rejection simulated; the counter can be reconsidered after a chain recheck.',
  );
};
button('accept').onclick = () => void run(() => settle(true));
button('reject').onclick = () => void run(() => settle(false));
const claim = async (cold: boolean) => {
  const target = element<HTMLInputElement>('target').value.trim();
  if (!target) throw new Error('Select an accepted address');
  const result = await prepareInWallet(
    request(target),
    grants,
    cold ? createMemoryStore() : store,
    chain.readMapping,
  );
  text('claim-output', {
    recoveredWith: cold ? 'empty local index' : 'persistent wallet index',
    blindingFactor: result.inputs[0],
    blindedAddress: result.inputs[1],
  });
  await result.session.release();
  text('status', 'Claim pair recovered. No new counter was reserved.');
};
button('claim').onclick = () => void run(() => claim(false));
button('cold-claim').onclick = () => void run(() => claim(true));
button('reload').onclick = () => location.reload();
text('request', request());
text('status', 'Ready. The fixture connection permits the two algorithms for swap and claim.');
await refresh();
updateButtons();
