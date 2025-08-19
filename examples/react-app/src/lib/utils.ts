import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parses Leo program code and returns an array of function names
 * @param programCode - The Leo program code as a string
 * @returns Array of function names found in the program
 */
export function parseLeoProgramFunctionNames(programCode: string): string[] {
  if (!programCode || typeof programCode !== 'string') {
    return [];
  }

  const lines = programCode.split('\n');
  const functionNames: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Extract function names from function definitions
    const match = trimmedLine.match(/^function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);
    if (match) {
      functionNames.push(match[1]);
    }
  }

  return functionNames;
}
