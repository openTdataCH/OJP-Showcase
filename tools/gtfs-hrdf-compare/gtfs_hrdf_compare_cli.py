import argparse, os, sys
from pathlib import Path
from datetime import datetime

from inc.shared.inc.helpers.config_helpers import load_yaml_config
from inc.gtfs_hrdf_compare import GTFS_HRDF_Compare_Controller

def main():
    script_path = Path(os.path.realpath(__file__))
    app_config_path = Path(f'{script_path.parent}/inc/config.yml')
    if not os.path.isfile(app_config_path):
        print(f'ERROR: cant load config from {app_config_path}')
        sys.exit(1)
    app_config = load_yaml_config(app_config_path, script_path.parent)

    usage_help_s = 'Use --gtfs-db-path /path/to/gtfs-db-path --hrdf-db-path /path/to/hrdf-db-path'

    parser = argparse.ArgumentParser()
    parser.add_argument('--gtfs-db-path', '--gtfs-db-path')
    parser.add_argument('--hrdf-db-path', '--hrdf-db-path')
    parser.add_argument('--day', '--day')
    parser.add_argument('--agency_id', '--agency_id')
    args = parser.parse_args()

    if not args.gtfs_db_path:
        print(f'Missing GTFS DB path')
        print(usage_help_s)
        sys.exit(1)
    if not args.hrdf_db_path:
        print(f'Missing HRDF DB path')
        print(usage_help_s)
        sys.exit(1)
    if not os.path.isfile(args.gtfs_db_path):
        print(f'GTFS DB path is invalid')
        print(f'{args.gtfs_db_path}')
        sys.exit(1)
    if not os.path.isfile(args.hrdf_db_path):
        print(f'GTFS B(current) path is invalid')
        print(f'{args.hrdf_db_path}')
        sys.exit(1)

    request_day = datetime.today()
    request_day_s = args.day
    if request_day_s:
        request_day = datetime.strptime(request_day_s, "%Y-%m-%d").date()
    else:
        print(f'- using current day {request_day} as --day parameter')

    agency_id = args.agency_id

    gtfs_db_path = Path(args.gtfs_db_path)
    hrdf_db_path = Path(args.hrdf_db_path)

    gtfs_hrdf_controller = GTFS_HRDF_Compare_Controller(app_config, gtfs_db_path, hrdf_db_path)
    gtfs_hrdf_controller.compare(request_day, agency_id)

if __name__ == "__main__":
    main()