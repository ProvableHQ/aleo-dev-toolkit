# Aleo Hooks Design Document

## Overview

The `@provablehq/aleo-hooks` package provides a set of React hooks for interacting with the Aleo blockchain. It offers a simple and efficient way to fetch and monitor blockchain data in React applications, with built-in caching and real-time updates.

## Core Features

### 1. Network Configuration

- Supports multiple networks (defaults to testnet)
- Centralized state management through `State` class
- Easy network switching capability

### 2. React Query Integration

- Built on top of `@tanstack/react-query` for efficient data fetching and caching
- Automatic background refetching
- Configurable stale time and garbage collection
- Built-in loading and error states

### 3. Available Hooks

#### `useLatestHeight`

- Fetches the latest block height
- Configurable refetch interval
- Returns:
  - `latestHeight`: Current block height
  - `latestHeightIsLoading`: Loading state
  - `latestHeightIsError`: Error state
  - `latestHeightError`: Error details
  - `refetchLatestHeight`: Manual refetch function

#### `useTransactions`

- Fetches transactions for a specific block height
- Infinite cache time for historical data
- Returns:
  - `transactions`: Array of transactions
  - `transactionsIsLoading`: Loading state
  - `transactionsIsError`: Error state
  - `transactionsError`: Error details

#### `useTransaction`

- Fetches a specific transaction by ID
- Infinite cache time for historical data
- Returns:
  - `transaction`: Transaction details
  - `transactionIsLoading`: Loading state
  - `transactionIsError`: Error state
  - `transactionError`: Error details

#### `useProgram`

- Fetches program details by name
- Returns:
  - `program`: Program details
  - `programIsLoading`: Loading state
  - `programIsError`: Error state
  - `programError`: Error details

#### `useProgramMappingValue`

- Complex hook for interacting with program mappings
- Features:
  - `watchProgramMappingValue`: Real-time monitoring with configurable refetch interval
  - `getProgramMappingValue`: One-time fetch
  - `pollProgramMappingValueUpdate`: Custom polling with retry logic
- Returns:
  - `programMappingValue`: Current mapping value
  - `programMappingValueIsLoading`: Loading state
  - `programMappingValueIsError`: Error state
  - `programMappingValueError`: Error details
  - `refetchProgramMappingValue`: Manual refetch function

## Architecture

### Directory Structure

```
packages/aleo-hooks/
├── src/
│   ├── actions/        # API interaction functions
│   ├── types/          # TypeScript type definitions
│   ├── createConfig.ts # Configuration setup
│   └── index.ts        # Main exports
```

### Key Components

1. **State Management**

   - Centralized state through `State` class
   - Network configuration
   - Query client setup

2. **API Layer**

   - Separate action functions for API calls
   - Error handling
   - Type safety

3. **React Integration**
   - Provider component for setup
   - Custom hooks for data fetching
   - React Query integration

## Usage Example

```typescript
import { AleoHooksProvider, useLatestHeight, useProgramMappingValue } from '@provablehq/aleo-hooks';

function App() {
  return (
    <AleoHooksProvider>
      <YourComponent />
    </AleoHooksProvider>
  );
}

function YourComponent() {
  const { latestHeight, latestHeightIsLoading } = useLatestHeight();
  const { watchProgramMappingValue } = useProgramMappingValue();

  const { programMappingValue } = watchProgramMappingValue(
    'credits.aleo',
    'account',
    'user_address'
  );

  return (
    <div>
      <p>Latest Height: {latestHeight}</p>
      <p>Account Balance: {programMappingValue}</p>
    </div>
  );
}
```

## Future Improvements

1. **Additional Hooks**

   - Block information hooks
   - Local program execution hooks
   - Transaction status hooks

2. **Performance Optimizations**

   - Implement request batching
   - Add request deduplication
   - Optimize cache strategies

3. **Developer Experience**

   - Expand TypeScript type definitions
   - Implement error boundaries

4. **Testing**
   - Unit tests for hooks
   - Integration tests
   - End-to-end testing

## Dependencies

- `@tanstack/react-query`: Data fetching and caching
- `react`: Core React library

## Security Considerations

1. **Network Security**

   - Validate network responses
   - Handle rate limiting
   - Implement timeout mechanisms

2. **Data Validation**

   - Type checking
   - Response validation
   - Error handling

3. **Error Recovery**
   - Automatic retry mechanisms
   - Fallback strategies
   - Error reporting
