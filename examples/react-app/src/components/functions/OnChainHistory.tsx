import { TvksExample } from '@/components/functions/TvksExample.tsx';
import { TxHistoryExample } from '@/components/functions/TxHistoryExample.tsx';

export default function OnChainHistory() {
  return (
    <>
      <TvksExample />
      <div className={'h-5'} />
      <TxHistoryExample />
    </>
  );
}
