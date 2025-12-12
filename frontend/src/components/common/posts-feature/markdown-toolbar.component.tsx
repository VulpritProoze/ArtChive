import React, { useState, useEffect, useRef } from 'react';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  Heading1, 
  Heading2, 
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Quote,
  Minus,
  Code2,
  ChevronDown
} from 'lucide-react';
import { insertMarkdownSyntax, wrapSelectedText, getSelectedText } from '@utils/text-selection.util';

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  isVisible: boolean;
  onFormat?: (newValue: string) => void;
}

// Supported languages for syntax highlighting
export const SUPPORTED_LANGUAGES = [
  { value: '', label: 'Plain Text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'sql', label: 'SQL' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'scss', label: 'SCSS' },
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'bash', label: 'Bash' },
  { value: 'shell', label: 'Shell' },
  { value: 'powershell', label: 'PowerShell' },
  { value: 'dockerfile', label: 'Dockerfile' },
  { value: 'nginx', label: 'Nginx' },
  { value: 'apache', label: 'Apache' },
  { value: 'diff', label: 'Diff' },
  { value: 'git', label: 'Git' },
];

const DEFAULT_LANGUAGE = 'javascript';

/**
 * MarkdownToolbar Component
 * Provides markdown formatting buttons for text editing
 */
export function MarkdownToolbar({ textareaRef, isVisible, onFormat }: MarkdownToolbarProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>(DEFAULT_LANGUAGE);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLanguageDropdown(false);
      }
    };

    if (showLanguageDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLanguageDropdown]);

  if (!isVisible) return null;

  const handleFormat = (
    prefix: string, 
    suffix: string = prefix, 
    placeholder: string = ''
  ) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const selection = getSelectedText(textarea);

    if (selection.text) {
      // Wrap selected text
      wrapSelectedText(textarea, prefix, suffix);
    } else {
      // Insert syntax with placeholder
      insertMarkdownSyntax(textarea, prefix, suffix, placeholder);
    }
    
    // Notify parent component of the change
    if (onFormat) {
      onFormat(textarea.value);
    }
  };

  const handleInsert = (text: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    
    const newValue = value.substring(0, start) + text + value.substring(end);
    textarea.value = newValue;
    
    const newCursorPos = start + text.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Notify parent component of the change
    if (onFormat) {
      onFormat(newValue);
    }
  };

  const handleInsertCodeBlock = () => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selectedText = value.substring(start, end);
    
    // Build code block with selected language
    const languageTag = selectedLanguage ? `${selectedLanguage}\n` : '\n';
    const codeBlock = `\`\`\`${languageTag}${selectedText || 'code'}\n\`\`\``;
    
    const newValue = value.substring(0, start) + codeBlock + value.substring(end);
    textarea.value = newValue;
    
    // Position cursor inside code block (after language tag and before closing backticks)
    const languagePart = selectedLanguage ? `${selectedLanguage}\n` : '\n';
    const cursorPos = start + 3 + languagePart.length + (selectedText ? selectedText.length : 4);
    textarea.setSelectionRange(cursorPos, cursorPos);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
    
    // Notify parent component of the change
    if (onFormat) {
      onFormat(newValue);
    }
  };

  const buttonClass = "btn btn-sm btn-ghost hover:bg-primary/10 hover:text-primary transition-all p-2";
  const iconClass = "w-4 h-4";

  return (
    <div className="border-b border-base-300 bg-base-200/50 p-3">
      <div className="flex flex-wrap gap-1 items-center">
        {/* Text Formatting */}
        <div className="flex gap-1 border-r border-base-300 pr-2 mr-2">
          <button
            type="button"
            onClick={() => handleFormat('**', '**', 'bold text')}
            className={buttonClass}
            title="Bold (Ctrl+B)"
            aria-label="Bold"
          >
            <Bold className={iconClass} />
          </button>
          <button
            type="button"
            onClick={() => handleFormat('*', '*', 'italic text')}
            className={buttonClass}
            title="Italic (Ctrl+I)"
            aria-label="Italic"
          >
            <Italic className={iconClass} />
          </button>
          <button
            type="button"
            onClick={() => handleFormat('~~', '~~', 'strikethrough')}
            className={buttonClass}
            title="Strikethrough"
            aria-label="Strikethrough"
          >
            <Strikethrough className={iconClass} />
          </button>
          <button
            type="button"
            onClick={() => handleFormat('`', '`', 'code')}
            className={buttonClass}
            title="Inline code"
            aria-label="Inline code"
          >
            <Code className={iconClass} />
          </button>
        </div>

        {/* Headers */}
        <div className="flex gap-1 border-r border-base-300 pr-2 mr-2">
          <button
            type="button"
            onClick={() => handleInsert('# ')}
            className={buttonClass}
            title="Heading 1"
            aria-label="Heading 1"
          >
            <Heading1 className={iconClass} />
          </button>
          <button
            type="button"
            onClick={() => handleInsert('## ')}
            className={buttonClass}
            title="Heading 2"
            aria-label="Heading 2"
          >
            <Heading2 className={iconClass} />
          </button>
          <button
            type="button"
            onClick={() => handleInsert('### ')}
            className={buttonClass}
            title="Heading 3"
            aria-label="Heading 3"
          >
            <Heading3 className={iconClass} />
          </button>
        </div>

        {/* Lists */}
        <div className="flex gap-1 border-r border-base-300 pr-2 mr-2">
          <button
            type="button"
            onClick={() => handleInsert('- ')}
            className={buttonClass}
            title="Unordered list"
            aria-label="Unordered list"
          >
            <List className={iconClass} />
          </button>
          <button
            type="button"
            onClick={() => handleInsert('1. ')}
            className={buttonClass}
            title="Ordered list"
            aria-label="Ordered list"
          >
            <ListOrdered className={iconClass} />
          </button>
        </div>

        {/* Links & Media */}
        <div className="flex gap-1 border-r border-base-300 pr-2 mr-2">
          <button
            type="button"
            onClick={() => handleInsert('[link text](url)')}
            className={buttonClass}
            title="Insert link"
            aria-label="Insert link"
          >
            <LinkIcon className={iconClass} />
          </button>
          <button
            type="button"
            onClick={() => handleInsert('![alt text](image-url)')}
            className={buttonClass}
            title="Insert image"
            aria-label="Insert image"
          >
            <ImageIcon className={iconClass} />
          </button>
        </div>

        {/* Other */}
        <div className="flex gap-1 items-center">
          <button
            type="button"
            onClick={() => handleInsert('> ')}
            className={buttonClass}
            title="Blockquote"
            aria-label="Blockquote"
          >
            <Quote className={iconClass} />
          </button>
          <button
            type="button"
            onClick={() => handleInsert('\n---\n')}
            className={buttonClass}
            title="Horizontal rule"
            aria-label="Horizontal rule"
          >
            <Minus className={iconClass} />
          </button>
          
          {/* Code Block with Language Selector */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex gap-1 items-center">
              <button
                type="button"
                onClick={handleInsertCodeBlock}
                className={buttonClass}
                title="Code block"
                aria-label="Code block"
              >
                <Code2 className={iconClass} />
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                  className={`${buttonClass} flex items-center gap-1 min-w-[100px] justify-between`}
                  title="Select language for code block"
                  aria-label="Select language"
                >
                  <span className="text-xs truncate max-w-[80px]">
                    {SUPPORTED_LANGUAGES.find(l => l.value === selectedLanguage)?.label || 'Plain Text'}
                  </span>
                  <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showLanguageDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto min-w-[180px]">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.value}
                        type="button"
                        onClick={() => {
                          setSelectedLanguage(lang.value);
                          setShowLanguageDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/10 transition-colors ${
                          selectedLanguage === lang.value ? 'bg-primary/20 text-primary font-medium' : 'text-base-content'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

