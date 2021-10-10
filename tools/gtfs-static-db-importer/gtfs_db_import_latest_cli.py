import argparse, glob, os, sys
from pathlib import Path
import json
import urllib.request

from inc.shared.inc.helpers.config_helpers import load_yaml_config
from inc.shared.inc.helpers.gtfs_helpers import compute_formatted_date_from_gtfs_folder_path
from inc.db_importer import GTFS_DB_Importer

def main():
    script_path = Path(os.path.realpath(__file__))
    app_config_path = Path(f'{script_path.parent}/inc/config.yml')
    if not os.path.isfile(app_config_path):
        print(f'ERROR: cant load config from {app_config_path}')
        sys.exit(1)
    app_config = load_yaml_config(app_config_path, script_path.parent)

    parser = argparse.ArgumentParser()
    parser.add_argument('--gtfs-base-folder-path', '--gtfs-base-folder-path')
    parser.add_argument('--gtfs-db-base-folder-path', '--gtfs-db-base-folder-path')
    parser.add_argument('--force', '--force', action='store_true')
    args = parser.parse_args()

    gtfs_base_folder_path = args.gtfs_base_folder_path
    if not gtfs_base_folder_path:
        print(f'ERROR, use it with --gtfs-base-folder-path /path/to/GTFS_base_path')
        sys.exit(1)

    gtfs_base_folder_path = Path(gtfs_base_folder_path)
    if not os.path.isdir(gtfs_base_folder_path):
        print(f'ERROR, --gtfs-base-folder-path doesn\'t exist')
        print(f'{gtfs_base_folder_path}')
        sys.exit(1)

    gtfs_db_base_folder_path = args.gtfs_db_base_folder_path
    if not gtfs_db_base_folder_path:
        print(f'ERROR, use it with --gtfs-db-base-folder-path /path/to/GTFS_DB_base_path')
        sys.exit(1)

    gtfs_db_base_folder_path = Path(gtfs_db_base_folder_path)
    if not os.path.isdir(gtfs_db_base_folder_path):
        print(f'ERROR, --gtfs-db-base-folder-path doesn\'t exist')
        print(f'{gtfs_db_base_folder_path}')
        sys.exit(1)

    override_db = args.force == True

    gtfs_dataset_paths = glob.glob(f'{gtfs_base_folder_path}/*')
    gtfs_dataset_paths.sort(reverse=True)

    latest_gtfs_dataset_path = None
    gtfs_dataset_formatted_date = None
    for gtfs_dataset_path in gtfs_dataset_paths:
        if not os.path.isdir(gtfs_dataset_path):
            continue

        gtfs_dataset_path = Path(gtfs_dataset_path)
        gtfs_dataset_formatted_date = compute_formatted_date_from_gtfs_folder_path(gtfs_dataset_path)
        if gtfs_dataset_formatted_date is None:
            continue

        latest_gtfs_dataset_path = gtfs_dataset_path
        break

    if not latest_gtfs_dataset_path:
        print(f'ERROR - cant find a GTFS dataset in {gtfs_base_folder_path}')
        sys.exit(1)

    db_filename = f"gtfs_{gtfs_dataset_formatted_date}.sqlite"
    db_path = Path(f'{gtfs_db_base_folder_path}/{db_filename}')

    if os.path.isfile(db_path):
        if override_db:
            print(f'Will override the content in DB at path {db_path} ...')
        else:
            print(f'DB for {latest_gtfs_dataset_path} already exists at {db_path}')
            print(f'If you want to overwrite:')
            print(f'- remove the file manually then run this script again')
            print(f'- use --force')
            sys.exit(0)

    print(f'===================================================')
    print(f'GTFS DB IMPORT')
    print(f'  GTFS input path   : {latest_gtfs_dataset_path}')
    print(f'  DB output path    : {db_path}')
    print(f'===================================================', flush=True)

    latest_gtfs_dataset_path = Path(latest_gtfs_dataset_path)

    gtfs_importer = GTFS_DB_Importer(app_config, latest_gtfs_dataset_path, db_path)
    
    gtfs_importer.start()

if __name__ == "__main__":
    main()