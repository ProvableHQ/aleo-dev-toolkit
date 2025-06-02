import { Config } from "../createConfig";
import { Network } from "../types";

export default async function pollProgramMappingValueUpdate(
    config: Config,
    programName: string,
    mappingName: string,
    key: string,
    callback: (value: string) => string = (value) => value,
    retries: number = 10,
    interval: number = 1000,
): Promise<string | null> {
    let res = await config.state.pollProgramMappingValueUpdate(programName, mappingName, key, callback, retries, interval)
    return res ?? null
}