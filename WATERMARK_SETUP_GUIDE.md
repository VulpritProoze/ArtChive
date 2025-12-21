# Watermark Implementation Setup Guide

This guide will help you complete the setup and testing of the watermarking feature.

## Prerequisites

1. Ensure you have Python and Django environment set up
2. Database connection configured
3. Required Python packages installed

## Step 1: Install Dependencies

Install the required dependency:

```bash
cd backend
pip install numpy==2.1.3
```

Or install all dependencies:

```bash
pip install -r requirements.txt
```

## Step 2: Create Database Migration

Run the following commands to create and apply the database migration for the `WatermarkRecord` model:

```bash
cd backend
python manage.py makemigrations core
python manage.py migrate
```

This will:
- Create a new migration file for the `WatermarkRecord` model
- Apply the migration to create the `core_watermarkrecord` table in your database

## Step 3: Verify Installation

Check that the migration was created successfully:

```bash
python manage.py showmigrations core
```

You should see a new migration file listed (e.g., `0008_watermarkrecord.py`).

## Step 4: Test Watermarking Functionality

### Option A: Using the Test Script

Run the provided test script:

```bash
cd backend
python manage.py shell
```

Then in the Django shell:

```python
exec(open('test_watermark.py').read())
```

### Option B: Manual Testing

Test watermarking manually:

```python
python manage.py shell
```

```python
from core.models import User
from common.utils.watermark import embed_watermark, extract_watermark
from django.core.files.uploadedfile import InMemoryUploadedFile
from PIL import Image
import io

# Get a test user
user = User.objects.first()

# Create a test image
img = Image.new('RGB', (800, 600), color='blue')
img_byte_arr = io.BytesIO()
img.save(img_byte_arr, format='JPEG')
img_byte_arr.seek(0)

test_image = InMemoryUploadedFile(
    img_byte_arr, 'ImageField', 'test.jpg', 'image/jpeg', 
    img_byte_arr.tell(), None
)

# Embed watermark
watermarked = embed_watermark(
    image_file=test_image,
    user_id=user.id,
    username=user.username,
)

# Extract watermark
watermarked.seek(0)
payload = extract_watermark(watermarked)
print(f"Extracted payload: {payload}")
```

### Option C: Using the Management Command

Test watermark verification using the management command:

```bash
# First, upload an image through the API to get a URL
# Then verify it:
python manage.py verify_watermark <image_url> --extract
```

## Step 5: Test API Endpoint

Test the watermark verification API endpoint:

1. Start the Django development server:

```bash
python manage.py runserver
```

2. Make a POST request to verify a watermark:

```bash
curl -X POST http://localhost:8000/api/watermark/verify/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{"image_url": "https://your-image-url.com/image.jpg"}'
```

Or using Python requests:

```python
import requests

response = requests.post(
    'http://localhost:8000/api/watermark/verify/',
    headers={
        'Authorization': 'Bearer <your_token>',
        'Content-Type': 'application/json',
    },
    json={'image_url': 'https://your-image-url.com/image.jpg'}
)
print(response.json())
```

## Step 6: Verify Integration

### Test Post Image Upload

1. Create a post with an image through the API
2. Check the database for a `WatermarkRecord` entry:

```python
from core.models import WatermarkRecord
records = WatermarkRecord.objects.filter(content_type='post')
print(f"Found {records.count()} post watermark records")
```

### Test Gallery Image Upload

1. Upload a gallery image through the API
2. Check for watermark records:

```python
records = WatermarkRecord.objects.filter(content_type='gallery')
print(f"Found {records.count()} gallery watermark records")
```

## Step 7: Admin Interface

1. Access the Django admin panel: `http://localhost:8000/admin/`
2. Navigate to "Core" → "Watermark Records"
3. You should see all watermark records listed there

## Troubleshooting

### Import Errors

If you encounter import errors, ensure:
- All dependencies are installed: `pip install -r requirements.txt`
- Django environment is properly configured
- You're running commands from the `backend` directory

### Migration Errors

If migrations fail:
- Check that the database is accessible
- Verify Django settings are correct
- Check for any syntax errors in `backend/core/models.py`

### Watermark Extraction Fails

If watermark extraction fails:
- Ensure images are large enough (minimum ~800x600 recommended)
- Check that images haven't been heavily compressed or modified
- Verify the image format is JPEG

### Performance Issues

If watermarking is slow:
- This is normal - watermarking adds ~200-500ms per image
- Consider async processing for production use
- Monitor server resources

## Next Steps

After setup is complete:

1. **Write Unit Tests**: Create comprehensive unit tests for watermarking
2. **Frontend Integration**: Add UI indicators for watermark status
3. **Documentation**: Update user-facing documentation about watermarking
4. **Privacy Policy**: Update privacy policy to mention watermarking
5. **Performance Testing**: Test with various image sizes and formats
6. **Robustness Testing**: Test watermark survival after compression/resizing

## Support

For issues or questions:
1. Check the test script output for detailed error messages
2. Review the `HIDDEN_WATERMARK_PLAN.md` document
3. Check Django logs for detailed error traces

