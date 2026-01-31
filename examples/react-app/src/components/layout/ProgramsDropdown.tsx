import { useState } from 'react';
import { useAtom } from 'jotai';
import { Code, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProgramAutocomplete } from '@/components/ProgramAutocomplete';
import { programsAtom } from '@/lib/store/global';

export function ProgramsDropdown() {
  const [programs, setPrograms] = useAtom(programsAtom);
  const [newProgram, setNewProgram] = useState('');

  const handleAddProgram = (programId?: string) => {
    const programToAdd = programId || newProgram.trim();
    if (programToAdd && !programs.includes(programToAdd)) {
      setPrograms([...programs, programToAdd]);
      setNewProgram('');
    }
  };

  const handleRemoveProgram = (programToRemove: string) => {
    setPrograms(programs.filter(p => p !== programToRemove));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2">
          <Code className="h-4 w-4" />
          <span className="hidden sm:inline label-xs">Programs</span>
          {programs.length > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px] font-medium min-w-[18px] text-center">
              {programs.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 overflow-visible">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <DropdownMenuLabel className="px-0 body-m-bold normal-case">
            Allowed Programs
          </DropdownMenuLabel>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p>
                  Programs your dApp will interact with. Transactions for unlisted programs will be
                  rejected. If empty, all transactions prompt for approval.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="px-2 py-1.5">
          <div className="flex gap-1 mb-2">
            <ProgramAutocomplete
              value={newProgram}
              onChange={setNewProgram}
              onAdd={handleAddProgram}
              disabled={false}
              selectedPrograms={programs}
            />
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {programs.length === 0 ? (
              <p className="body-s text-muted-foreground px-1">No programs added</p>
            ) : (
              programs.map(program => (
                <div
                  key={program}
                  className="flex items-center justify-between body-s bg-muted/50 rounded px-2 py-1"
                >
                  <span className="truncate">{program}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveProgram(program)}
                    className="h-5 w-5 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
