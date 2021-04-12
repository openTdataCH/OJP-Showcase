import argparse
import os, sys
import re
from pathlib import Path

from inc.Stops_Reporter.stops_reporter import HRDF_Stops_Reporter
from inc.shared.inc.helpers.hrdf_helpers import compute_formatted_date_from_hrdf_db_path

parser = argparse.ArgumentParser(description = 'Generate stops GeoJSON from HRDF DB')
parser.add_argument('--hrdf-db-path', '--hrdf-db-path', help='Path to HRDF DB')
parser.add_argument('-o', '--output', help='SQLite output path')

args = parser.parse_args()
db_path = args.hrdf_db_path

if db_path is None:
    print("ERROR, use with --hrdf-db-path")
    sys.exit(1)

geojson_export_path = None
if args.output:
    geojson_export_path = args.output
    geojson_export_path = os.path.abspath(geojson_export_path)
else:
    dir_path = os.path.dirname(os.path.realpath(__file__))
    geojson_export_path = f"{dir_path}/output/hrdf_stops_latest.geojson"
    geojson_export_path = os.path.abspath(geojson_export_path)

formatted_date = compute_formatted_date_from_hrdf_db_path(db_path)
stops_report_filename = f"stops_report_{formatted_date}"

dir_path = os.path.dirname(os.path.realpath(__file__))
export_base_path = Path(f'{dir_path}/tmp/stops_report')
sr_json_path = f'{export_base_path}/{stops_report_filename}.json'

if not os.path.isfile(sr_json_path):
    print(f"ERROR - missing {sr_json_path}")
    print("Run first stops_reporter_cli.py to generate the JSON file above")
    sys.exit(1)

sr = HRDF_Stops_Reporter(db_path)
sr.generate_geojson(sr_json_path, geojson_export_path)