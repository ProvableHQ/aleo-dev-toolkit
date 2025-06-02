import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { State } from './createConfig';
import { Network } from './types';
import {
  getLatestHeight,
  getProgram,
  getProgramMappingValue,
  getTransaction,
  getTransactions,
  pollProgramMappingValueUpdate,
} from './actions';
export * from './types';

const state = new State(Network.TESTNET);

export const queryClient = new QueryClient();

export function AleoHooksProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
}

export function useLatestHeight(refetchInterval: number = 10_000) {
  let query;
  if (refetchInterval > 0) {
    query = useQuery({
      queryKey: ['latestHeight'],
      queryFn: () => getLatestHeight({ state }),
      refetchInterval,
    });
  } else {
    query = useQuery({
      queryKey: ['latestHeight'],
      queryFn: () => getLatestHeight({ state }),
    });
  }

  return {
    latestHeight: query.data,
    latestHeightIsLoading: query.isLoading,
    latestHeightIsError: query.isError,
    latestHeightError: query.error,
    refetchLatestHeight: query.refetch,
  };
}

export function useTransactions(blockHeight: number) {
  let query = useQuery({
    queryKey: ['transactions', blockHeight],
    queryFn: () => getTransactions({ state }, blockHeight),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return {
    transactions: query.data,
    transactionsIsLoading: query.isLoading,
    transactionsIsError: query.isError,
    transactionsError: query.error,
  };
}

export function useTransaction(transactionId: string) {
  let query = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => getTransaction({ state }, transactionId),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return {
    transaction: query.data,
    transactionIsLoading: query.isLoading,
    transactionIsError: query.isError,
    transactionError: query.error,
  };
}

export function useProgram(programName: string) {
  let query = useQuery({
    queryKey: ['program', programName],
    queryFn: () => getProgram({ state }, programName),
  });

  return {
    program: query.data,
    programIsLoading: query.isLoading,
    programIsError: query.isError,
    programError: query.error,
  };
}

export function useProgramMappingValue() {
  return {
    watchProgramMappingValue: (
      programName: string,
      mappingName: string,
      key: string,
      refetchInterval: number = 10_000,
    ) => {
      const query = useQuery({
        queryKey: ['programMappingValue', programName, mappingName, key],
        queryFn: () => getProgramMappingValue({ state }, programName, mappingName, key),
        refetchInterval,
      });
      return {
        programMappingValue: query.data,
        programMappingValueIsLoading: query.isLoading,
        programMappingValueIsError: query.isError,
        programMappingValueError: query.error,
        refetchProgramMappingValue: query.refetch,
      };
    },
    getProgramMappingValue: (programName: string, mappingName: string, key: string) =>
      getProgramMappingValue({ state }, programName, mappingName, key),
    pollProgramMappingValueUpdate: (
      programName: string,
      mappingName: string,
      key: string,
      callback: (value: string) => string = value => value,
      retries: number = 10,
      interval: number = 1000,
    ) =>
      pollProgramMappingValueUpdate(
        { state },
        programName,
        mappingName,
        key,
        callback,
        retries,
        interval,
      ),
  };
}
