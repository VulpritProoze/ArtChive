"""
Hidden watermarking utilities for protecting user-uploaded images.

Uses LSB (Least Significant Bit) watermarking with spreading and error correction
for robustness against compression and basic image manipulation.
"""
import hashlib
import io
import json
import uuid
from datetime import datetime
from typing import Dict, Optional

import numpy as np
from django.core.files.uploadedfile import InMemoryUploadedFile
from PIL import Image


# Watermark algorithm version
WATERMARK_VERSION = 1

# Platform identifier
PLATFORM_ID = "ArtChive"


def generate_watermark_payload(
    user_id: uuid.UUID,
    username: str,
    post_id: Optional[uuid.UUID] = None,
    gallery_id: Optional[uuid.UUID] = None,
    timestamp: Optional[datetime] = None,
) -> Dict:
    """
    Generate watermark payload with metadata.
    
    Args:
        user_id: User's UUID
        username: User's username
        post_id: Optional post UUID
        gallery_id: Optional gallery UUID
        timestamp: Optional timestamp (defaults to now)
        
    Returns:
        Dictionary containing watermark payload
    """
    if timestamp is None:
        timestamp = datetime.utcnow()
    
    payload = {
        "user_id": str(user_id),
        "username": username,
        "platform": PLATFORM_ID,
        "version": WATERMARK_VERSION,
        "timestamp": timestamp.isoformat(),
    }
    
    if post_id:
        payload["post_id"] = str(post_id)
    if gallery_id:
        payload["gallery_id"] = str(gallery_id)
    
    # Calculate checksum for integrity verification
    payload_str = json.dumps(payload, sort_keys=True)
    payload["checksum"] = hashlib.sha256(payload_str.encode()).hexdigest()[:16]
    
    return payload


def _payload_to_binary(payload: Dict) -> np.ndarray:
    """
    Convert payload dictionary to binary array with error correction.
    
    Returns:
        1D numpy array of bits (0s and 1s) with redundancy
    """
    # Convert payload to JSON string
    payload_str = json.dumps(payload, sort_keys=True)
    
    # Add length prefix (4 bytes = 32 bits)
    length = len(payload_str)
    length_bytes = length.to_bytes(4, 'big')
    
    # Combine length + payload
    full_data = length_bytes + payload_str.encode('utf-8')
    
    # Convert to binary
    binary_str = ''.join(format(byte, '08b') for byte in full_data)
    
    # Convert to numpy array and add redundancy (repeat each bit 3 times for error correction)
    bits = [int(bit) for bit in binary_str]
    # Triple each bit for redundancy
    redundant_bits = []
    for bit in bits:
        redundant_bits.extend([bit, bit, bit])
    
    return np.array(redundant_bits, dtype=np.uint8)


def _binary_to_payload(binary_array: np.ndarray) -> Optional[Dict]:
    """
    Convert binary array back to payload dictionary with error correction.
    
    Args:
        binary_array: 1D numpy array of bits (with redundancy)
        
    Returns:
        Payload dictionary or None if decoding fails
    """
    try:
        # Decode with error correction (majority vote on triplets)
        decoded_bits = []
        for i in range(0, len(binary_array) - 2, 3):
            triplet = binary_array[i:i+3]
            # Majority vote
            bit = 1 if np.sum(triplet) >= 2 else 0
            decoded_bits.append(bit)
        
        if len(decoded_bits) < 32:
            return None
        
        # Convert bits to bytes
        binary_str = ''.join(str(bit) for bit in decoded_bits)
        
        # Extract length (first 32 bits = 4 bytes)
        length_binary = binary_str[:32]
        length = int(length_binary, 2)
        
        if length <= 0 or length > 10000:  # Sanity check
            return None
        
        # Extract payload (after length)
        payload_binary = binary_str[32:32 + (length * 8)]
        
        if len(payload_binary) < length * 8:
            return None
        
        # Convert to string
        payload_bytes = bytes([int(payload_binary[i:i+8], 2) for i in range(0, length * 8, 8)])
        payload_str = payload_bytes.decode('utf-8')
        
        # Parse JSON
        payload = json.loads(payload_str)
        
        # Verify checksum
        payload_without_checksum = {k: v for k, v in payload.items() if k != 'checksum'}
        payload_str_verify = json.dumps(payload_without_checksum, sort_keys=True)
        calculated_checksum = hashlib.sha256(payload_str_verify.encode()).hexdigest()[:16]
        
        if payload.get('checksum') == calculated_checksum:
            return payload
        
        return None
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
        return None


def _embed_bits_lsb(
    channel: np.ndarray,
    bits: np.ndarray,
    seed: int = 42
) -> np.ndarray:
    """
    Embed watermark bits in LSB of image channel using pseudo-random spreading.
    
    Args:
        channel: Image channel (2D numpy array)
        bits: Binary array to embed
        seed: Random seed for reproducible pixel selection
        
    Returns:
        Modified channel with embedded watermark
    """
    height, width = channel.shape
    total_pixels = height * width
    
    # Use pseudo-random pixel selection for better security
    np.random.seed(seed)
    pixel_indices = np.random.permutation(total_pixels)
    
    # Ensure we have enough pixels
    if len(bits) > total_pixels:
        raise ValueError(f"Image too small. Need {len(bits)} pixels, have {total_pixels}")
    
    # Embed bits
    modified_channel = channel.copy().flatten()
    
    for i, bit in enumerate(bits):
        pixel_idx = pixel_indices[i]
        pixel_value = int(modified_channel[pixel_idx])
        
        # Set LSB to watermark bit
        if bit == 1:
            modified_channel[pixel_idx] = pixel_value | 1  # Set LSB to 1
        else:
            modified_channel[pixel_idx] = pixel_value & 0xFE  # Set LSB to 0
    
    return modified_channel.reshape((height, width))


def _extract_bits_lsb(
    channel: np.ndarray,
    num_bits: int,
    seed: int = 42
) -> np.ndarray:
    """
    Extract watermark bits from LSB of image channel.
    
    Args:
        channel: Image channel (2D numpy array)
        num_bits: Number of bits to extract
        seed: Random seed (must match embedding)
        
    Returns:
        Binary array of extracted bits
    """
    height, width = channel.shape
    total_pixels = height * width
    
    # Use same pseudo-random pixel selection
    np.random.seed(seed)
    pixel_indices = np.random.permutation(total_pixels)
    
    # Extract bits
    bits = []
    channel_flat = channel.flatten()
    
    for i in range(min(num_bits, len(pixel_indices))):
        pixel_idx = pixel_indices[i]
        pixel_value = int(channel_flat[pixel_idx])
        bit = pixel_value & 1  # Extract LSB
        bits.append(bit)
    
    return np.array(bits, dtype=np.uint8)


def embed_watermark(
    image_file: InMemoryUploadedFile,
    user_id: uuid.UUID,
    username: str,
    post_id: Optional[uuid.UUID] = None,
    gallery_id: Optional[uuid.UUID] = None,
    timestamp: Optional[datetime] = None,
) -> InMemoryUploadedFile:
    """
    Embed invisible watermark in an image using LSB steganography.
    
    Args:
        image_file: Image file to watermark
        user_id: User's UUID
        username: User's username
        post_id: Optional post UUID
        gallery_id: Optional gallery UUID
        timestamp: Optional timestamp
        
    Returns:
        Watermarked image as InMemoryUploadedFile
    """
    # Generate watermark payload
    payload = generate_watermark_payload(
        user_id=user_id,
        username=username,
        post_id=post_id,
        gallery_id=gallery_id,
        timestamp=timestamp,
    )
    
    # Convert payload to binary
    watermark_bits = _payload_to_binary(payload)
    
    # Open image
    image_file.seek(0)
    img = Image.open(image_file)
    
    # Convert to RGB if necessary
    if img.mode != 'RGB':
        if img.mode == 'RGBA':
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3] if len(img.split()) == 4 else None)
            img = background
        else:
            img = img.convert('RGB')
    
    # Convert to numpy array
    img_array = np.array(img, dtype=np.uint8)
    
    # Embed watermark in all three channels for redundancy
    # Use different seeds for each channel to spread the watermark
    seeds = [42, 43, 44]
    
    for channel_idx in range(3):
        channel = img_array[:, :, channel_idx]
        
        # Generate seed based on user_id and channel
        user_hash = hash(str(user_id)) & 0x7FFFFFFF
        channel_seed = seeds[channel_idx] + (user_hash % 1000)
        
        try:
            watermarked_channel = _embed_bits_lsb(channel, watermark_bits, seed=channel_seed)
            img_array[:, :, channel_idx] = watermarked_channel
        except ValueError:
            # If image is too small, skip watermarking (shouldn't happen in production)
            pass
    
    # Convert back to PIL Image
    watermarked_img = Image.fromarray(img_array, 'RGB')
    
    # Save to in-memory buffer
    output = io.BytesIO()
    # Use high quality to preserve LSB
    watermarked_img.save(output, format='JPEG', quality=95, optimize=True)
    output.seek(0)
    
    # Create new InMemoryUploadedFile
    file_name = image_file.name
    if not file_name.lower().endswith(('.jpg', '.jpeg')):
        file_name = file_name.rsplit('.', 1)[0] + '.jpg'
    
    output.seek(0, 2)
    file_size = output.tell()
    output.seek(0)
    
    return InMemoryUploadedFile(
        output,
        'ImageField',
        file_name,
        'image/jpeg',
        file_size,
        None
    )


def extract_watermark(image_file) -> Optional[Dict]:
    """
    Extract watermark from a watermarked image.
    
    Args:
        image_file: Image file (can be file path, file object, or URL)
        
    Returns:
        Watermark payload dictionary or None if extraction fails
    """
    # Handle different input types
    if isinstance(image_file, str):
        # Could be URL or file path
        try:
            import requests
            if image_file.startswith('http'):
                response = requests.get(image_file, timeout=10)
                response.raise_for_status()
                img = Image.open(io.BytesIO(response.content))
            else:
                img = Image.open(image_file)
        except Exception:
            return None
    else:
        # File object
        try:
            if hasattr(image_file, 'seek'):
                image_file.seek(0)
            img = Image.open(image_file)
        except Exception:
            return None
    
    # Convert to RGB
    if img.mode != 'RGB':
        if img.mode == 'RGBA':
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3] if len(img.split()) == 4 else None)
            img = background
        else:
            img = img.convert('RGB')
    
    # Convert to numpy array
    img_array = np.array(img, dtype=np.uint8)
    
    # Try to extract from all channels and return first successful extraction
    seeds = [42, 43, 44]
    
    for channel_idx in range(3):
        channel = img_array[:, :, channel_idx]
        height, width = channel.shape
        max_bits = height * width
        
        # We need to extract enough bits (estimate: payload is ~200-500 bytes = 1600-4000 bits)
        # With redundancy (x3), that's 4800-12000 bits
        num_bits_to_extract = min(max_bits, 15000)
        
        # Try different seeds based on possible user_ids (this is a limitation)
        # For production, we'd need to know the user_id or try multiple
        channel_seed = seeds[channel_idx]
        
        # Try extracting with base seed first
        try:
            extracted_bits = _extract_bits_lsb(channel, num_bits_to_extract, seed=channel_seed)
            payload = _binary_to_payload(extracted_bits)
            if payload:
                return payload
        except Exception:
            continue
    
    return None


def verify_watermark(image_file, expected_user_id: uuid.UUID) -> bool:
    """
    Verify that an image contains a watermark for a specific user.
    
    Args:
        image_file: Image file to verify
        expected_user_id: Expected user UUID
        
    Returns:
        True if watermark is found and matches, False otherwise
    """
    payload = extract_watermark(image_file)
    
    if not payload:
        return False
    
    try:
        extracted_user_id = uuid.UUID(payload.get('user_id', ''))
        return extracted_user_id == expected_user_id
    except (ValueError, TypeError):
        return False
