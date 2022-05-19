import argparse, os, sys
from pathlib import Path

from inc.shared.inc.helpers.config_helpers import load_yaml_config
from inc.hrdf_check_duplicates_controller import HRDF_Check_Duplicates_Controller

def main():
    script_path = Path(os.path.realpath(__file__))
    app_config_path = Path(f'{script_path.parent}/inc/config.yml')
    if not os.path.isfile(app_config_path):
        print(f'ERROR: cant load config from {app_config_path}')
        sys.exit(1)
    app_config = load_yaml_config(app_config_path, script_path.parent)

    usage_help_s = 'Use --hrdf-db-path /path/to/hrdf-db-path'

    parser = argparse.ArgumentParser()
    parser.add_argument('--hrdf-db-path', '--hrdf-db-path')
    args = parser.parse_args()

    if not args.hrdf_db_path:
        print(f'Missing HRDF DB path')
        print(usage_help_s)
        sys.exit(1)

    hrdf_db_path = Path(args.hrdf_db_path)

    hrdf_check_duplicates_controller = HRDF_Check_Duplicates_Controller(app_config, hrdf_db_path)
    hrdf_check_duplicates_controller.check()

if __name__ == "__main__":
    main()
