// Avatar customization options and data

export interface AvatarOptions {
  skin: string;
  faceShape: string;
  eyes: string;
  eyebrows: string;
  nose: string;
  mouth: string;
  hair: string;
  hairColor: string;
  facialHair: string;
  accessories: string;
  clothing: string;
  background: string;
}

export const defaultAvatarOptions: AvatarOptions = {
  skin: 'light',
  faceShape: 'oval',
  eyes: 'default',
  eyebrows: 'default',
  nose: 'default',
  mouth: 'smile',
  hair: 'short',
  hairColor: '#4A3728',
  facialHair: 'none',
  accessories: 'none',
  clothing: 'casual',
  background: '#E8F4F8',
};

// Skin tones
export const skinTones = {
  light: '#FFE4C4',
  fair: '#F5D7B1',
  medium: '#E1A95F',
  tan: '#C68642',
  brown: '#8D5524',
  dark: '#4A2511',
};

// Face shapes (will determine overall head shape)
export const faceShapes = {
  oval: { width: 180, height: 200, description: 'Oval' },
  round: { width: 190, height: 190, description: 'Round' },
  square: { width: 185, height: 195, description: 'Square' },
  heart: { width: 180, height: 200, description: 'Heart' },
  diamond: { width: 175, height: 205, description: 'Diamond' },
};

// Eyes
export const eyeStyles = {
  default: { description: 'Default', size: 15, shape: 'round' },
  large: { description: 'Large', size: 18, shape: 'round' },
  almond: { description: 'Almond', size: 15, shape: 'almond' },
  squint: { description: 'Squint', size: 12, shape: 'squint' },
  wide: { description: 'Wide', size: 16, shape: 'wide' },
};

// Eyebrows
export const eyebrowStyles = {
  default: { description: 'Default', thickness: 2, curve: 'slight' },
  thin: { description: 'Thin', thickness: 1, curve: 'slight' },
  thick: { description: 'Thick', thickness: 3, curve: 'slight' },
  arched: { description: 'Arched', thickness: 2, curve: 'high' },
  straight: { description: 'Straight', thickness: 2, curve: 'none' },
};

// Nose
export const noseStyles = {
  default: { description: 'Default', size: 'medium', shape: 'straight' },
  small: { description: 'Small', size: 'small', shape: 'button' },
  large: { description: 'Large', size: 'large', shape: 'prominent' },
  pointed: { description: 'Pointed', size: 'medium', shape: 'pointed' },
  wide: { description: 'Wide', size: 'large', shape: 'wide' },
};

// Mouth
export const mouthStyles = {
  smile: { description: 'Smile', expression: 'happy' },
  neutral: { description: 'Neutral', expression: 'neutral' },
  grin: { description: 'Grin', expression: 'grin' },
  laugh: { description: 'Laugh', expression: 'laugh' },
  serious: { description: 'Serious', expression: 'serious' },
};

// Hair styles
export const hairStyles = {
  none: { description: 'Bald' },
  short: { description: 'Short' },
  medium: { description: 'Medium' },
  long: { description: 'Long' },
  curly: { description: 'Curly' },
  wavy: { description: 'Wavy' },
  spiky: { description: 'Spiky' },
  buzz: { description: 'Buzz Cut' },
};

// Hair colors
export const hairColors = {
  black: '#1A1A1A',
  brown: '#4A3728',
  blonde: '#F5E6D3',
  red: '#8B3A3A',
  gray: '#808080',
  white: '#E8E8E8',
  blue: '#4169E1',
  purple: '#8B008B',
  pink: '#FF69B4',
};

// Facial hair
export const facialHairStyles = {
  none: { description: 'None' },
  stubble: { description: 'Stubble' },
  mustache: { description: 'Mustache' },
  beard: { description: 'Beard' },
  goatee: { description: 'Goatee' },
  full: { description: 'Full Beard' },
};

// Accessories
export const accessories = {
  none: { description: 'None' },
  glasses: { description: 'Glasses' },
  sunglasses: { description: 'Sunglasses' },
  hat: { description: 'Hat' },
  cap: { description: 'Cap' },
  headband: { description: 'Headband' },
  earrings: { description: 'Earrings' },
};

// Clothing
export const clothingStyles = {
  casual: { description: 'Casual', color: '#4A90E2' },
  formal: { description: 'Formal', color: '#2C3E50' },
  sporty: { description: 'Sporty', color: '#E74C3C' },
  hoodie: { description: 'Hoodie', color: '#95A5A6' },
  jacket: { description: 'Jacket', color: '#34495E' },
};

// Background patterns
export const backgroundPatterns = {
  solid: { description: 'Solid Color' },
  gradient: { description: 'Gradient' },
  dots: { description: 'Dots' },
  stripes: { description: 'Stripes' },
  waves: { description: 'Waves' },
};

export const AVATAR_CATEGORIES = [
  { id: 'skin', label: 'Skin Tone' },
  { id: 'faceShape', label: 'Face Shape' },
  { id: 'eyes', label: 'Eyes' },
  { id: 'eyebrows', label: 'Eyebrows' },
  { id: 'nose', label: 'Nose' },
  { id: 'mouth', label: 'Mouth' },
  { id: 'hair', label: 'Hair Style' },
  { id: 'hairColor', label: 'Hair Color' },
  { id: 'facialHair', label: 'Facial Hair' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'clothing', label: 'Clothing' },
  { id: 'background', label: 'Background' },
];

export const AVATAR_OPTIONS = {
  skin: Object.keys(skinTones).map(key => ({ value: key, label: key.charAt(0).toUpperCase() + key.slice(1) })),
  faceShape: Object.keys(faceShapes).map(key => ({ value: key, label: key.charAt(0).toUpperCase() + key.slice(1) })),
  eyes: Object.keys(eyeStyles).map(key => ({ value: key, label: key.charAt(0).toUpperCase() + key.slice(1) })),
  eyebrows: Object.keys(eyebrowStyles).map(key => ({ value: key, label: key.charAt(0).toUpperCase() + key.slice(1) })),
  nose: Object.keys(noseStyles).map(key => ({ value: key, label: key.charAt(0).toUpperCase() + key.slice(1) })),
  mouth: Object.keys(mouthStyles).map(key => ({ value: key, label: key.charAt(0).toUpperCase() + key.slice(1) })),
  hair: Object.keys(hairStyles).map(key => ({ value: key, label: key.charAt(0).toUpperCase() + key.slice(1) })),
  hairColor: Object.keys(hairColors).map(key => ({ value: key, label: key.charAt(0).toUpperCase() + key.slice(1) })),
  facialHair: Object.keys(facialHairStyles).map(key => ({ value: key, label: key.charAt(0).toUpperCase() + key.slice(1) })),
  accessories: Object.keys(accessories).map(key => ({ value: key, label: key.charAt(0).toUpperCase() + key.slice(1) })),
  clothing: Object.keys(clothingStyles).map(key => ({ value: key, label: clothingStyles[key as keyof typeof clothingStyles].description })),
  background: [],
};

// Keep for backward compatibility
export const avatarCategories = [
  {
    id: 'skin',
    label: 'Skin Tone',
    icon: '👤',
    options: Object.keys(skinTones),
  },
  {
    id: 'faceShape',
    label: 'Face Shape',
    icon: '😊',
    options: Object.keys(faceShapes),
  },
  {
    id: 'eyes',
    label: 'Eyes',
    icon: '👀',
    options: Object.keys(eyeStyles),
  },
  {
    id: 'eyebrows',
    label: 'Eyebrows',
    icon: '👁️',
    options: Object.keys(eyebrowStyles),
  },
  {
    id: 'nose',
    label: 'Nose',
    icon: '👃',
    options: Object.keys(noseStyles),
  },
  {
    id: 'mouth',
    label: 'Mouth',
    icon: '👄',
    options: Object.keys(mouthStyles),
  },
  {
    id: 'hair',
    label: 'Hair Style',
    icon: '💇',
    options: Object.keys(hairStyles),
  },
  {
    id: 'hairColor',
    label: 'Hair Color',
    icon: '🎨',
    options: Object.keys(hairColors),
  },
  {
    id: 'facialHair',
    label: 'Facial Hair',
    icon: '🧔',
    options: Object.keys(facialHairStyles),
  },
  {
    id: 'accessories',
    label: 'Accessories',
    icon: '👓',
    options: Object.keys(accessories),
  },
  {
    id: 'clothing',
    label: 'Clothing',
    icon: '👕',
    options: Object.keys(clothingStyles),
  },
  {
    id: 'background',
    label: 'Background',
    icon: '🎭',
    type: 'color',
  },
];

