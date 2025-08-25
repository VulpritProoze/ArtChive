
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