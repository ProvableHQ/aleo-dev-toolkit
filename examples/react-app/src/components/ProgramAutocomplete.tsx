import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useAtom } from 'jotai';
import { networkAtom } from '../lib/store/global';
import { useProgramsSearch } from '../lib/hooks/usePrograms';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface ProgramAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAdd: (programId?: string) => void;
  disabled?: boolean;
  selectedPrograms?: string[];
}

export const ProgramAutocomplete = ({
  value,
  onChange,
  onAdd,
  disabled,
  selectedPrograms = [],
}: ProgramAutocompleteProps) => {
  const [network] = useAtom(networkAtom);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: searchResults, isLoading } = useProgramsSearch(network, searchTerm);

  const programs = searchResults?.programs || [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Always reset selection when search term changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSearchTerm(newValue);
    setIsOpen(true);
    // Always reset selection index when typing to prevent auto-selection
    setSelectedIndex(-1);
  };

  const handleCompositionStart = () => {
    // Reset selection when composition starts (for IME input)
    setSelectedIndex(-1);
  };

  const handleCompositionEnd = () => {
    // Reset selection when composition ends
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, programs.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && programs[selectedIndex]) {
          const selectedProgram = programs[selectedIndex];
          if (!selectedPrograms.includes(selectedProgram.id)) {
            onChange(selectedProgram.id);
            setIsOpen(false);
            setSelectedIndex(-1);
            // Automatically add the selected program
            onAdd(selectedProgram.id);
          }
        } else if (value.trim()) {
          onAdd();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
      default:
        // For any other key, reset the selection index to prevent auto-selection
        if (e.key.length === 1) {
          // Single character keys (letters, numbers, etc.)
          setSelectedIndex(-1);
          e.stopPropagation();
        }
        break;
    }
  };

  const handleProgramSelect = (programId: string) => {
    onChange(programId);
    setIsOpen(false);
    setSelectedIndex(-1);
    // Automatically add the selected program
    onAdd(programId);
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder="Enter program name"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          disabled={disabled}
          autoComplete="off"
          spellCheck="false"
          autoCorrect="off"
          autoCapitalize="off"
          data-lpignore="true"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          className="h-8 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:placeholder:text-slate-400 pr-8"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {value && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="h-5 w-5 p-0 dark:hover:bg-slate-600"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover text-popover-foreground border  rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
              Loading programs...
            </div>
          ) : programs.length === 0 && searchTerm.length >= 2 ? (
            <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
              No programs found.
            </div>
          ) : (
            <>
              {programs.map((program, index) => {
                const isSelected = selectedPrograms.includes(program.id);
                return (
                  <div
                    key={program.id}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-accent ${
                      selectedIndex >= 0 && index === selectedIndex
                        ? 'bg-slate-100 dark:bg-slate-700'
                        : ''
                    } ${isSelected ? 'opacity-50' : ''}`}
                    onClick={() => !isSelected && handleProgramSelect(program.id)}
                  >
                    <div className="font-medium text-popover-foreground flex items-center gap-2">
                      {program.id}
                      {isSelected && (
                        <span className="text-xs text-green-600 dark:text-green-400">✓</span>
                      )}
                    </div>
                    {program.name && program.name !== program.id && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {program.name}
                      </div>
                    )}
                  </div>
                );
              })}
              {value.trim() && !programs.some(p => p.id === value.trim()) && (
                <div className="border-t border-slate-200 dark:border-slate-700">
                  <div
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                    onClick={() => {
                      onChange(value.trim());
                      setIsOpen(false);
                      // Automatically add the custom program
                      onAdd(value.trim());
                    }}
                  >
                    <div className="font-medium text-accent-foreground">Add "{value.trim()}"</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Custom program</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
