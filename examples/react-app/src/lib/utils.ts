import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface FunctionInput {
  name: string;
  type: string;
  visibility: 'public' | 'private';
}

export interface FunctionInfo {
  name: string;
  inputs: FunctionInput[];
  /**
   * True if the function's body contains a `call.dynamic` instruction. Used by
   * the Execute page to reveal the Imports field for any dispatch-using
   * function, including programs not in the curated registry.
   */
  usesDynamicCall: boolean;
}

/**
 * Parses Aleo program source and returns one entry per `function NAME:` block.
 *
 * Inputs are collected only from the leading `input … as …` lines of each
 * function (the existing behavior). The full function body, up to the next
 * top-level `function` / `closure` / `finalize` keyword, is also scanned for
 * the `call.dynamic` instruction so we can flag dispatch-using functions.
 */
export function parseLeoProgramFunctions(programCode: string): FunctionInfo[] {
  if (!programCode || typeof programCode !== 'string') {
    return [];
  }

  const lines = programCode.split('\n');
  const functions: FunctionInfo[] = [];
  let currentFunction: FunctionInfo | null = null;
  let inFunction = false;
  let inFunctionInputs = false;

  // Matches `call.dynamic` as a whole word. Aleo source from the network has
  // no comments, so a plain substring check is acceptable; word boundaries
  // guard against future false positives like `call.dynamic_extra`.
  const dynamicCallPattern = /\bcall\.dynamic\b/;

  // Top-level keywords that terminate the current function's body.
  const isFunctionTerminator = (trimmed: string): boolean =>
    /^function\s+[a-zA-Z_]/.test(trimmed) ||
    /^closure\s+[a-zA-Z_]/.test(trimmed) ||
    trimmed.startsWith('finalize ') ||
    trimmed === 'finalize:' ||
    /^finalize\s+[a-zA-Z_]/.test(trimmed);

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim();

    const functionMatch = trimmedLine.match(/^function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);
    if (functionMatch) {
      if (currentFunction) {
        functions.push(currentFunction);
      }
      currentFunction = {
        name: functionMatch[1],
        inputs: [],
        usesDynamicCall: false,
      };
      inFunction = true;
      inFunctionInputs = true;
      continue;
    }

    if (!inFunction || !currentFunction) {
      continue;
    }

    // Function body terminator: next top-level definition. Push current and stop.
    if (isFunctionTerminator(trimmedLine)) {
      functions.push(currentFunction);
      currentFunction = null;
      inFunction = false;
      inFunctionInputs = false;
      continue;
    }

    // Input collection: only while we're still in the leading input block.
    if (inFunctionInputs && trimmedLine.startsWith('input ')) {
      const inputMatch = trimmedLine.match(
        /input\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+as\s+([a-zA-Z0-9_.]+)\.([a-zA-Z]+)/,
      );
      if (inputMatch) {
        const [, name, type, visibility] = inputMatch;
        currentFunction.inputs.push({
          name,
          type,
          visibility: visibility as 'public' | 'private',
        });
      }
      continue;
    }

    // First non-input, non-comment, non-empty line means we've left the input block.
    if (
      inFunctionInputs &&
      trimmedLine.length > 0 &&
      trimmedLine !== '{' &&
      !trimmedLine.startsWith('//')
    ) {
      inFunctionInputs = false;
    }

    // Scan body for call.dynamic regardless of input-block state.
    if (dynamicCallPattern.test(trimmedLine)) {
      currentFunction.usesDynamicCall = true;
    }
  }

  if (currentFunction) {
    functions.push(currentFunction);
  }

  return functions;
}

/**
 * Parses input text and returns an array of inputs
 * Supports nested objects and arrays
 */
export const parseInputs = (inputText: string): string[] => {
  const lines = inputText.split('\n');
  const inputs: string[] = [];
  let currentInput = '';
  let bracketCount = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim().length === 0) continue;

    // Count brackets and track string state
    for (let j = 0; j < line.length; j++) {
      const char = line[j];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{' || char === '[') {
          bracketCount++;
        } else if (char === '}' || char === ']') {
          bracketCount--;
        }
      }
    }

    // Add line to current input
    if (currentInput) {
      currentInput += '\n' + line;
    } else {
      currentInput = line;
    }

    // If brackets are balanced and we're not in the middle of an object
    if (bracketCount === 0 && !inString) {
      inputs.push(currentInput.trim());
      currentInput = '';
    }
  }

  // Add any remaining input
  if (currentInput.trim()) {
    inputs.push(currentInput.trim());
  }

  return inputs;
};
