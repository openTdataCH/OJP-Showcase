import os, sys
import re
import datetime

from pathlib import Path

from typing import List, Optional, TypedDict, Union

class StopTimeWithSeconds(TypedDict):
    sql_row_id: int
    stop_id: str
    arrival_time: Optional[str]
    departure_time: Optional[str]
    arrival_seconds: Optional[int]
    departure_seconds: Optional[int]

def compute_gtfs_day_from_resource_path(resource_path: Path):
    dt_matches = _compute_gtfs_dt_matches_from_resource_path(resource_path)
    if dt_matches is None:
        return None
    
    gtfs_day_f = f'{dt_matches[2]}-{dt_matches[3]}-{dt_matches[4]}'
    gtfs_day = datetime.datetime.strptime(gtfs_day_f, '%Y-%m-%d').date()
    
    return gtfs_day

def _compute_gtfs_dt_matches_from_resource_path(resource_path: Path):
    if isinstance(resource_path, str):
        resource_path = Path(resource_path)
    
    # gtfs_fp2021_2021-02-17_09-10
    # GTFS_FP2024_2024-04-15_08-54.zip
    # GTFS_FP2024_2024-05-02
    dt_matches = re.match("^gtfs_fp([0-9]{4})_([0-9]{4})-([0-9]{2})-([0-9]{2})(.*)$", resource_path.name.lower())
    
    if dt_matches is None:
        # GTFS_FP2025_20250925.zip
        dt_matches = re.match("^gtfs_fp([0-9]{4})_([0-9]{4})([0-9]{2})([0-9]{2})(.*)$", resource_path.name.lower())
    
    return dt_matches

# useful for old file formats which included the created date
# GTFS_FP2024_2024-04-15_08-54.zip
def compute_gtfs_dt_from_resource_path(resource_path: Path):
    dt_matches = _compute_gtfs_dt_matches_from_resource_path(resource_path)
    if dt_matches is None:
        return None
    
    hhmm_matches = re.match("^_([0-9]{2})-([0-9]{2}).*", dt_matches[5])
    if hhmm_matches is None:
        return None
    
    gtfs_dt_f = f'{dt_matches[2]}-{dt_matches[3]}-{dt_matches[4]} {hhmm_matches[1]}:{hhmm_matches[2]}'
    gtfs_dt = datetime.datetime.strptime(gtfs_dt_f, '%Y-%m-%d %H:%M')
    
    return gtfs_dt

def convert_datetime_to_day_minutes(datetime_s: str):
    # fix HRDF bug - see emails 5.01.2022
    if len(datetime_s) == 9:
        datetime_parts = datetime_s.split(':')
        datetime_hr = int(datetime_parts[0][2:]) + 24
        datetime_parts[0] = f'{datetime_hr}'
        datetime_s = ':'.join(datetime_parts)

    datetime_hours = int(datetime_s[0:2])
    datetime_minutes = int(datetime_s[3:5])

    day_minutes = datetime_hours * 60 + datetime_minutes
    return day_minutes

def massage_datetime_to_hhmm(datetime_s: Optional[str]) -> str:
    if not datetime_s:
        return ''

    datetime_hours = datetime_s[0:2]
    datetime_minutes = datetime_s[3:5]

    datetime_hhmm = f'{datetime_hours}:{datetime_minutes}'
    
    return datetime_hhmm

def compute_date_from_gtfs_db_filename(db_filename: str):
    # gtfs_2021-03-10.sqlite
    date_matches = re.match(r"^.+?_([0-9]{4}-[0-9]{2}-[0-9]{2})\.sqlite$", db_filename)

    if not date_matches:
        return None

    gtfs_date = datetime.datetime.strptime(date_matches[1], '%Y-%m-%d').date()

    return gtfs_date

def compute_gtfs_db_filename(gtfs_day: str):
    db_filename = f'gtfs_{gtfs_day}.sqlite'
    return db_filename

def gtfs_time_to_seconds(t: Union[str, None]) -> Union[int, None]:
    """
    Convert a GTFS HH:MM:SS time string (may exceed 24h) to seconds from start of day.
    Example: '25:10:30' -> 25h * 3600 + 10 * 60 + 30 = 90630
    """
    if not t or t.strip() == '':
        return None

    parts = t.split(':')
    if len(parts) != 3:
        raise ValueError(f'Invalid time format: {t}')

    h, m, s = map(int, parts)
    
    return h * 3600 + m * 60 + s

def extract_stop_times_data_from_s(value_s: str) -> List[StopTimeWithSeconds]:
    stop_time_rows: List[StopTimeWithSeconds] = []

    value_rows = value_s.split(' -- ')
    for value_row in value_rows:
        stop_time_parts = value_row.split('|')

        db_rowid = int(stop_time_parts[0])
        stop_id = stop_time_parts[1]
        
        arrival_time = stop_time_parts[2]
        if arrival_time == '':
            arrival_time = None
        departure_time = stop_time_parts[3]
        if departure_time == '':
            departure_time = None

        stop_time_row = StopTimeWithSeconds(
            sql_row_id=db_rowid,
            stop_id=stop_id,
            arrival_time=arrival_time,
            departure_time=departure_time,
            
            arrival_seconds=None,
            departure_seconds=None,
        )

        if arrival_time is not None:
            stop_time_row['arrival_seconds'] = convert_datetime_to_day_minutes(arrival_time) * 60
        if departure_time is not None:
            stop_time_row['departure_seconds'] = convert_datetime_to_day_minutes(departure_time) * 60

        stop_time_rows.append(stop_time_row)

    return stop_time_rows

def seconds_to_hhmmss(seconds_no: int) -> str:
    hours = seconds_no // 3600
    minutes = (seconds_no % 3600) // 60
    secs = seconds_no % 60

    hhmmss = f'{hours:02d}:{minutes:02d}:{secs:02d}'
    
    return hhmmss
