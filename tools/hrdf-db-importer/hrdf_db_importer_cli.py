import os, sys
import argparse
from pathlib import Path

from inc.db_importer import HRDF_DB_Importer
from inc.HRDF_Parser.shared.inc.helpers.hrdf_helpers import compute_formatted_date_from_hrdf_folder_path, compute_hrdf_db_filename
from inc.HRDF_Parser.shared.inc.helpers.config_helpers import load_convenience_config

def main():
    script_path = Path(os.path.realpath(__file__))
    app_config = load_convenience_config(script_path)

    parser = argparse.ArgumentParser()
    parser.add_argument('--hrdf-folder-path', '--hrdf-folder-path')
    parser.add_argument('--output-db-path', '--output-db-path')

    args = parser.parse_args()
    hrdf_folder_path = args.hrdf_folder_path

    if hrdf_folder_path is None:
        print("ERROR, use with --hrdf-folder-path")
        sys.exit(1)

    hrdf_path = Path(os.path.abspath(hrdf_folder_path))

    if not os.path.isdir(hrdf_path):
        print('ERROR --hrdf-folder-path is not a valid folder path')
        print(f': {hrdf_path}')
        sys.exit(1)

    formatted_date = compute_formatted_date_from_hrdf_folder_path(f'{hrdf_path}')  
    if formatted_date is None:
        print(f"CANT read date from HRDF path: '{hrdf_path}'")
        sys.exit(1)

    db_path = None
    if args.output_db_path:
        db_path = Path(args.output_db_path)
    else:
        db_filename = compute_hrdf_db_filename(formatted_date)

        db_base_path = app_config['hrdf_dbs_base_path']
        db_path = f'{db_base_path}/{db_filename}'
        db_path = Path(db_path)

    if not os.path.isdir(db_path.parent):
        os.makedirs(db_path.parent, exist_ok=True)

    hrdf_importer = HRDF_DB_Importer(app_config, hrdf_path, db_path)
    hrdf_importer.parse_all()

if __name__ == "__main__":
    main()
