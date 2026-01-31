import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface FunctionSelectorProps {
  value: string;
  onChange: (value: string) => void;
  functionNames: string[];
  disabled?: boolean;
  placeholder?: string;
}

export const FunctionSelector = ({
  value,
  onChange,
  functionNames,
  disabled,
  placeholder = 'Enter function name',
}: FunctionSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, functionNames.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && functionNames[selectedIndex]) {
          const selectedFunction = functionNames[selectedIndex];
          onChange(selectedFunction);
          setIsOpen(false);
          setSelectedIndex(-1);
        } else if (value.trim()) {
          onChange(value.trim());
          setIsOpen(false);
          setSelectedIndex(-1);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
      default:
        if (e.key.length === 1) {
          setSelectedIndex(-1);
        }
        break;
    }
  };

  const handleFunctionSelect = (functionName: string) => {
    onChange(functionName);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          autoComplete="off"
          spellCheck="false"
          autoCorrect="off"
          autoCapitalize="off"
          data-lpignore="true"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          className="h-10 body-m pr-8"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {value && (
            <Button size="sm" variant="ghost" onClick={handleClear} className="h-5 w-5 p-0">
              <X className="h-3 w-3" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsOpen(!isOpen)}
            className="h-5 w-5 p-0 hover:bg-accent"
            type="button"
          >
            <ChevronDown
              className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </Button>
        </div>
      </div>

      {isOpen && functionNames.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover text-popover-foreground border rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
          {functionNames.map((functionName, index) => (
            <div
              key={functionName}
              className={`px-3 py-2 body-s cursor-pointer hover:bg-accent ${
                selectedIndex >= 0 && index === selectedIndex ? 'bg-accent' : ''
              }`}
              onClick={() => handleFunctionSelect(functionName)}
            >
              <div className="body-s-bold text-popover-foreground">{functionName}</div>
            </div>
          ))}
          {value.trim() && !functionNames.some(f => f === value.trim()) && (
            <div className="border-t border-border">
              <div
                className="px-3 py-2 body-s cursor-pointer hover:bg-accent"
                onClick={() => {
                  onChange(value.trim());
                  setIsOpen(false);
                }}
              >
                <div className="body-s-bold text-foreground">Use "{value.trim()}"</div>
                <div className="body-s text-muted-foreground">Custom function</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
