from decouple import config
from pathlib import Path

def read_key(file_path):
    try:
        return Path(config(file_path)).read_text()
    except Exception as e:
        raise ValueError(f"Key read failed: {str(e)}")