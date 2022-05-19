import os, sys
from pathlib import Path

from inc.shared.inc.helpers.config_helpers import load_convenience_config

def main():
    print('SETUP server')

    script_path = Path(os.path.realpath(__file__))
    app_config = load_convenience_config(script_path)

    for (key, dir_path) in app_config['data_paths'].items():
        if os.path.isdir(dir_path):
            print(f'... SKIP folder {dir_path} which exists')
            continue
        
        print(f'... CREATE {dir_path}')
        os.makedirs(dir_path, exist_ok=True)

if __name__ == "__main__":
    main()
