import { atomWithStorage } from "jotai/utils";

// Settings atoms with localStorage persistence
export const isDelegatedProvingAtom = atomWithStorage(
    "isDelegatedProving",
    true,
);
export const privateKeyAtom = atomWithStorage(
    "privateKey",
    "APrivateKey1zkpBfeuZCrUFB6csYi262zasKamEHZ1t87z37nSwqfLZVPg",
);
export const shouldBroadcastTxAtom = atomWithStorage(
    "shouldBroadcastLocalTx",
    false,
);

// Legacy export for backward compatibility
export const shouldBroadcastLocalTxAtom = shouldBroadcastTxAtom;
