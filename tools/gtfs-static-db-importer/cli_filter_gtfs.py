import argparse, os, sys
from pathlib import Path

from inc.shared.inc.helpers.config_helpers import load_convenience_config
from gtfs_filter.gtfs_filter_controller import GTFS_FilterController

def main():
    script_path = Path(os.path.realpath(__file__))
    app_config = load_convenience_config(script_path)

    usage_help_s = """Usage:

python3 cli_filter_gtfs.py --gtfs-db-path /path/to/gtfs-db-path \\
    --gtfs-output-path /path/to/gtfs-output-folder-path \\

    // then one of the following
    --bbox minx,miny,maxx,maxy      # 8.438851,47.315815,8.63675,47.44253
    --agency agency1,agency2        # 11,849
    --day YYYY-MM-DD                # 2026-03-20
"""

    parser = argparse.ArgumentParser()
    parser.add_argument('--gtfs-db-path', '--gtfs-db-path')
    parser.add_argument('--gtfs-output-path', '--gtfs-output-path')
    
    parser.add_argument('--bbox', '--bbox', required=False)
    parser.add_argument('--agency', '--agency', required=False)
    parser.add_argument('--day', '--day', required=False)

    args = parser.parse_args()

    if not args.gtfs_db_path:
        print(f'Missing GTFS DB path')
        print(usage_help_s)
        sys.exit(1)

    if not os.path.isfile(args.gtfs_db_path):
        print(f'GTFS DB path not found')
        print(args.gtfs_db_path)
        sys.exit(1)

    if not args.gtfs_output_path:
        print(f'Missing GTFS output folder path')
        print(usage_help_s)
        sys.exit(1)

    gtfs_db_path = Path(args.gtfs_db_path)
    gtfs_output_path = Path(args.gtfs_output_path)
    gtfs_filter_controller = GTFS_FilterController(app_config, gtfs_db_path, gtfs_output_path)

    gtfs_filter_controller.reset_filters()

    if args.bbox:
        bbox_s = args.bbox
        gtfs_filter_controller.set_filter_by_bbox(bbox_s)
    #

    if args.agency:
        agency_ids = args.agency.split(',')
        gtfs_filter_controller.set_filter_by_agencies(agency_ids)
    #

    if args.day:
        day_s = args.day
        gtfs_filter_controller.set_filter_by_day(day_s)
    #

    gtfs_filter_controller.filter()

if __name__ == "__main__":
    main()
