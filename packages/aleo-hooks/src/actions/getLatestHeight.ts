import { Config } from '../createConfig';

export default function getLatestHeight(config: Config): Promise<number> {
  return config.state.programManager.networkClient.getLatestHeight();
}
