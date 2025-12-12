/**
 * Mention Parser Utility
 * Functions for parsing and validating @mentions in text
 */

export interface Mention {
  username: string;
  startIndex: number;
  endIndex: number;
}

export interface ValidationResult {
  valid: Mention[];
  invalid: string[];
}

/**
 * Extract all @mentions from text
 * @param text - The text to parse
 * @returns Array of mention objects with username and position
 */
export function parseMentions(text: string): Mention[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: Mention[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      username: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return mentions;
}

/**
 * Convert @mentions to markdown links
 * @param text - The text to process
 * @returns Text with @mentions converted to markdown links
 */
export function convertMentionsToMarkdown(text: string): string {
  return text.replace(/@(\w+)/g, '[@$1](/profile/$1)');
}

/**
 * Validate mentions against a list of existing users
 * @param text - The text containing mentions
 * @param existingUsers - Array of user objects with username property
 * @returns Validation result with valid and invalid mentions
 */
export function validateMentions(
  text: string, 
  existingUsers: Array<{ username: string }>
): ValidationResult {
  const mentions = parseMentions(text);
  const validUsernames = new Set(existingUsers.map(u => u.username.toLowerCase()));
  
  const valid: Mention[] = [];
  const invalid: string[] = [];

  mentions.forEach(mention => {
    if (validUsernames.has(mention.username.toLowerCase())) {
      valid.push(mention);
    } else {
      invalid.push(mention.username);
    }
  });

  return { valid, invalid };
}

/**
 * Get unique usernames from text
 * @param text - The text to extract usernames from
 * @returns Array of unique usernames (case-insensitive)
 */
export function getUniqueMentions(text: string): string[] {
  const mentions = parseMentions(text);
  const uniqueUsernames = new Set<string>();
  
  mentions.forEach(mention => {
    uniqueUsernames.add(mention.username.toLowerCase());
  });

  return Array.from(uniqueUsernames);
}


