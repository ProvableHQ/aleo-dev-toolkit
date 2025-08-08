import { useQuery } from '@tanstack/react-query';
import { Network } from '@provablehq/aleo-types';

const ENDPOINT_CANARY = 'https://explorer-backend-api-canary.stg.infra.provable.com/v2/canary';
const ENDPOINT_TESTNET = 'https://explorer-backend-api-testnet.stg.infra.provable.com/v2/testnet';
const ENDPOINT_MAINNET = 'https://explorer-backend-api-mainnet.prd.infra.provable.com/v2/mainnet';

interface Program {
  id: string;
  name: string;
  description?: string;
  version?: string;
}

const getNetworkEndpoint = (network: Network): string => {
  switch (network) {
    case Network.MAINNET:
      return ENDPOINT_MAINNET;
    case Network.TESTNET3:
      return ENDPOINT_TESTNET;
    case Network.CANARY:
      return ENDPOINT_CANARY;
    default:
      return ENDPOINT_TESTNET;
  }
};

const fetchPrograms = async (network: Network): Promise<Program[]> => {
  const endpoint = getNetworkEndpoint(network);
  const response = await fetch(`${endpoint}/programs/summary`);

  if (!response.ok) {
    throw new Error(`Failed to fetch programs: ${response.statusText}`);
  }

  return response.json();
};

export const usePrograms = (network: Network) => {
  return useQuery({
    queryKey: ['programs', network],
    queryFn: () => fetchPrograms(network),
    enabled: !!network,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
};

export const useProgramsSearch = (network: Network, searchTerm: string) => {
  const { data: allPrograms, isLoading, error } = usePrograms(network);

  // Filter programs locally based on search term
  const filteredPrograms =
    searchTerm.length >= 2
      ? allPrograms?.filter(
          program =>
            program.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (program.name && program.name.toLowerCase().includes(searchTerm.toLowerCase())),
        ) || []
      : allPrograms || [];

  // Limit results for better performance
  const limitedPrograms = filteredPrograms.slice(0, 20);

  return {
    data: {
      programs: limitedPrograms,
      total: filteredPrograms.length,
    },
    isLoading,
    error,
  };
};
