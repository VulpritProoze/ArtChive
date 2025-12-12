import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import useToggleTheme from '@hooks/use-theme';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  inline?: boolean; // If true, renders inline without block-level elements
}

/**
 * MarkdownRenderer Component
 * Renders markdown content with support for links, GitHub Flavored Markdown,
 * and syntax highlighting for code blocks (Python, Java, JavaScript)
 */
export function MarkdownRenderer({ 
  content, 
  className = '',
  inline = false
}: MarkdownRendererProps) {
  const { isDarkMode } = useToggleTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Supported languages for syntax highlighting (expanded list)
  const supportedLanguages = [
    'javascript', 'js', 'typescript', 'ts',
    'python', 'py', 'java', 'cpp', 'c', 'csharp', 'cs',
    'go', 'rust', 'php', 'ruby', 'rb', 'swift', 'kotlin',
    'sql', 'html', 'css', 'scss', 'json', 'xml', 'yaml', 'yml',
    'markdown', 'md', 'bash', 'sh', 'shell', 'powershell', 'ps1',
    'dockerfile', 'nginx', 'apache', 'diff', 'git'
  ];

  // Get language from className (e.g., "language-python" -> "python")
  const getLanguage = (className?: string): string | undefined => {
    if (!className) return undefined;
    const match = /language-(\w+)/.exec(className);
    if (!match) return undefined;
    const lang = match[1].toLowerCase();
    // Normalize language names
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'cs': 'csharp',
      'rb': 'ruby',
      'yml': 'yaml',
      'md': 'markdown',
      'sh': 'bash',
      'ps1': 'powershell',
    };
    const normalizedLang = languageMap[lang] || lang;
    return supportedLanguages.includes(normalizedLang) ? normalizedLang : undefined;
  };

  // For inline mode, use span instead of div and adjust prose classes
  const Wrapper = inline ? 'span' : 'div';
  const wrapperClassName = inline 
    ? `prose prose-sm max-w-none inline ${className}` 
    : `prose prose-sm max-w-none ${className}`;

  return (
    <Wrapper className={wrapperClassName}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        // Custom link component for regular links
        a: ({ node, href, children, ...props }) => {
          // Regular external links
          return (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
              {...props}
            >
              {children}
            </a>
          );
        },
        // Style code blocks with syntax highlighting
        code: ({ node, inline, className, children, ...props }: any) => {
          const match = /language-(\w+)/.exec(className || '');
          const language = getLanguage(className);
          
          // Inline code
          if (inline || !match || !language) {
            return (
              <code 
                className="!bg-base-300 !font-bold text-red-700 dark:text-red-600 px-1.5 py-0.5 rounded text-sm font-mono" 
                {...props}
              >
                {children}
              </code>
            );
          }

          // Code block with syntax highlighting
          if (mounted) {
            const themeStyle = isDarkMode ? oneDark : oneLight;
            
            // Create a modified style that removes background colors
            const modifiedStyle: any = {};
            Object.keys(themeStyle).forEach((key) => {
              const style = (themeStyle as any)[key];
              modifiedStyle[key] = {
                ...style,
                background: 'transparent',
                backgroundColor: 'transparent',
              };
            });

            // Custom style with transparent background so parent theme shows through
            const customStyle = {
              margin: 0,
              padding: '1rem',
              background: 'transparent',
              backgroundColor: 'transparent',
              fontSize: '0.875rem',
              lineHeight: '1.5',
            };

            return (
              <div className="my-4 rounded-lg overflow-hidden border border-base-300">
                <div className="syntax-highlighter-wrapper">
                  <SyntaxHighlighter
                    language={language}
                    style={modifiedStyle}
                    customStyle={customStyle}
                    PreTag="pre"
                    codeTagProps={{
                      style: {
                        background: 'transparent',
                        backgroundColor: 'transparent',
                      }
                    }}
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                </div>
              </div>
            );
          }

          // Fallback during SSR or before mount
          return (
            <pre 
              className="p-4 rounded-lg overflow-x-auto border border-base-300 my-4"
              style={{
                backgroundColor: isDarkMode ? 'oklch(10% 0 0)' : 'oklch(100% 0 0)',
              }}
            >
              <code className={`${className} text-sm font-mono text-base-content`} {...props}>
                {children}
              </code>
            </pre>
          );
        },
        // Style blockquotes
        blockquote: ({ children, ...props }) => (
          <blockquote 
            className="border-l-4 border-primary pl-4 italic text-base-content/70 my-4" 
            {...props}
          >
            {children}
          </blockquote>
        ),
      }}
      >
        {content}
      </ReactMarkdown>
    </Wrapper>
  );
}

