/**
 * Converts a string to title case.
 * Handles common edge cases like "digital artist" → "Digital Artist"
 */
const toTitleCase = (str: string): string => {
    return str
      .trim()
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
/**
 * Formats an array of artist types into a clean, title-cased, pipe-separated string.
 * Truncates to show only first 2 types if there are more than 2.
 * Example: ["digital artist", "character designer"] → "Digital Artist | Character Designer"
 * Example: ["digital artist", "character designer", "illustrator"] → "Digital Artist | Character Designer +1"
 *
 * @param artistTypes - Array of artist type strings (may be undefined or empty)
 * @returns Formatted title-cased string, or empty string if input is invalid/empty
 */
export const formatArtistTypesArrToString = (artistTypes?: string[]): string => {
  if (!Array.isArray(artistTypes) || artistTypes.length === 0) {
    return '';
  }

  const cleanedTypes = artistTypes
    .map(type => type.trim())
    .filter(type => type !== '')
    .map(toTitleCase);

  if (cleanedTypes.length > 2) {
    const remaining = cleanedTypes.length - 2;
    return `${cleanedTypes.slice(0, 2).join(' | ')} +${remaining}`;
  }

  return cleanedTypes.join(' | ');
};

export default formatArtistTypesArrToString