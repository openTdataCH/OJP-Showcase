import os
import sys

from pathlib import Path
import re
from datetime import datetime

# from_idx is for 1 start-based index columns to match the HRDF PDF doc.
def extract_hrdf_content(hrdf_line: str, from_idx: int, to_idx: int, default_value = None):
    hrdf_line = hrdf_line.strip()
    hrdf_content = hrdf_line[from_idx - 1 : to_idx]
    hrdf_content = hrdf_content.strip()
    if hrdf_content == "":
        hrdf_content = default_value
    return hrdf_content

def normalize_agency_id(hrdf_s: str):
    hrdf_s = hrdf_s.lstrip("0")
    return hrdf_s

def normalize_fplan_trip_id(hrdf_s: str):
    hrdf_s = hrdf_s.lstrip("0")
    return hrdf_s

def compute_file_rows_no(file_path: str):
    # https://stackoverflow.com/questions/845058/how-to-get-line-count-of-a-large-file-cheaply-in-python
    with open(file_path, encoding='utf-8') as file_handler:
        rows_no = sum(1 for line in file_handler)
        return rows_no

    return 0

def compute_formatted_date_from_hrdf_folder_path(folder_path: Path):
    if isinstance(folder_path, str):
        folder_path = Path(folder_path)

    # oev_sammlung_ch_hrdf_5_40_41_2021_20201220_033904
    opentransport_matches = re.match("^.+?_([0-9]{4})_([0-9]{4})([0-9]{2})([0-9]{2})_.*$", f'{folder_path}')

    if opentransport_matches:
        matched_year = opentransport_matches[2]
        matched_month = opentransport_matches[3]
        matched_day = opentransport_matches[4]
        formatted_date = f"{matched_year}-{matched_month}-{matched_day}"
        return formatted_date

    return None

def compute_formatted_date_from_hrdf_db_path(db_path: Path):
    if isinstance(db_path, str):
        db_path = Path(db_path)

    date_matches = re.match("^.+?([0-9]{4}-[0-9]{2}-[0-9]{2}).*$", f'{db_path}')
    if date_matches:
        return date_matches[1]

    return None

def compute_hrdf_db_filename(hrdf_day: str):
    db_filename = f'hrdf_{hrdf_day}.sqlite'
    return db_filename

def compute_calendar_info(gtfs_db):
    sql = 'SELECT service_id, start_date, end_date, day_bits FROM calendar LIMIT 1'
    
    db_row = gtfs_db.execute(sql).fetchone()
    start_date = datetime.strptime(db_row['start_date'], "%Y%m%d").date()
    end_date = datetime.strptime(db_row['end_date'], "%Y%m%d").date()
    days_no = (end_date - start_date).days + 1 # adds 1 to include also the last day of the interval

    day_bits = db_row['day_bits'][0:days_no]
    is_all_days = day_bits == len(day_bits) * '1'
    if not is_all_days:
        print('ERROR - calendar row is not representative')
        service_id = db_row['service_id']
        print(f'{service_id} => {day_bits}')
        sys.exit(1)

    return start_date, days_no
