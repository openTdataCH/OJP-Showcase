import argparse, glob, os, sys
from pathlib import Path

from inc.shared.inc.helpers.config_helpers import load_yaml_config
from inc.shared.inc.helpers.hrdf_helpers import compute_formatted_date_from_hrdf_folder_path
from inc.db_importer import HRDF_DB_Importer

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--hrdf-base-folder-path', '--hrdf-base-folder-path')
    parser.add_argument('--hrdf-db-base-folder-path', '--hrdf-db-base-folder-path')
    parser.add_argument('--force', '--force', action='store_true')
    args = parser.parse_args()

    hrdf_base_folder_path = args.hrdf_base_folder_path
    if not hrdf_base_folder_path:
        print(f'ERROR, use it with --hrdf-base-folder-path /path/to/HRDF_base_path')
        sys.exit(1)

    hrdf_base_folder_path = Path(hrdf_base_folder_path)
    if not os.path.isdir(hrdf_base_folder_path):
        print(f'ERROR, --hrdf-base-folder-path doesn\'t exist')
        print(f'{hrdf_base_folder_path}')
        sys.exit(1)
    
    hrdf_db_base_folder_path = args.hrdf_db_base_folder_path
    if not hrdf_db_base_folder_path:
        print(f'ERROR, use it with --hrdf-db-base-folder-path /path/to/HRDF_DB_base_path')
        sys.exit(1)

    hrdf_db_base_folder_path = Path(hrdf_db_base_folder_path)
    if not os.path.isdir(hrdf_db_base_folder_path):
        print(f'ERROR, --gtfs-db-base-folder-path doesn\'t exist')
        print(f'{hrdf_db_base_folder_path}')
        sys.exit(1)

    override_db = args.force is True

    hrdf_dataset_paths = glob.glob(f'{hrdf_base_folder_path}/*')
    hrdf_dataset_paths.sort(reverse=True)

    latest_dataset_path = None
    dataset_formatted_date = None
    for hrdf_dataset_path in hrdf_dataset_paths:
        if not os.path.isdir(hrdf_dataset_path):
            continue

        hrdf_dataset_path = Path(hrdf_dataset_path)
        dataset_formatted_date = compute_formatted_date_from_hrdf_folder_path(f'{hrdf_dataset_path}')
        if dataset_formatted_date is None:
            continue

        latest_dataset_path = hrdf_dataset_path
        break

    if not latest_dataset_path:
        print(f'ERROR - cant find a HRDF dataset in {hrdf_base_folder_path}')
        sys.exit(1)

    db_filename = f"hrdf_{dataset_formatted_date}.sqlite"
    db_path = Path(f'{hrdf_db_base_folder_path}/{db_filename}')

    if os.path.isfile(db_path):
        if override_db:
            print(f'Will override the content in DB at path {db_path} ...')
        else:
            print(f'DB for {latest_dataset_path} already exists at {db_path}')
            print(f'If you want to overwrite:')
            print(f'- remove the file manually then run this script again')
            print(f'- use --force')
            sys.exit(0)

    print(f'===================================================')
    print(f'HRDF DB IMPORT')
    print(f'  HRDF input path   : {latest_dataset_path}')
    print(f'  DB output path    : {db_path}')
    print(f'===================================================', flush=True)

    hrdf_importer = HRDF_DB_Importer(latest_dataset_path, db_path)
    hrdf_importer.parse_all()

if __name__ == "__main__":
    main()
