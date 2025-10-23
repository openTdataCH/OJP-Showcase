import os, sys

from pathlib import Path

import zipfile_inflate64 as zipfile

def unzip_file(zip_path: Path, extract_folder: Path):
    if not os.path.isdir(extract_folder):
        os.makedirs(extract_folder)
    
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_folder)
