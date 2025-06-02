import { EventEmitter } from '@demox-labs/aleo-wallet-adapter-base';
import { Network, newProgramManager, ProgramManager } from './types';

export type Config = {
  readonly state: State;
};

export class State {
  emitter: EventEmitter = new EventEmitter();
  programManager: ProgramManager<Network.MAINNET | Network.TESTNET>;

  constructor(network: Network) {
    this.programManager = newProgramManager(network);
  }

  async pollProgramMappingValueUpdate(
    programName: string,
    mappingName: string,
    key: string,
    callback: (value: string) => string = value => value,
    retries: number = 10,
    interval: number = 1000,
  ): Promise<string | void> {
    while (retries > 0) {
      try {
        const value = await this.programManager.networkClient.getProgramMappingValue(
          programName,
          mappingName,
          key,
        );
        return callback(value);
      } catch (error) {
        if (retries === 0) {
          throw error;
        }
        console.error(error);
        retries--;
        console.log('Retrying...');
        console.log(retries, 'retries left');
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
  }
}
