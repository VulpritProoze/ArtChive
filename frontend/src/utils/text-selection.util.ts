/**
 * Text Selection Utility
 * Functions for manipulating text selection in textareas
 */

export interface TextSelection {
  text: string;
  start: number;
  end: number;
}

/**
 * Get selected text from textarea
 * @param textarea - The textarea element
 * @returns Object with selected text and selection range
 */
export function getSelectedText(textarea: HTMLTextAreaElement): TextSelection {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value.substring(start, end);

  return { text, start, end };
}

/**
 * Replace selected text in textarea
 * @param textarea - The textarea element
 * @param replacement - The text to replace selection with
 */
export function replaceSelectedText(
  textarea: HTMLTextAreaElement, 
  replacement: string
): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;

  const newValue = value.substring(0, start) + replacement + value.substring(end);
  textarea.value = newValue;

  // Set cursor position after the inserted text
  const newCursorPos = start + replacement.length;
  textarea.setSelectionRange(newCursorPos, newCursorPos);
  
  // Trigger input event to update React state
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Insert text at cursor position
 * @param textarea - The textarea element
 * @param text - The text to insert
 */
export function insertTextAtCursor(
  textarea: HTMLTextAreaElement, 
  text: string
): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;

  const newValue = value.substring(0, start) + text + value.substring(end);
  textarea.value = newValue;

  // Set cursor position after the inserted text
  const newCursorPos = start + text.length;
  textarea.setSelectionRange(newCursorPos, newCursorPos);
  
  // Trigger input event to update React state
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Wrap selected text with prefix and suffix
 * @param textarea - The textarea element
 * @param prefix - Text to insert before selection
 * @param suffix - Text to insert after selection
 */
export function wrapSelectedText(
  textarea: HTMLTextAreaElement, 
  prefix: string, 
  suffix: string
): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selectedText = value.substring(start, end);

  const replacement = prefix + selectedText + suffix;
  const newValue = value.substring(0, start) + replacement + value.substring(end);
  textarea.value = newValue;

  // Set cursor position after the wrapped text
  const newCursorPos = start + replacement.length;
  textarea.setSelectionRange(newCursorPos, newCursorPos);
  
  // Trigger both input and change events to ensure React state updates
  const inputEvent = new Event('input', { bubbles: true, cancelable: true });
  const changeEvent = new Event('change', { bubbles: true, cancelable: true });
  textarea.dispatchEvent(inputEvent);
  textarea.dispatchEvent(changeEvent);
}

/**
 * Insert markdown syntax at cursor, placing cursor between markers if no selection
 * @param textarea - The textarea element
 * @param prefix - Text to insert before (e.g., "**")
 * @param suffix - Text to insert after (e.g., "**")
 * @param placeholder - Placeholder text if no selection (e.g., "text")
 */
export function insertMarkdownSyntax(
  textarea: HTMLTextAreaElement,
  prefix: string,
  suffix: string,
  placeholder: string = ''
): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selectedText = value.substring(start, end);

  if (selectedText) {
    // Wrap selected text
    wrapSelectedText(textarea, prefix, suffix);
  } else {
    // Insert syntax with placeholder and place cursor between markers
    const text = prefix + placeholder + suffix;
    const newValue = value.substring(0, start) + text + value.substring(end);
    textarea.value = newValue;

    // Place cursor between prefix and suffix
    const newCursorPos = start + prefix.length + placeholder.length;
    textarea.setSelectionRange(start + prefix.length, newCursorPos);
    
    // Trigger both input and change events to ensure React state updates
    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
    const changeEvent = new Event('change', { bubbles: true, cancelable: true });
    textarea.dispatchEvent(inputEvent);
    textarea.dispatchEvent(changeEvent);
  }
}


