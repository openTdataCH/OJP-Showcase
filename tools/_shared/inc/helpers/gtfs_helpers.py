import os, sys
import re
import datetime

from pathlib import Path

def compute_formatted_date_from_gtfs_folder_path(folder_path: Path):
    # gtfs_fp2021_2021-02-17_09-10
    opentransport_matches = re.match("^.+?fp([0-9]{4})_([0-9]{4})-([0-9]{2})-([0-9]{2})_.*$", folder_path.name)

    if opentransport_matches:
        matched_year = opentransport_matches[2]
        matched_month = opentransport_matches[3]
        matched_day = opentransport_matches[4]
        formatted_date = f"{matched_year}-{matched_month}-{matched_day}"
        return formatted_date

    return None

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