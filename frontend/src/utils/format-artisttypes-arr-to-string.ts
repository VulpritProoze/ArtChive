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
   * Example: ["digital artist", "character designer"] → "Digital Artist | Character Designer"
   *
   * @param artistTypes - Array of artist type strings (may be undefined or empty)
   * @returns Formatted title-cased string, or empty string if input is invalid/empty
   */
  export const formatArtistTypesArrToString = (artistTypes?: string[]): string => {
    if (!Array.isArray(artistTypes) || artistTypes.length === 0) {
      return '';
    }
  
    return artistTypes
      .map(type => type.trim())
      .filter(type => type !== '')
      .map(toTitleCase)
      .join(' | ');
  };

export default formatArtistTypesArrToString