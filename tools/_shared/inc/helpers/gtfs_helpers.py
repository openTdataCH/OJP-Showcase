import os, sys
import re
import datetime

from typing import Union

from pathlib import Path

def compute_formatted_date_from_gtfs_folder_path(folder_path: Path):
    gtfs_filename_dt = compute_datetime_from_gtfs_resource_filename(folder_path)
    if gtfs_filename_dt is None:
        return None
    
    formatted_date = gtfs_filename_dt.strftime('%Y-%m-%d')
    
    return formatted_date

def compute_datetime_from_gtfs_resource_filename(file_path: str) -> Union[datetime.datetime, None]:
    if isinstance(file_path, str):
        file_path = Path(file_path)
        
    # gtfs_fp2021_2021-02-17_09-10
    # GTFS_FP2024_2024-04-15_08-54.zip
    dt_matches = re.match("^.+?[fpFP]([0-9]{4})_([0-9]{4})-([0-9]{2})-([0-9]{2})_([0-9]{2})-([0-9]{2}).*$", file_path.name)
    
    if dt_matches is None:
        return None
    
    file_dt_s = f'{dt_matches[2]}-{dt_matches[3]}-{dt_matches[4]} {dt_matches[5]}:{dt_matches[6]}'
    file_dt = datetime.datetime.strptime(file_dt_s, '%Y-%m-%d %H:%M')
    
    return file_dt

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

def massage_datetime_to_hhmm(datetime_s: str):
    if not datetime_s:
        return ''

    datetime_hours = datetime_s[0:2]
    datetime_minutes = datetime_s[3:5]

    datetime_hhmm = f'{datetime_hours}:{datetime_minutes}'
    return datetime_hhmm

def compute_date_from_gtfs_db_filename(db_filename: str):
    # gtfs_2021-03-10.sqlite
    date_matches = re.match("^.+?_([0-9]{4}-[0-9]{2}-[0-9]{2})\.sqlite$", db_filename)

    if not date_matches:
        return None

    gtfs_date = datetime.datetime.strptime(date_matches[1], '%Y-%m-%d').date()

    return gtfs_date

def compute_gtfs_db_filename(gtfs_day: str):
    db_filename = f'gtfs_{gtfs_day}.sqlite'
    return db_filename
