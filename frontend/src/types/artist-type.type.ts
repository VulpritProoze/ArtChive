
export type ArtistType = 
  | "visual arts"
  | "digital & new media arts"
  | "literary arts"
  | "performance arts"
  | "music art"
  | "culinary art"
  | "functional art"
  | "environmental art"
  | "film art"
  | "cross-disciplinary art";

// for runtime use
export const ARTIST_TYPE_VALUES = [
    "visual arts",
    "digital & new media arts",
    "literary arts",
    "performance arts",
    "music art",
    "culinary art",
    "functional art",
    "environmental art",
    "film art",
    "cross-disciplinary art",
] as const;

/**
 * Artist Type Image Keywords Mapping
 * 
 * This object maps each artist type to comma-separated keywords used for fetching
 * relevant images from image APIs (e.g., Lorem Flickr).
 * 
 * How to define keywords:
 * 1. Use 2-4 relevant keywords separated by commas
 * 2. Keywords should be related to the artist type (e.g., "visual arts" → "painting,art,canvas")
 * 3. Use common, searchable terms that image APIs can understand
 * 4. Keep keywords concise and specific to the art type
 * 5. If adding a new artist type, add it to both ARTIST_TYPE_VALUES and ARTIST_TYPE_KEYWORDS
 * 
 * Example:
 * - "visual arts": "painting,art,canvas" → searches for images related to painting, art, and canvas
 * - "music art": "music,instruments,concert" → searches for images related to music, instruments, and concerts
 * 
 * Note: Keywords are used in image URLs like: https://loremflickr.com/120/120/{keywords}
 */
export const ARTIST_TYPE_KEYWORDS: Record<ArtistType, string> = {
  "visual arts": "painting,art,canvas",
  "digital & new media arts": "digital,art,technology",
  "literary arts": "books,writing,literature",
  "performance arts": "theater,stage,performance",
  "music art": "music,instruments,concert",
  "culinary art": "food,cooking,culinary",
  "functional art": "design,furniture,craft",
  "environmental art": "nature,environment,landscape",
  "film art": "cinema,film,movie",
  "cross-disciplinary art": "art,creative,abstract",
} as const;