import os, sys

import time
from pathlib import Path

import requests

def download_file(url: str, local_path: Path, check_if_exists: bool = False):
    if isinstance(local_path, str):
        local_path = Path(local_path)
    
    try:
        if check_if_exists:
            # check HEAD
            response = requests.head(url, allow_redirects=True, timeout=10)
            time.sleep(0.1)
            
            if response.status_code != 200:
                return False
        #
        
        with requests.get(url, stream=True, timeout=10) as r:
            r.raise_for_status()
            
            if not os.path.isdir(local_path.parent):
                os.makedirs(local_path.parent)
            
            with open(local_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
        # requests.get
        
        return True
    except requests.RequestException as e:
        print(f"Error checking URL: {e}")
        return False
# download_file
