from pathlib import Path

from decouple import config


def read_key(file_path):
    try:
        return Path(config(file_path)).read_text()
    except Exception as e:
        raise ValueError(f"Key read failed: {str(e)}")
