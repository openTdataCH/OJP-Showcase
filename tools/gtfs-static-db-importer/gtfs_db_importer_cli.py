import argparse, os, sys
from pathlib import Path

from inc.db_importer import GTFS_DB_Importer
from inc.shared.inc.helpers.gtfs_helpers import compute_formatted_date_from_gtfs_folder_path

parser = argparse.ArgumentParser()
parser.add_argument('--gtfs-folder-path', '--gtfs-folder-path')
parser.add_argument('--output-db-path', '--output-db-path')

args = parser.parse_args()
input_path = args.gtfs_folder_path

if input_path is None:
    print("ERROR, use with --gtfs-folder-path")
    sys.exit(1)

gtfs_folder_path = Path(os.path.abspath(input_path))

formatted_date = compute_formatted_date_from_gtfs_folder_path(gtfs_folder_path)  

if formatted_date is None:
    print(f"CANT read date from HRDF path: '{hrdf_path}'")
    print(f"Use --output-db-path to override")
    sys.exit(1)

db_filename = f"gtfs_{formatted_date}.sqlite"

db_path = None
if args.output_db_path:
    db_path = Path(args.output_db_path)
else:
    dir_path = Path(os.path.realpath(__file__))
    db_path = Path(f"{dir_path.parent}/output/gtfs_db/{db_filename}")

os.makedirs(db_path.parent, exist_ok=True)

print(f"IMPORT to: {db_path}")

gtfs_importer = GTFS_DB_Importer(gtfs_folder_path, db_path)
gtfs_importer.start()