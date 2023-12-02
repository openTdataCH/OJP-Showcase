import os
import sys

from pathlib import Path
import yaml

def load_yaml_config(config_path: Path, app_path: Path = None):
    if not isinstance(config_path, Path):
        config_path = Path(config_path)

    config_s = config_path.read_text(encoding='utf-8')

    if app_path is not None:
        config_s = config_s.replace('[APP_PATH]', f'{app_path}')

    config = yaml.safe_load(config_s)

    return config

def load_convenience_config(context_path: Path):
    context_folder_path = context_path
    if os.path.isfile(context_folder_path):
        context_folder_path = context_folder_path.parent

    app_config_path = Path(f'{context_folder_path}/config/config.yml')
    if not os.path.isfile(app_config_path):
        app_config_path = Path(f'{context_folder_path}/inc/config.yml')
        if not os.path.isfile(app_config_path):
            print('ERROR: cant load config from convenience paths')
            sys.exit(1)

    app_config = load_yaml_config(app_config_path, context_folder_path)

    return app_config
