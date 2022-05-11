import argparse
import os, sys
from pathlib import Path

from inc.db_importer import HRDF_DB_Importer
from inc.shared.inc.helpers.hrdf_helpers import compute_formatted_date_from_hrdf_folder_path
from inc.shared.inc.helpers.config_helpers import load_yaml_config

parser = argparse.ArgumentParser()
parser.add_argument('--hrdf-folder-path', '--hrdf-folder-path')
parser.add_argument('--output-db-path', '--output-db-path')

args = parser.parse_args()
hrdf_folder_path = args.hrdf_folder_path

if hrdf_folder_path is None:
    print("ERROR, use with --hrdf-folder-path")
    sys.exit(1)

hrdf_path = Path(os.path.abspath(hrdf_folder_path))
hrdf_path_s = f'{hrdf_path}'

formatted_date = compute_formatted_date_from_hrdf_folder_path(hrdf_path_s)  
if formatted_date is None:
    print(f"CANT read date from HRDF path: '{hrdf_path_s}'")
    sys.exit(1)

db_filename = f"hrdf_{formatted_date}.sqlite"

db_path = None
if args.output_db_path:
    db_path = Path(args.output_db_path)
else:
    dir_path = os.path.dirname(os.path.realpath(__file__))
    db_path = f'{dir_path}/tmp/hrdf-dbs/{db_filename}'
    db_path = Path(os.path.abspath(db_path))

os.makedirs(db_path.parent, exist_ok=True)

db_path_s = f'{db_path}'
print(f"IMPORT to: {db_path_s}")

script_path = Path(os.path.realpath(__file__))
app_config_path = Path(f'{script_path.parent}/inc/config.yml')
if not os.path.isfile(app_config_path):
    print(f'ERROR: cant load config from {app_config_path}')
    sys.exit(1)
app_config = load_yaml_config(app_config_path, script_path.parent)

hrdf_importer = HRDF_DB_Importer(app_config, hrdf_path_s, db_path_s)
hrdf_importer.parse_all()