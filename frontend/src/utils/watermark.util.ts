/**
 * Utility functions for adding ArtChive logo watermark to images on download.
 */

/**
 * Adds a small ArtChive logo watermark to an image and returns a blob URL for download.
 * The watermark is very small and barely visible but still visible.
 * 
 * @param imageUrl - URL of the image to watermark
 * @param logoUrl - URL of the ArtChive logo (defaults to mainLogo.png)
 * @returns Promise that resolves to a blob URL of the watermarked image
 */
export async function addWatermarkToImage(
  imageUrl: string,
  logoUrl: string = '/logo/mainLogo.png'
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Load the main image
    const img = new Image();
    // Set crossOrigin for CORS - try anonymous first, fallback if needed
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Helper function to draw watermark
      const drawWatermark = (logoImg: HTMLImageElement) => {
        try {
          // Create canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          // Set canvas size to match image
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw the main image
          ctx.drawImage(img, 0, 0);
          
          // Calculate watermark size - very small (about 2-3% of image width)
          const watermarkSize = Math.max(
            Math.min(img.width * 0.07, img.height * 0.07),
            20 // Minimum 20px
          );
          
          // Calculate position - bottom right corner with small padding
          const padding = watermarkSize * 0.5;
          const x = canvas.width - watermarkSize - padding;
          const y = canvas.height - watermarkSize - padding;
          
          // Draw watermark with low opacity (barely visible but still visible)
          ctx.globalAlpha = 0.25; // 25% opacity - barely visible
          ctx.drawImage(logoImg, x, y, watermarkSize, watermarkSize);
          
          // Reset alpha
          ctx.globalAlpha = 1.0;
          
          // Convert to blob and create URL
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              resolve(url);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          }, 'image/jpeg', 0.95); // High quality JPEG
        } catch (error) {
          reject(error);
        }
      };

      // Helper function to proceed without watermark
      const proceedWithoutWatermark = () => {
        console.warn('Failed to load watermark logo, proceeding without watermark');
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              resolve(url);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          }, 'image/jpeg', 0.95);
        } catch (error) {
          reject(error);
        }
      };

      // Try to load logo with fallbacks
      const alternativeLogos = [
        logoUrl,
        '/logo/ArtChive_logo.png',
        '/logo/ArtChive_black.png',
        '/logo/ArtChive_transparent(2).png'
      ];
      
      let logoIndex = 0;
      
      const tryLoadLogo = () => {
        if (logoIndex >= alternativeLogos.length) {
          proceedWithoutWatermark();
          return;
        }
        
        const logo = new Image();
        logo.crossOrigin = 'anonymous';
        
        logo.onload = () => {
          drawWatermark(logo);
        };
        
        logo.onerror = () => {
          logoIndex++;
          tryLoadLogo();
        };
        
        logo.src = alternativeLogos[logoIndex];
      };
      
      tryLoadLogo();
    };
    
    img.onerror = () => {
      // Try without crossOrigin if CORS fails
      if (img.crossOrigin === 'anonymous') {
        img.crossOrigin = '';
        img.src = imageUrl;
      } else {
        reject(new Error('Failed to load image. The image may be blocked by CORS policy.'));
      }
    };
    
    img.src = imageUrl;
  });
}

/**
 * Downloads an image with watermark applied.
 * 
 * @param imageUrl - URL of the image to download
 * @param filename - Optional filename for the download (defaults to 'artchive-image.jpg')
 * @param logoUrl - URL of the ArtChive logo
 */
export async function downloadImageWithWatermark(
  imageUrl: string,
  filename: string = 'artchive-image.jpg',
  logoUrl: string = '/logo/mainLogo.png'
): Promise<void> {
  try {
    const watermarkedUrl = await addWatermarkToImage(imageUrl, logoUrl);
    
    // Create download link
    const link = document.createElement('a');
    link.href = watermarkedUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up blob URL after a delay
    setTimeout(() => {
      URL.revokeObjectURL(watermarkedUrl);
    }, 100);
  } catch (error) {
    console.error('Error downloading image with watermark:', error);
    throw error;
  }
}

