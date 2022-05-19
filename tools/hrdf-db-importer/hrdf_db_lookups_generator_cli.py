import argparse, os, sys
from pathlib import Path
from datetime import datetime

from inc.shared.inc.helpers.config_helpers import load_convenience_config
from inc.hrdf_export_lookups_controller import HRDF_Export_Lookups_Controller

def main():
    script_path = Path(os.path.realpath(__file__))
    app_config = load_convenience_config(script_path)

    usage_help_s = 'Use --hrdf-db-path /path/to/hrdf-db-path'

    parser = argparse.ArgumentParser()
    parser.add_argument('--hrdf-db-path', '--hrdf-db-path')
    args = parser.parse_args()

    if not args.hrdf_db_path:
        print(f'Missing HRDF DB path')
        print(usage_help_s)
        sys.exit(1)

    hrdf_db_path = Path(args.hrdf_db_path)

    hrdf_export_lookups_controller = HRDF_Export_Lookups_Controller(app_config, hrdf_db_path)
    hrdf_export_lookups_controller.export()

if __name__ == "__main__":
    main()
