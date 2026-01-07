import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from '@theme/CodeBlock';

interface GitHubReadmeProps {
  repo: string;
  branch?: string;
  path: string;
}

export default function GitHubReadme({
  repo,
  branch = 'main',
  path,
}: GitHubReadmeProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;

    fetch(url)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
        }
        return res.text();
      })
      .then(text => {
        // Fix image paths for Docusaurus
        const fixedText = text.replace(
          /!\[Connect Wallet Modal\]\(\.\/docs\/images\/connect-modal\.png\)/g,
          '![Connect Wallet Modal](/images/connect-modal.png)',
        );
        setContent(fixedText);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [repo, branch, path]);

  if (loading) {
    return <div>Loading documentation...</div>;
  }

  if (error) {
    return (
      <div>
        <p>Error loading documentation: {error}</p>
        <p>
          Please check that the repository is public and the path is correct.
        </p>
      </div>
    );
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <CodeBlock language={match[1]} {...props}>
              {String(children).replace(/\n$/, '')}
            </CodeBlock>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

