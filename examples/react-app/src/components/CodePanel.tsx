import { useState, useMemo } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { Button } from './ui/button';
import { Copy, Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface CodePanelProps {
  code: string;
  language?: string;
  /** Dynamic values to substitute in the code (key-value pairs) */
  highlightValues?: Record<string, string>;
  className?: string;
}

export function CodePanel({ code, language = 'tsx', highlightValues, className }: CodePanelProps) {
  const [copied, setCopied] = useState(false);
  const { resolvedTheme } = useTheme();

  // Process code to replace placeholders with actual values
  const processedCode = useMemo(() => {
    if (!highlightValues) return code;

    let result = code;
    Object.entries(highlightValues).forEach(([placeholder, value]) => {
      if (value && value.trim()) {
        const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result.replace(new RegExp(escapedPlaceholder, 'g'), value);
      }
    });
    return result;
  }, [code, highlightValues]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(processedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const theme = resolvedTheme === 'dark' ? themes.oneDark : themes.github;

  return (
    <div
      className={cn(
        'relative rounded-lg border border-border bg-muted/30 overflow-hidden',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
        <span className="label-xs text-muted-foreground">Code</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Code block - always visible */}
      <div className="overflow-auto max-h-[300px]">
        <Highlight theme={theme} code={processedCode.trim()} language={language}>
          {({ className: hlClassName, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={cn(hlClassName, 'text-[13px] leading-relaxed p-4 m-0')}
              style={{ ...style, backgroundColor: 'transparent' }}
            >
              {tokens.map((line, i) => {
                const lineProps = getLineProps({ line });
                return (
                  <div key={i} {...lineProps}>
                    {line.map((token, key) => {
                      const tokenProps = getTokenProps({ token });
                      // Highlight dynamic values with a subtle background
                      const isHighlighted =
                        highlightValues &&
                        Object.values(highlightValues).some(
                          v => v && v.trim() && token.content.includes(v),
                        );
                      return (
                        <span
                          key={key}
                          {...tokenProps}
                          className={cn(
                            tokenProps.className,
                            isHighlighted && 'bg-primary/20 rounded px-0.5 -mx-0.5',
                          )}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}
