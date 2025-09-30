import argparse, os, sys
from pathlib import Path

from inc.shared.inc.helpers.config_helpers import load_convenience_config
from inc.db_importer import GTFS_DB_Importer
from inc.shared.inc.helpers.gtfs_helpers import compute_gtfs_day_from_resource_path, compute_gtfs_db_filename

def main():
    script_path = Path(os.path.realpath(__file__))
    app_config = load_convenience_config(script_path)

    parser = argparse.ArgumentParser()
    parser.add_argument('--gtfs-folder-path', '--gtfs-folder-path')
    parser.add_argument('--output-db-path', '--output-db-path')

    args = parser.parse_args()
    input_path = args.gtfs_folder_path

    if input_path is None:
        print("ERROR, use with --gtfs-folder-path")
        sys.exit(1)

    gtfs_folder_path = Path(os.path.abspath(input_path))

    db_path = None
    if args.output_db_path:
        db_path = Path(args.output_db_path)
    else:
        gtfs_date = compute_gtfs_day_from_resource_path(gtfs_folder_path)  
        if gtfs_date is None:
            print(f"CANT read date from GTFS path: '{gtfs_folder_path}'")
            print(f"Use --output-db-path to override")
            sys.exit(1)

        gtfs_day_f = f'{gtfs_date}'
        db_filename = compute_gtfs_db_filename(gtfs_day_f)

        db_base_path = app_config['gtfs_dbs_base_path']
        db_path = f'{db_base_path}/{db_filename}'
        db_path = Path(db_path)

    os.makedirs(db_path.parent, exist_ok=True)

    gtfs_importer = GTFS_DB_Importer(app_config, gtfs_folder_path, db_path)
    gtfs_importer.start()

if __name__ == "__main__":
    main()
