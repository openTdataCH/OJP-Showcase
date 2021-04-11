import argparse
import os, sys
import re
from pathlib import Path

from inc.Stops_Reporter.stops_reporter import HRDF_Stops_Reporter
from inc.shared.inc.helpers.hrdf_helpers import compute_formatted_date_from_hrdf_db_path

parser = argparse.ArgumentParser(description = 'Generate stops report from HRDF DB')
parser.add_argument('--hrdf-db-path', '--hrdf-db-path')

args = parser.parse_args()
db_path = args.hrdf_db_path

if db_path is None:
    print("ERROR, use with --hrdf-db-path")
    sys.exit(1)

dir_path = os.path.dirname(os.path.realpath(__file__))
export_base_path = Path(f'{dir_path}/tmp/stops_report')
os.makedirs(export_base_path, exist_ok=True)

formatted_date = compute_formatted_date_from_hrdf_db_path(db_path)
stops_report_filename = f"stops_report_{formatted_date}" # without extension

sr_json_path = f'{export_base_path}/{stops_report_filename}.json'
sr_csv_path = f'{export_base_path}/{stops_report_filename}.csv'

sr = HRDF_Stops_Reporter(db_path)
stops_report_json = sr.generate_json(sr_json_path)
sr.generate_csv(stops_report_json, sr_csv_path)