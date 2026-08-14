/**
 * '@shield/relay-dapp-client' is an OPTIONAL peer dependency, loaded lazily
 * only when `ShieldWalletAdapterConfig.remote` is configured. This wildcard
 * declaration lets the package typecheck without it installed; remote.ts
 * immediately narrows the import to the structural
 * `ShieldRemoteTransportLike` interface in types.ts.
 */
declare module '@shield/relay-dapp-client';
