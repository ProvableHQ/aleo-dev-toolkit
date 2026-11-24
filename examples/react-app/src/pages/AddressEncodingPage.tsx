import { AddressEncoding } from '@/components/functions/AddressEncoding';
import { CodePanel } from '@/components/CodePanel';
import { codeExamples } from '@/lib/codeExamples';

export function AddressEncodingPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="h2">Address encoding</h1>
      <p>Request a public commitment for the connected Aleo account.</p>
      <AddressEncoding />
      <CodePanel code={codeExamples.addressEncoding} language="tsx" />
    </div>
  );
}
