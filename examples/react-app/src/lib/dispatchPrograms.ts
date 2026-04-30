export interface DispatchPrepStep {
  /** Button label shown to the user. */
  label: string;
  /** Program to call for this prep step. */
  program: string;
  /** Function on that program. */
  function: string;
  /**
   * Inputs to pass. May contain `${address}` which is replaced with the
   * connected wallet's address at click time.
   */
  inputs: string[];
}

export interface DispatchFunctionEntry {
  name: string;
  /**
   * Index of the function input that receives the target program as a `field`
   * literal (i.e. the value passed to `call.dynamic`). For `route_transfer`,
   * `route_deposit`, and `route_withdraw` on `token_router.aleo`, this is 0.
   */
  targetInputIndex: number;
}

export interface DispatchProgramEntry {
  program: string;
  knownTargets: string[];
  dispatchFunctions: DispatchFunctionEntry[];
  description?: string;
  /**
   * Optional first-time setup steps (e.g. mint balance + approve router) shown
   * as buttons in a "DispatchPrepPanel" when this program is selected.
   */
  prepFlow?: DispatchPrepStep[];
}

export const KNOWN_DISPATCH_PROGRAMS: DispatchProgramEntry[] = [
  {
    program: 'token_router.aleo',
    knownTargets: ['toka_token.aleo', 'tokb_token.aleo'],
    dispatchFunctions: [
      { name: 'route_transfer', targetInputIndex: 0 },
      { name: 'route_deposit', targetInputIndex: 0 },
      { name: 'route_withdraw', targetInputIndex: 0 },
    ],
    description:
      'Token router that uses call.dynamic to forward transfers, deposits, and ' +
      'withdrawals to whichever target token program is supplied via `imports`.',
    prepFlow: [
      {
        label: 'Mint 10000 toka_token',
        program: 'toka_token.aleo',
        function: 'mint_public',
        inputs: ['${address}', '10000u128'],
      },
      {
        label: 'Approve router for toka_token',
        program: 'toka_token.aleo',
        function: 'approve_public',
        inputs: ['token_router.aleo', '10000u128'],
      },
      {
        label: 'Mint 10000 tokb_token',
        program: 'tokb_token.aleo',
        function: 'mint_public',
        inputs: ['${address}', '10000u128'],
      },
      {
        label: 'Approve router for tokb_token',
        program: 'tokb_token.aleo',
        function: 'approve_public',
        inputs: ['token_router.aleo', '10000u128'],
      },
    ],
  },
];

export function getKnownDispatchProgram(programId: string): DispatchProgramEntry | undefined {
  return KNOWN_DISPATCH_PROGRAMS.find(p => p.program === programId);
}

export function isKnownDispatchProgram(programId: string): boolean {
  return getKnownDispatchProgram(programId) !== undefined;
}

export function getKnownDispatchFunction(
  programId: string,
  functionName: string,
): DispatchFunctionEntry | undefined {
  return getKnownDispatchProgram(programId)?.dispatchFunctions.find(f => f.name === functionName);
}

export const KNOWN_DISPATCH_PROGRAM_IDS: string[] = KNOWN_DISPATCH_PROGRAMS.map(p => p.program);
