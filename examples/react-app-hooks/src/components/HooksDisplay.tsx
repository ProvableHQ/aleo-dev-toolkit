import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletMultiButton } from '@demox-labs/aleo-wallet-adapter-reactui';
import { useLatestHeight, useProgramMappingValue } from '@provablehq/aleo-hooks';

export default function HooksDisplay() {
  const { publicKey } = useWallet();
  const { latestHeight, latestHeightIsLoading, refetchLatestHeight } = useLatestHeight();
  const { watchProgramMappingValue } = useProgramMappingValue();

  const {
    programMappingValue: accountBalance,
    programMappingValueIsLoading: accountBalanceIsLoading,
    refetchProgramMappingValue: refetchBalance,
  } = watchProgramMappingValue('credits.aleo', 'account', publicKey ?? '');

  return (
    <div className="hooks-info">
      <WalletMultiButton />
      <h2>Wallet Connected</h2>
      <p>Address: {publicKey ?? 'No account'}</p>
      {latestHeightIsLoading ? (
        <p>Loading...</p>
      ) : (
        <p>
          <strong>Latest Height :</strong> {latestHeight}
        </p>
      )}
      {accountBalanceIsLoading ? (
        <p>Loading...</p>
      ) : (
        <p>
          <strong>Program Mapping Value :</strong> {accountBalance}
        </p>
      )}
      <button onClick={() => refetchLatestHeight()}>Refetch Latest Height</button>
      <button onClick={() => refetchBalance()}>Refetch Balance</button>
    </div>
  );
}
