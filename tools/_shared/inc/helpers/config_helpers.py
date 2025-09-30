import os
import sys

from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
import yaml

def load_yaml_config(config_path: Path, app_path: Optional[Path] = None):
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

def load_env_vars(dotenv_path: Path) -> None:
    """
    load ENV vars from a given dotenv_path 
    if a file with .local suffix is present, load that instead
    """
    if isinstance(dotenv_path, str):
        dotenv_path = Path(dotenv_path)
        
    file_to_load_path = f'{dotenv_path}'
        
    local_dotenv_path = f'{dotenv_path}.local'
    if os.path.exists(local_dotenv_path):
        file_to_load_path = local_dotenv_path
        
    load_dotenv(dotenv_path=file_to_load_path, override=True)
    
