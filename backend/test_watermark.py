"""
Test script for watermarking functionality.

Run this script to verify that watermarking is working correctly:
    python manage.py shell < test_watermark.py
    OR
    python manage.py shell
    >>> exec(open('test_watermark.py').read())

Or run directly with:
    python test_watermark.py (after setting up Django environment)
"""
import os
import sys
import django
import io
from PIL import Image
from django.core.files.uploadedfile import InMemoryUploadedFile

# Setup Django environment
if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'artchive.settings.dev')
    django.setup()

from core.models import User
from common.utils.watermark import (
    embed_watermark,
    extract_watermark,
    verify_watermark,
    generate_watermark_payload
)
import uuid


def create_test_image():
    """Create a test image for watermarking."""
    # Create a simple test image
    img = Image.new('RGB', (800, 600), color='red')
    
    # Convert to file-like object
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG', quality=95)
    img_byte_arr.seek(0)
    
    # Create InMemoryUploadedFile
    return InMemoryUploadedFile(
        img_byte_arr,
        'ImageField',
        'test_image.jpg',
        'image/jpeg',
        img_byte_arr.tell(),
        None
    )


def test_watermark_payload():
    """Test watermark payload generation."""
    print("=" * 50)
    print("Testing watermark payload generation...")
    
    user_id = uuid.uuid4()
    payload = generate_watermark_payload(
        user_id=user_id,
        username="test_user",
        post_id=uuid.uuid4(),
    )
    
    print(f"Payload generated: {payload}")
    assert payload['user_id'] == str(user_id)
    assert payload['username'] == "test_user"
    assert 'checksum' in payload
    print("✓ Payload generation test passed!")
    return payload


def test_watermark_embed_extract():
    """Test watermark embedding and extraction."""
    print("\n" + "=" * 50)
    print("Testing watermark embedding and extraction...")
    
    # Get or create a test user
    user, created = User.objects.get_or_create(
        username='test_watermark_user',
        defaults={'email': 'test@example.com'}
    )
    if created:
        user.set_password('testpass123')
        user.save()
        print(f"Created test user: {user.username}")
    
    # Create test image
    test_image = create_test_image()
    print(f"Created test image: {test_image.name}, size: {test_image.size}")
    
    # Embed watermark
    print("\nEmbedding watermark...")
    try:
        watermarked_image = embed_watermark(
            image_file=test_image,
            user_id=user.id,
            username=user.username,
            post_id=uuid.uuid4(),
        )
        print(f"✓ Watermark embedded successfully!")
        print(f"  Watermarked image size: {watermarked_image.size}")
    except Exception as e:
        print(f"✗ Error embedding watermark: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Extract watermark
    print("\nExtracting watermark...")
    try:
        # Save watermarked image to temp file for extraction test
        watermarked_image.seek(0)
        payload = extract_watermark(watermarked_image)
        
        if payload:
            print(f"✓ Watermark extracted successfully!")
            print(f"  User ID: {payload.get('user_id')}")
            print(f"  Username: {payload.get('username')}")
            print(f"  Platform: {payload.get('platform')}")
            
            # Verify it matches
            if payload.get('user_id') == str(user.id):
                print("✓ Extracted user ID matches!")
                return True
            else:
                print(f"✗ User ID mismatch: expected {user.id}, got {payload.get('user_id')}")
                return False
        else:
            print("✗ Failed to extract watermark")
            return False
    except Exception as e:
        print(f"✗ Error extracting watermark: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_watermark_verification():
    """Test watermark verification."""
    print("\n" + "=" * 50)
    print("Testing watermark verification...")
    
    user, created = User.objects.get_or_create(
        username='test_verify_user',
        defaults={'email': 'verify@example.com'}
    )
    if created:
        user.set_password('testpass123')
        user.save()
    
    test_image = create_test_image()
    
    try:
        watermarked_image = embed_watermark(
            image_file=test_image,
            user_id=user.id,
            username=user.username,
        )
        
        watermarked_image.seek(0)
        is_verified = verify_watermark(watermarked_image, user.id)
        
        if is_verified:
            print("✓ Watermark verification passed!")
            return True
        else:
            print("✗ Watermark verification failed")
            return False
    except Exception as e:
        print(f"✗ Error during verification: {e}")
        import traceback
        traceback.print_exc()
        return False


def run_all_tests():
    """Run all watermark tests."""
    print("\n" + "=" * 50)
    print("WATERMARKING FUNCTIONALITY TEST")
    print("=" * 50)
    
    results = []
    
    try:
        results.append(("Payload Generation", test_watermark_payload()))
        results.append(("Embed & Extract", test_watermark_embed_extract()))
        results.append(("Verification", test_watermark_verification()))
    except Exception as e:
        print(f"\n✗ Critical error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Print summary
    print("\n" + "=" * 50)
    print("TEST SUMMARY")
    print("=" * 50)
    for test_name, result in results:
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"{test_name}: {status}")
    
    all_passed = all(result for _, result in results)
    if all_passed:
        print("\n✓ All tests passed!")
    else:
        print("\n✗ Some tests failed")
    
    return all_passed


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)

