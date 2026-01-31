import { useState } from 'react';
import { Button } from './ui/button';
import { Copy, Check, Code2 } from 'lucide-react';

interface ProgramCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  programCode: string;
  programName: string;
  functionNames: string[];
}

export function ProgramCodeModal({
  isOpen,
  onClose,
  programCode,
  programName,
  functionNames,
}: ProgramCodeModalProps) {
  const [copied, setCopied] = useState(false);
  const functionCount = functionNames.length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(programCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-border">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" />
              <h2 className="h3 text-card-foreground">Program Code: {programName}</h2>
            </div>
            <span className="body-s text-muted-foreground">
              {functionCount} function{functionCount !== 1 ? 's' : ''} found
              {functionNames.length > 0 && `: ${functionNames.join(', ')}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Code
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
          <div className="bg-muted rounded-lg p-4 border border-border">
            <pre className="label-s text-muted-foreground overflow-x-auto whitespace-pre-wrap normal-case">
              <code>{programCode || 'No program code available'}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
