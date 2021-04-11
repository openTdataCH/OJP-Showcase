import argparse
import os, sys
from pathlib import Path

from inc.db_importer import HRDF_DB_Importer
from inc.shared.inc.helpers.hrdf_helpers import compute_formatted_date_from_hrdf_folder_path

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
    db_path = f'{dir_path}/output/hrdf_db/{db_filename}'
    db_path = Path(os.path.abspath(db_path))

os.makedirs(db_path.parent, exist_ok=True)

db_path_s = f'{db_path}'
print(f"IMPORT to: {db_path_s}")

hrdf_importer = HRDF_DB_Importer(hrdf_path_s, db_path_s)
hrdf_importer.parse_all()