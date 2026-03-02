import { useState } from 'react';
import { Button } from './ui/button';
import { Copy, Check, Code2 } from 'lucide-react';
import { useTheme } from 'next-themes';

interface ProgramCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  programCode: string;
  programName: string;
  functionNames: string[];
}

// Define our syntax highlighting colors using Tailwind classes
const darkThemeColors = {
  keyword: 'text-fuchsia-500',
  string: 'text-green-400',
  plain: 'text-blue-500',
  comment: 'text-slate-500',
  function: 'text-foreground',
  operator: 'text-teal-400',
  punctuation: 'text-foreground',
  annotation: 'text-red-400',
  program: 'text-yellow-400',
  mapping: 'text-orange-300',
  struct: 'text-teal-400',
  record: 'text-orange-300',
  closure: 'text-purple-500',
  opcode: 'text-green-400',
};

const lightThemeColors = {
  keyword: 'text-purple-700',
  string: 'text-green-700',
  plain: 'text-blue-700',
  comment: 'text-slate-500',
  function: 'text-foreground',
  operator: 'text-teal-700',
  punctuation: 'text-slate-700',
  annotation: 'text-red-700',
  program: 'text-amber-700',
  mapping: 'text-orange-700',
  struct: 'text-teal-700',
  record: 'text-orange-700',
  closure: 'text-purple-800',
  opcode: 'text-green-700',
};

interface TokenProps {
  type: keyof typeof darkThemeColors;
  value: string;
  key: string;
}

const Token: React.FC<TokenProps> = ({ type, value }) => {
  const { resolvedTheme } = useTheme();
  const colorClasses = resolvedTheme === 'light' ? lightThemeColors : darkThemeColors;

  return <span className={colorClasses[type]}>{value}</span>;
};

function highlightSyntax(code: string): React.ReactElement[] {
  const regex =
    /(\b(addr0r1intor2|abs|add|and|assert\.eq|assert\.neq|commit\.bhp256|commit\.bhp512|commit\.bhp768|commit\.bhp1024|commit\.ped64|commit\.ped128|div|double|gt|gte|hash\.bhp256|hash\.bhp512|hash\.bhp768|hash\.bhp1024|hash\.ped64|hash\.ped128|hash\.psd2|hash\.psd4|hash\.psd8|inv|is\.eq|is\.neq|lt|lte|mod|mul|nand|neg|nor|not|or|pow|rem|shl|shr|square|sqrt|sub|ternary|xor|program|function|mapping|struct|record|closure|input|cast|call|get|get\.or_use|set|finalize|output|rand\.chacha|branch|position|contains|remove)\b)|(".*?")|(\/\/.*$)|([{}();,])|(\b(true|false)\b)|([0-9_]+u64)|([a-zA-Z0-9_]+\[\w+\])|(\b(\w+)\.(\w+)\b)|([a-zA-Z0-9_]+)/g;
  let match;
  let lastIndex = 0;
  const tokens: React.ReactElement[] = [];

  while ((match = regex.exec(code)) !== null) {
    const matched = match[0];

    // Determine token type based on the matched content
    let type: keyof typeof darkThemeColors = 'plain';

    // Keywords
    if (match[1]) {
      type = 'keyword';
    }
    // Strings
    else if (matched.startsWith('"') && matched.endsWith('"')) {
      type = 'string';
    }
    // Comments
    else if (matched.startsWith('//')) {
      type = 'comment';
    }
    // Punctuation
    else if (/^[{}();,]$/.test(matched)) {
      type = 'punctuation';
    }
    // Boolean
    else if (matched === 'true' || matched === 'false') {
      type = 'keyword';
    }
    // Function calls
    else if (
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(matched) &&
      ['function', 'mapping', 'closure', 'record', 'struct'].includes(matched)
    ) {
      type = matched as keyof typeof darkThemeColors;
    } else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(matched)) {
      type = 'function';
    }

    if (match.index > lastIndex) {
      const value = code.substring(lastIndex, match.index);
      tokens.push(<Token type="plain" value={value} key={`plain-${lastIndex}`} />);
    }

    tokens.push(<Token type={type} value={matched} key={match.index.toString()} />);

    lastIndex = regex.lastIndex;
  }

  if (lastIndex !== code.length) {
    const value = code.substring(lastIndex);
    tokens.push(<Token type="plain" value={value} key={`plain-${lastIndex}`} />);
  }

  return tokens;
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
            <pre className="label-s text-muted-foreground overflow-x-auto whitespace-pre-wrap lowercase">
              <code>{highlightSyntax(programCode) || 'No program code available'}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
