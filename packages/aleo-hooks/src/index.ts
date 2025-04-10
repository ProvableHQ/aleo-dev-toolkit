// packages/aleo-hooks/src/index.ts
/**
 * Minimal Aleo hook that returns dummy data
 * to ensure TypeScript has something to compile.
 */
export function useChainData() {
    return { data: 'Hello from aleo-hooks!' };
  }