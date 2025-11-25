import { Config } from '../createConfig';

export default async function getProgram(config: Config, programName: string) {
  return config.state.programManager.networkClient.getProgram(programName);
}
