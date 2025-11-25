import { Config } from '../createConfig';
import { Transaction } from '@provablehq/aleo-types/src/transaction';

export default async function getTransactions(
  config: Config,
  blockHeight: number,
): Promise<Transaction[]> {
  return (await config.state.programManager.networkClient.getTransactions(blockHeight)).map(
    transaction =>
      <Transaction>{
        type: transaction.transaction.type,
        id: transaction.transaction.id,
        fee: transaction.transaction.fee,
        owner: transaction.transaction.owner,
        deployment: transaction.transaction.deployment,
        execution: transaction.transaction.execution,
      },
  );
}
