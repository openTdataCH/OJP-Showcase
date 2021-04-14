import argparse, os, sys, glob
from pathlib import Path

from inc.gtfs_static_files_generator_controller import GTFS_Static_Files_Generator_Controller
from inc.shared.inc.helpers.config_helpers import load_yaml_config

script_path = Path(os.path.realpath(__file__))

parser = argparse.ArgumentParser(description = '')
parser.add_argument('-db-path', '--db-path', help='Path to GTFS DB')
args = parser.parse_args()

gtfs_db_path = args.db_path
if gtfs_db_path is None:
    print("ERROR, use with --db-path")
    sys.exit(1)
gtfs_db_path = Path(os.path.abspath(gtfs_db_path))

app_config_path = Path(f'{script_path.parent}/inc/config/config.yml')
if not os.path.isfile(app_config_path):
    print(f'ERROR: cant load config from {app_config_path}')
    sys.exit(1)
app_config = load_yaml_config(app_config_path, script_path.parent)

gtfs_static_generator = GTFS_Static_Files_Generator_Controller(gtfs_db_path, app_config)
gtfs_static_generator.generate_weekday_files()
