export function CodePanel({ code }: { code: string; language?: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border p-4 text-xs">
      <code>{code}</code>
    </pre>
  );
}
