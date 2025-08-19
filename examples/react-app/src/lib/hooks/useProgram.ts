import { useQuery } from '@tanstack/react-query';
import { Network } from '@provablehq/aleo-types';
import { getAPIEndpoint } from '../utils/api';

const fetchProgram = async (programId: string, network: Network): Promise<string> => {
  const endpoint = getAPIEndpoint(network);
  const response = await fetch(`${endpoint}/programs/${programId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch program: ${response.statusText}`);
  }

  return response.text();
};

export const useProgram = (programId: string, network?: Network) => {
  return useQuery({
    queryKey: ['program', programId, network],
    queryFn: () => fetchProgram(programId, network || Network.TESTNET3),
    enabled: !!programId && !!network,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
};
