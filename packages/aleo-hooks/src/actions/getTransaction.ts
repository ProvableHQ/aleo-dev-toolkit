import { Config } from '../createConfig';

export default async function getTransaction(config: Config, transactionId: string) {
  return config.state.programManager.networkClient.getTransaction(transactionId);
}
