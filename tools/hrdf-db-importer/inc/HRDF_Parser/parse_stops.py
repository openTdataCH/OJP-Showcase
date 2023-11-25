import datetime
import json
import sys

from ..shared.inc.helpers.db_helpers import log_message
from ..shared.inc.helpers.db_helpers import truncate_and_load_table_records
from ..shared.inc.helpers.hrdf_helpers import *
from .shared.inc.helpers.db_helpers import truncate_and_load_table_records, connect_db

def import_db_stops(hrdf_path, db_path, db_schema_config):
    log_message(f"IMPORT BFKOORD_WGS")

    fplan_stop_ids = _fetch_stops_from_fplan(db_path)
    stop_row_items = _parse_hrdf_stops(hrdf_path, fplan_stop_ids)
    truncate_and_load_table_records(db_path, 'stops', db_schema_config['tables']['stops'], stop_row_items)

def _fetch_stops_from_fplan(db_path):
    db_handle = connect_db(db_path)

    fplan_stop_ids = []

    log_message(f"QUERY stop_id FROM FPLAN ...")

    sql = "SELECT DISTINCT fplan_stop_times.stop_id FROM fplan_stop_times"
    select_cursor = db_handle.cursor()
    select_cursor.execute(sql)
    for db_row in select_cursor:
        stop_id = db_row[0]
        fplan_stop_ids.append(stop_id)
    select_cursor.close()

    fplan_stop_ids_cno = len(fplan_stop_ids)
    log_message(f"... found {fplan_stop_ids_cno} items")

    return fplan_stop_ids

def _parse_hrdf_stops(hrdf_path, fplan_stop_ids):
    stop_row_items = []

    log_message(f"Parse BFKOORD_WGS ...")
    hrdf_file_path = f"{hrdf_path}/BFKOORD_WGS"

    hrdf_file = open(hrdf_file_path)
    for row_line in hrdf_file:
        stop_id = extract_hrdf_content(row_line, 1, 7)
        stop_name = extract_hrdf_content(row_line, 40, 1000)
        stop_longitude = float(extract_hrdf_content(row_line, 9, 18))
        stop_latitude = float(extract_hrdf_content(row_line, 20, 29))
        stop_altitude = int(extract_hrdf_content(row_line, 31, 36))

        in_fplan = 1
        if stop_id not in fplan_stop_ids:
            in_fplan = 0

        stop_row_json = {
            "stop_id": stop_id,
            "stop_name": stop_name,
            "stop_lat": stop_latitude,
            "stop_lon": stop_longitude,
            "stop_altitude": stop_altitude,
            "in_fplan": in_fplan,
        }
        stop_row_items.append(stop_row_json)
    hrdf_file.close()

    return stop_row_items