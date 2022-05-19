import datetime
import json
import re
import sqlite3
import sys

from ..shared.inc.helpers.log_helpers import log_message
from ..shared.inc.helpers.db_helpers import truncate_and_load_table_records, table_select_rows
from ..shared.inc.helpers.hrdf_helpers import compute_file_rows_no, extract_hrdf_content, normalize_agency_id, normalize_fplan_trip_id

def import_meta_stops(app_config, hrdf_path, db_path, db_schema_config):
    log_message(f"IMPORT METABHF")

    default_service_id = app_config['hrdf_default_service_id']

    stop_relations_items = _parse_hrdf_meta_stops(hrdf_path)
    truncate_and_load_table_records(db_path, 'stop_relations', db_schema_config['tables']['stop_relations'], stop_relations_items)

    stop_transfer_lines_rows = _parse_hrdf_umsteig_lines(hrdf_path)
    truncate_and_load_table_records(db_path, 'stop_transfer_lines', db_schema_config['tables']['stop_transfer_lines'], stop_transfer_lines_rows)

    stop_transfer_trips_rows = _parse_hrdf_umsteig_trips(hrdf_path, db_path, default_service_id)
    truncate_and_load_table_records(db_path, 'stop_transfer_trips', db_schema_config['tables']['stop_transfer_trips'], stop_transfer_trips_rows)

    print('')

def _parse_hrdf_meta_stops(hrdf_path):
    row_line_idx = 1
    hrdf_file_path = f"{hrdf_path}/METABHF"
    hrdf_file_rows_no = compute_file_rows_no(hrdf_file_path)
    log_message(f"... found {hrdf_file_rows_no} lines")

    current_transfer_info = {}
    map_stop_transfer = {}

    hrdf_file = open(hrdf_file_path, encoding='utf-8')
    for row_line in hrdf_file:
        row_line = row_line.strip()

        is_group_row = row_line[7:8] == ':'
        if is_group_row:
            _add_transfer(map_stop_transfer, current_transfer_info.copy())

            meta_stop_id = extract_hrdf_content(row_line, 1, 7)
            if meta_stop_id not in map_stop_transfer:
                map_stop_transfer[meta_stop_id] = {}

            child_stop_ids_s = extract_hrdf_content(row_line, 9, 1000)
            child_stop_ids_s = re.sub(r"\s{2,}", " ", child_stop_ids_s)
            child_stop_ids = child_stop_ids_s.split(" ")

            for child_stop_id in child_stop_ids:
                if child_stop_id == meta_stop_id:
                    continue

                if child_stop_id in map_stop_transfer[meta_stop_id]:
                    # handled by *A Y transfer types
                    continue

                map_stop_transfer[meta_stop_id][child_stop_id] = {
                    "is_generic": 1
                }
        else:
            is_special_row = row_line[0:1] == '*'
            if is_special_row:
                if row_line == "*A Y":
                    current_transfer_info["attributes"]["walk_minutes"] = current_transfer_info["transfer_time"]
                elif row_line == "*A YB":
                    current_transfer_info["attributes"]["walk_plus_bus_minutes"] = current_transfer_info["transfer_time"]
                elif row_line == "*A YM":
                    current_transfer_info["attributes"]["walk_plus_underground_minutes"] = current_transfer_info["transfer_time"]
                elif row_line == "*A YT":
                    current_transfer_info["attributes"]["walk_plus_tram_minutes"] = current_transfer_info["transfer_time"]
                else:
                    print(f"METABHF, unknown line type: {row_line}")
                    sys.exit()
            else:
                if current_transfer_info:
                    _add_transfer(map_stop_transfer, current_transfer_info.copy())
                    current_transfer_info = None

                from_stop_id = extract_hrdf_content(row_line, 1, 7)
                to_stop_id = extract_hrdf_content(row_line, 9, 15)
                transfer_time = int(extract_hrdf_content(row_line, 17, 19))

                current_transfer_info = {
                    "from_stop_id": from_stop_id,
                    "to_stop_id": to_stop_id,
                    "transfer_time": transfer_time,
                    "attributes" : {}
                }

        row_line_idx += 1

    hrdf_file.close()

    meta_stops_no = len(list(map_stop_transfer.keys()))
    log_message(f"... found {meta_stops_no} meta stops")

    stop_relations_items = []

    for from_stop_id in map_stop_transfer:
        for to_stop_id in map_stop_transfer[from_stop_id]:
            stop_transfer_info = {
                "from_stop_id": from_stop_id,
                "to_stop_id": to_stop_id,
            }

            transfer_attributes = map_stop_transfer[from_stop_id][to_stop_id]
            for known_attribute in ["is_generic", "walk_minutes", "walk_plus_bus_minutes", "walk_plus_underground_minutes"]:
                if known_attribute in transfer_attributes:
                    stop_transfer_info[known_attribute] = transfer_attributes[known_attribute]

            stop_relations_items.append(stop_transfer_info)

    return stop_relations_items

def _add_transfer(map_stop_transfer, transfer_info):
    from_stop_id = transfer_info["from_stop_id"]
    to_stop_id = transfer_info["to_stop_id"]
    if from_stop_id not in map_stop_transfer:
        map_stop_transfer[from_stop_id] = {}

    if to_stop_id not in map_stop_transfer[from_stop_id]:
        map_stop_transfer[from_stop_id][to_stop_id] = {}

    for transfer_type in transfer_info["attributes"]:
        map_stop_transfer[from_stop_id][to_stop_id][transfer_type] = transfer_info["attributes"][transfer_type]

def _parse_hrdf_umsteig_lines(hrdf_path):
    hrdf_file_path = f"{hrdf_path}/UMSTEIGL"
    hrdf_file_rows_no = compute_file_rows_no(hrdf_file_path)
    log_message(f"... found {hrdf_file_rows_no} lines")

    stop_transfer_lines_rows = []

    hrdf_file = open(hrdf_file_path, encoding='utf-8')
    for row_line in hrdf_file:
        row_line = row_line.strip()

        stop_id = extract_hrdf_content(row_line, 1, 7)
        
        from_agency_id = normalize_agency_id(extract_hrdf_content(row_line, 9, 14))
        from_vehicle_type = extract_hrdf_content(row_line, 16, 18)
        from_line_id = extract_hrdf_content(row_line, 20, 27)

        to_agency_id = normalize_agency_id(extract_hrdf_content(row_line, 31, 36))
        to_vehicle_type = extract_hrdf_content(row_line, 38, 40)
        to_line_id = extract_hrdf_content(row_line, 42, 49)

        transfer_time = extract_hrdf_content(row_line, 53, 55)

        stop_transfer_line_row = {
            "stop_id": stop_id,
            "from_agency_id": from_agency_id,
            "from_vehicle_type": from_vehicle_type,
            "from_line_id": from_line_id,
            "to_agency_id": to_agency_id,
            "to_vehicle_type": to_vehicle_type,
            "to_line_id": to_line_id,
            "transfer_time": transfer_time,
        }
        
        stop_transfer_lines_rows.append(stop_transfer_line_row)

    return stop_transfer_lines_rows

def _parse_hrdf_umsteig_trips(hrdf_path, db_path, default_service_id):
    db_handle = sqlite3.connect(db_path)

    row_line_idx = 1
    hrdf_file_path = f"{hrdf_path}/UMSTEIGZ"
    hrdf_file_rows_no = compute_file_rows_no(hrdf_file_path)
    log_message(f"... found {hrdf_file_rows_no} lines")

    stop_transfer_trips_rows = []

    hrdf_file = open(hrdf_file_path, encoding='utf-8')
    for row_line in hrdf_file:
        row_line = row_line.strip()

        stop_id = extract_hrdf_content(row_line, 1, 7)
        
        from_agency_id = normalize_agency_id(extract_hrdf_content(row_line, 16, 21))
        from_trip_id = normalize_fplan_trip_id(extract_hrdf_content(row_line, 9, 14))
        
        from_fplan_rows = table_select_rows(db_handle, "fplan", where_clause = f"WHERE agency_id = '{from_agency_id}' AND fplan_trip_id = '{from_trip_id}'")
        if len(from_fplan_rows) == 0:
            print(f"cant find {from_agency_id} and {from_trip_id}")
            continue

        from_fplan_row_idx = from_fplan_rows[0]["row_idx"]
        
        to_agency_id = normalize_agency_id(extract_hrdf_content(row_line, 30, 35))
        to_trip_id = normalize_fplan_trip_id(extract_hrdf_content(row_line, 23, 28))

        to_fplan_rows = table_select_rows(db_handle, "fplan", where_clause = f"WHERE agency_id = '{to_agency_id}' AND fplan_trip_id = '{to_trip_id}'")
        if len(to_fplan_rows) == 0:
            print(f"cant find {to_agency_id} and {to_trip_id}")
            continue

        to_fplan_row_idx = to_fplan_rows[0]["row_idx"]

        transfer_time = extract_hrdf_content(row_line, 37, 39)

        service_id = extract_hrdf_content(row_line, 42, 47, default_service_id)

        stop_transfer_trip_row = {
            "stop_id": stop_id,
            "from_fplan_row_idx": from_fplan_row_idx,
            "to_fplan_row_idx": to_fplan_row_idx,
            "transfer_time": transfer_time,
            "service_id": service_id,
        }

        stop_transfer_trips_rows.append(stop_transfer_trip_row)

        row_line_idx += 1

    return stop_transfer_trips_rows
