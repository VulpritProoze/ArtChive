"""
Image processing utilities for resizing and compressing uploaded images.
"""
import io
from typing import Tuple
from PIL import Image, ImageOps
from django.core.files.uploadedfile import InMemoryUploadedFile


def resize_and_compress_image(
    image_file,
    max_size: Tuple[int, int] = (800, 800),
    quality: int = 85,
    format: str = 'JPEG',
    maintain_aspect_ratio: bool = True,
    crop_to_fit: bool = False
) -> InMemoryUploadedFile:
    """
    Resize and compress an image file while maintaining quality.
    
    Args:
        image_file: Django UploadedFile object
        max_size: Maximum dimensions (width, height) for the output image
        quality: JPEG quality (1-100, higher = better quality but larger file)
        format: Output format ('JPEG', 'PNG', 'WEBP')
        maintain_aspect_ratio: If True, maintains aspect ratio (may add padding)
        crop_to_fit: If True and maintain_aspect_ratio is False, crops to fit exactly
        
    Returns:
        InMemoryUploadedFile: Processed image file
    """
    # Open the image
    img = Image.open(image_file)
    
    # Convert RGBA to RGB if necessary (for JPEG)
    if img.mode in ('RGBA', 'LA', 'P'):
        # Create a white background
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Auto-rotate based on EXIF data
    img = ImageOps.exif_transpose(img)
    
    # Get original dimensions
    original_width, original_height = img.size
    max_width, max_height = max_size
    
    # Calculate new dimensions
    if maintain_aspect_ratio:
        if crop_to_fit:
            # For crop_to_fit, we need to resize to cover the entire area, then crop
            # Calculate scaling factor to cover max_size (use max instead of min)
            width_ratio = max_width / original_width
            height_ratio = max_height / original_height
            ratio = max(width_ratio, height_ratio)  # Use max to cover entire area
            
            new_width = int(original_width * ratio)
            new_height = int(original_height * ratio)
            
            # Resize image to cover the entire area
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Crop to exact size (center crop)
            left = (new_width - max_width) // 2
            top = (new_height - max_height) // 2
            right = left + max_width
            bottom = top + max_height
            img = img.crop((left, top, right, bottom))
        else:
            # Calculate scaling factor to fit within max_size
            width_ratio = max_width / original_width
            height_ratio = max_height / original_height
            ratio = min(width_ratio, height_ratio)
            
            new_width = int(original_width * ratio)
            new_height = int(original_height * ratio)
            
            # Resize image using LANCZOS (highest quality resampling)
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    else:
        # Resize to exact dimensions (may distort) - using LANCZOS for best quality
        img = img.resize((max_width, max_height), Image.Resampling.LANCZOS)
    
    # Save to in-memory buffer
    output = io.BytesIO()
    
    # Use appropriate format and optimize with high quality settings
    if format.upper() == 'JPEG':
        # Use progressive JPEG for better compression at high quality
        # Quality 95-98 is visually lossless - PIL automatically uses better subsampling at high quality
        img.save(
            output, 
            format='JPEG', 
            quality=quality, 
            optimize=True,
            progressive=True  # Progressive JPEG for better compression
        )
    elif format.upper() == 'PNG':
        img.save(output, format='PNG', optimize=True, compress_level=6)  # Balance between size and speed
    elif format.upper() == 'WEBP':
        img.save(output, format='WEBP', quality=quality, method=6, lossless=False)
    else:
        img.save(
            output, 
            format='JPEG', 
            quality=quality, 
            optimize=True,
            progressive=True
        )
    
    # Get file size
    output.seek(0, 2)  # Seek to end
    file_size = output.tell()
    output.seek(0)  # Reset to beginning
    
    # Create new InMemoryUploadedFile
    file_name = image_file.name
    # Change extension if format changed
    if format.upper() == 'WEBP' and not file_name.lower().endswith('.webp'):
        file_name = file_name.rsplit('.', 1)[0] + '.webp'
    elif format.upper() == 'JPEG' and file_name.lower().endswith(('.png', '.gif')):
        file_name = file_name.rsplit('.', 1)[0] + '.jpg'
    
    return InMemoryUploadedFile(
        output,
        'ImageField',
        file_name,
        f'image/{format.lower()}',
        file_size,
        None
    )


def process_profile_picture(image_file) -> InMemoryUploadedFile:
    """
    Process profile picture: resize to 400x400 and compress.
    
    Args:
        image_file: Django UploadedFile object
        
    Returns:
        InMemoryUploadedFile: Processed image file
    """
    return resize_and_compress_image(
        image_file,
        max_size=(400, 400),
        quality=99,  # Near-lossless quality for profile pictures
        format='JPEG',
        maintain_aspect_ratio=True,
        crop_to_fit=True  # Crop to square for profile pictures
    )


def process_post_image(image_file) -> InMemoryUploadedFile:
    """
    Process post image: resize to 1200x1200 and compress.
    
    Args:
        image_file: Django UploadedFile object
        
    Returns:
        InMemoryUploadedFile: Processed image file
    """
    return resize_and_compress_image(
        image_file,
        max_size=(1200, 1200),
        quality=98,  # Near-lossless quality
        format='JPEG',
        maintain_aspect_ratio=True,
        crop_to_fit=False
    )


def process_collective_picture(image_file) -> InMemoryUploadedFile:
    """
    Process collective picture: resize to 800x600 and compress.
    
    Args:
        image_file: Django UploadedFile object
        
    Returns:
        InMemoryUploadedFile: Processed image file
    """
    return resize_and_compress_image(
        image_file,
        max_size=(800, 600),
        quality=98,  # Near-lossless quality
        format='JPEG',
        maintain_aspect_ratio=True,
        crop_to_fit=False
    )


def process_gallery_picture(image_file) -> InMemoryUploadedFile:
    """
    Process gallery picture: resize to 1600x1200 and compress.
    
    Args:
        image_file: Django UploadedFile object
        
    Returns:
        InMemoryUploadedFile: Processed image file
    """
    return resize_and_compress_image(
        image_file,
        max_size=(1600, 1200),
        quality=98,  # Near-lossless quality
        format='JPEG',
        maintain_aspect_ratio=True,
        crop_to_fit=False
    )

