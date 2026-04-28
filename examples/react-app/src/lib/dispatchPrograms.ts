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
  },
];

export function getKnownDispatchProgram(
  programId: string,
): DispatchProgramEntry | undefined {
  return KNOWN_DISPATCH_PROGRAMS.find(p => p.program === programId);
}

export function isKnownDispatchProgram(programId: string): boolean {
  return getKnownDispatchProgram(programId) !== undefined;
}

export function getKnownDispatchFunction(
  programId: string,
  functionName: string,
): DispatchFunctionEntry | undefined {
  return getKnownDispatchProgram(programId)?.dispatchFunctions.find(
    f => f.name === functionName,
  );
}

export const KNOWN_DISPATCH_PROGRAM_IDS: string[] = KNOWN_DISPATCH_PROGRAMS.map(
  p => p.program,
);
