import os
import uuid


def rename_image_file(image_file, prefix: str = "img") -> None:
    """
    Rename an uploaded image file with a short UUID-based name.

    Args:
        image_file: Django UploadedFile object
        prefix: Prefix for the filename (default: "img")

    Example:
        Before: "my-very-long-image-name.jpg"
        After: "img_a1b2c3d4.jpg"
    """
    if image_file:
        ext = os.path.splitext(image_file.name)[1].lower()
        short_name = f"{prefix}_{str(uuid.uuid4())[:8]}{ext}"
        image_file.name = short_name

