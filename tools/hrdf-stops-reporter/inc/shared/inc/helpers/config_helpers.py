import os
import yaml

from pathlib import Path

def load_yaml_config(config_path: Path, app_path: Path):
    config_file_handler = open(f'{config_path}')

    config_s = config_file_handler.read()
    config_s = config_s.replace('[APP_PATH]', f'{app_path}')
    config = yaml.safe_load(config_s)
  
    config_file_handler.close()

    return config