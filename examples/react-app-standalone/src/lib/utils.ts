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
}

/**
 * Parses Leo program code and returns an array of function information including inputs
 * @param programCode - The Leo program code as a string
 * @returns Array of function information with names and inputs
 */
export function parseLeoProgramFunctions(programCode: string): FunctionInfo[] {
  if (!programCode || typeof programCode !== 'string') {
    return [];
  }

  const lines = programCode.split('\n');
  const functions: FunctionInfo[] = [];
  let currentFunction: FunctionInfo | null = null;
  let inFunction = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check for function definition start
    const functionMatch = trimmedLine.match(/^function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);
    if (functionMatch) {
      // Save previous function if exists
      if (currentFunction) {
        functions.push(currentFunction);
      }

      currentFunction = {
        name: functionMatch[1],
        inputs: [],
      };
      inFunction = true;
      continue;
    }

    // Check for finalize function (skip these for input parsing)
    if (trimmedLine.startsWith('finalize ')) {
      inFunction = false;
      continue;
    }

    // Check for input statements within function
    if (inFunction && currentFunction && trimmedLine.startsWith('input ')) {
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
    }

    // Check for function end (empty line or non-input statement)
    if (inFunction && currentFunction && trimmedLine && !trimmedLine.startsWith('input ')) {
      // If we hit a non-input statement, the function definition is complete
      if (trimmedLine !== '{' && !trimmedLine.startsWith('//')) {
        inFunction = false;
      }
    }
  }

  // Add the last function
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
