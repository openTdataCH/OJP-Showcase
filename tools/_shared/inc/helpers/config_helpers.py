import os, sys
import yaml

from pathlib import Path

def load_yaml_config(config_path: Path, app_path: Path):
    config_file_handler = open(f'{config_path}', encoding='utf-8')

    config_s = config_file_handler.read()
    config_s = config_s.replace('[APP_PATH]', f'{app_path}')
    config = yaml.safe_load(config_s)
  
    config_file_handler.close()

    return config

def load_convenience_config(context_path: Path):
    context_folder_path = context_path
    if os.path.isfile(context_folder_path):
        context_folder_path = context_folder_path.parent

    app_config_path = Path(f'{context_folder_path}/inc/config.yml')
    if not os.path.isfile(app_config_path):
        print(f'ERROR: cant load config from {app_config_path}')
        sys.exit(1)
    
    app_config = load_yaml_config(app_config_path, context_folder_path)

    return app_config
