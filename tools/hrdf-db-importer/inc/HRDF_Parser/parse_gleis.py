import datetime
import json
# import sys

from ..shared.inc.helpers.log_helpers import log_message
from ..shared.inc.helpers.db_helpers import truncate_and_load_table_records
from ..shared.inc.helpers.hrdf_helpers import compute_file_rows_no, extract_hrdf_content, normalize_fplan_trip_id, normalize_agency_id, parse_kennung_to_dict


def import_db_gleis(app_config, hrdf_path, db_path, db_schema_config):
    log_message(f"IMPORT GLEIS")

    default_service_id = app_config['hrdf_default_service_id']

    gleis_classification_rows, gleis_stop_info_rows = _parse_hrdf_gleis(hrdf_path, default_service_id)

    truncate_and_load_table_records(db_path, 'gleis_classification', db_schema_config['tables']['gleis_classification'], gleis_classification_rows)
    truncate_and_load_table_records(db_path, 'gleis', db_schema_config['tables']['gleis'], gleis_stop_info_rows)

    print('')

def _parse_hrdf_gleis(hrdf_path, default_service_id):
    map_group_by_key = {}
    gleis_stop_info_rows = []

    row_line_idx = 1

    hrdf_file_path = f"{hrdf_path}/GLEIS"
    hrdf_file_rows_no = compute_file_rows_no(hrdf_file_path)
    log_message(f"... found {hrdf_file_rows_no} lines")

    hrdf_file = open(hrdf_file_path, encoding='utf-8')
    for row_line in hrdf_file:
        if (row_line_idx % 100000) == 0:
            log_message(f"... parse {row_line_idx}/ {hrdf_file_rows_no} lines")

        row_line = row_line.strip()
        
        is_classification_row = extract_hrdf_content(row_line, 23, 23) == '#'
        if is_classification_row:
            stop_id = extract_hrdf_content(row_line, 1, 7)
            fplan_trip_id = normalize_fplan_trip_id(extract_hrdf_content(row_line, 9, 14))
            agency_id = normalize_agency_id(extract_hrdf_content(row_line, 16, 21))
            gleis_info_id = extract_hrdf_content(row_line, 23, 30)
            gleis_time = extract_hrdf_content(row_line, 32, 35)
            
            service_id = extract_hrdf_content(row_line, 37, 42)
            if not service_id:
                service_id = default_service_id

            gleis_classification_key = f"{agency_id}.{fplan_trip_id}.{stop_id}.{service_id}"
            gleis_stop_info_id = f"{stop_id}.{gleis_info_id}"

            if not gleis_classification_key in map_group_by_key:
                map_group_by_key[gleis_classification_key] = {
                    "gleis_classification_key": gleis_classification_key,
                    "gleis_stop_info_id": gleis_stop_info_id,
                    "agency_id": agency_id,
                    "fplan_trip_id": fplan_trip_id,
                    "stop_id": stop_id,
                    "service_id": service_id,
                    "gleis_rows": []
                }

            gleis_row_json = {
                "row_line_idx": row_line_idx,
                "gleis_time": gleis_time,
            }
            map_group_by_key[gleis_classification_key]["gleis_rows"].append(gleis_row_json)

        else:
            stop_id = extract_hrdf_content(row_line, 1, 7)
            gleis_info_id = extract_hrdf_content(row_line, 9, 16)
            track_definition_s = extract_hrdf_content(row_line, 18, 1000)

            track_definition_dict = parse_kennung_to_dict(track_definition_s)

            gleis_stop_info_json = {
                "gleis_id": f"{stop_id}.{gleis_info_id}",
                "stop_id": stop_id,
                "gleis_info_id": gleis_info_id
            }

            track_full_text_parts = []
            if "G" in track_definition_dict:
                gleis_stop_info_json["track_no"] = track_definition_dict["G"]
                track_full_text_parts.append(track_definition_dict["G"])

            if "T" in track_definition_dict:
                gleis_stop_info_json["delimiter"] = track_definition_dict["T"]
                track_full_text_parts.append(track_definition_dict["T"])
            
            if "A" in track_definition_dict:
                gleis_stop_info_json["sector_no"] = track_definition_dict["A"]
                track_full_text_parts.append(track_definition_dict["A"])

            if len(track_full_text_parts) > 0:
                gleis_stop_info_json["track_full_text"] = "".join(track_full_text_parts)

            gleis_stop_info_rows.append(gleis_stop_info_json)

        row_line_idx += 1

    hrdf_file.close()

    log_message(f"... aggregating ...")

    for gleis_classification_key in map_group_by_key:
        gleis_classification_json = map_group_by_key[gleis_classification_key]
        
        gleis_classification_json["gleis_rows_cno"] = len(gleis_classification_json["gleis_rows"])
        gleis_classification_json["gleis_rows_json_s"] = json.dumps(gleis_classification_json["gleis_rows"], sort_keys=True, indent=4)

    gleis_classification_rows = list(map_group_by_key.values())

    return gleis_classification_rows, gleis_stop_info_rows
