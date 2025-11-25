import { Config } from '../createConfig';

export default async function pollProgramMappingValueUpdate(
  config: Config,
  programName: string,
  mappingName: string,
  key: string,
  callback: (value: string) => string = value => value,
  retries: number = 10,
  interval: number = 1000,
): Promise<string | null> {
  const res = await config.state.pollProgramMappingValueUpdate(
    programName,
    mappingName,
    key,
    callback,
    retries,
    interval,
  );
  return res ?? null;
}
