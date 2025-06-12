import { Config } from "../createConfig";
import { Network } from "../types";

export default async function getProgramMappingValue(
    config: Config,
    programName: string,
    mappingName: string,
    key: string,
): Promise<string | null> {
    return config.state.programManager.networkClient.getProgramMappingValue(programName, mappingName, key)
}