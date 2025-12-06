/**
 * Utility functions for adding Cloudinary transformations to image URLs
 */

/**
 * Adds Cloudinary transformations to an image URL
 * @param imageUrl - The original image URL
 * @param transformations - Object with transformation parameters
 * @returns The transformed URL, or original URL if not a Cloudinary URL
 */
export function addCloudinaryTransformations(
  imageUrl: string | null | undefined,
  transformations: {
    width?: number;
    height?: number;
    quality?: string; // e.g., 'auto', 'auto:good', 'auto:low', '80'
    format?: string; // e.g., 'auto', 'webp', 'jpg'
    crop?: string; // e.g., 'fill', 'thumb', 'fit'
    gravity?: string; // e.g., 'face', 'center'
    radius?: string; // e.g., 'max' for rounded corners
  }
): string {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return imageUrl || '';
  }

  // Check if it's a Cloudinary URL
  if (!imageUrl.includes('cloudinary.com')) {
    return imageUrl;
  }

  // Split URL to insert transformations
  const parts = imageUrl.split('/upload/');
  if (parts.length !== 2) {
    return imageUrl;
  }

  // Build transformation string
  const transformParts: string[] = [];

  if (transformations.width) {
    transformParts.push(`w_${transformations.width}`);
  }
  if (transformations.height) {
    transformParts.push(`h_${transformations.height}`);
  }
  if (transformations.crop) {
    transformParts.push(`c_${transformations.crop}`);
  }
  if (transformations.gravity) {
    transformParts.push(`g_${transformations.gravity}`);
  }
  if (transformations.quality) {
    transformParts.push(`q_${transformations.quality}`);
  }
  if (transformations.format) {
    transformParts.push(`f_${transformations.format}`);
  }
  if (transformations.radius) {
    transformParts.push(`r_${transformations.radius}`);
  }

  // If no transformations, return original URL
  if (transformParts.length === 0) {
    return imageUrl;
  }

  // Reconstruct URL with transformations
  const transformString = transformParts.join(',');
  return `${parts[0]}/upload/${transformString}/${parts[1]}`;
}

/**
 * Optimizes a gallery picture URL with auto format
 * @param imageUrl - The gallery picture URL
 * @returns Optimized URL with auto format
 */
export function optimizeGalleryPicture(imageUrl: string | null | undefined): string {
  return addCloudinaryTransformations(imageUrl, {
    format: 'auto',
  });
}

/**
 * Optimizes a creator profile picture URL with auto format and low quality
 * @param imageUrl - The profile picture URL
 * @returns Optimized URL with auto format and low quality
 */
export function optimizeProfilePicture(imageUrl: string | null | undefined): string {
  return addCloudinaryTransformations(imageUrl, {
    format: 'auto',
    quality: 'auto:low',
  });
}

