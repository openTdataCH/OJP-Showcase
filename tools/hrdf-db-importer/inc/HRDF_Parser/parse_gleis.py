import os, sys
import datetime
import json

from ..shared.inc.helpers.log_helpers import log_message
from ..shared.inc.helpers.db_helpers import truncate_and_load_table_records
from ..shared.inc.helpers.hrdf_helpers import compute_file_rows_no, extract_hrdf_content, normalize_fplan_trip_id, normalize_agency_id, parse_kennung_to_dict
from ..shared.inc.helpers.db_table_csv_importer import DB_Table_CSV_Importer
from ..shared.inc.helpers.csv_updater import CSV_Updater

def import_db_gleis(app_config, hrdf_path, db_path, db_schema_config):
    log_message(f"IMPORT GLEIS")

    default_service_id = app_config['hrdf_default_service_id']

    _parse_hrdf_gleis(hrdf_path, db_path, default_service_id, db_schema_config)

    print('')

def _parse_hrdf_gleis(hrdf_path, db_path, default_service_id, db_schema_config):
    log_message('START CREATE GLEIS CSV files...')

    gleis_classification_table_config = db_schema_config['tables']['gleis_classification']
    gleis_classification_csv_path = f'/tmp/gleis_classification.csv'
    gleis_classification_csv_writer = CSV_Updater.init_with_table_config(gleis_classification_csv_path, gleis_classification_table_config)

    gleis_table_config = db_schema_config['tables']['gleis']
    gleis_table_csv_path = f'/tmp/gleis.csv'
    gleis_table_csv_writer = CSV_Updater.init_with_table_config(gleis_table_csv_path, gleis_table_config)

    row_line_idx = 0

    hrdf_file_path = f"{hrdf_path}/GLEIS"
    hrdf_file_rows_no = compute_file_rows_no(hrdf_file_path)
    log_message(f"... found {hrdf_file_rows_no} lines")

    hrdf_file = open(hrdf_file_path, encoding='utf-8')
    for row_line in hrdf_file:
        if (row_line_idx % 1000000) == 0:
            log_message(f"... GLEIS.loop parse {row_line_idx}/ {hrdf_file_rows_no} lines")

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

            row_json = {
                'gleis_classification_key': gleis_classification_key,
                'gleis_stop_info_id': gleis_stop_info_id,
                'agency_id': agency_id,
                'fplan_trip_id': fplan_trip_id,
                'stop_id': stop_id,
                'service_id': service_id,
                'gleis_time': gleis_time,
                'row_idx': row_line_idx + 1,
            }

            gleis_classification_csv_writer.prepare_row(row_json)
        else:
            stop_id = extract_hrdf_content(row_line, 1, 7)
            gleis_info_id = extract_hrdf_content(row_line, 9, 16)
            track_definition_s = extract_hrdf_content(row_line, 18, 1000)

            track_definition_dict = parse_kennung_to_dict(track_definition_s)

            gleis_stop_info_json = {
                "gleis_id": f"{stop_id}.{gleis_info_id}",
                "stop_id": stop_id,
                "gleis_info_id": gleis_info_id,
                'row_idx': row_line_idx + 1,
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

            gleis_table_csv_writer.prepare_row(gleis_stop_info_json)
        # end if/else classification

        row_line_idx += 1
    # loop GLEIS

    gleis_classification_csv_writer.close()
    gleis_table_csv_writer.close()

    log_message('... DONE CREATE GLEIS CSV files')
    print('')

    for table_name in ['gleis', 'gleis_classification']:
        table_csv_path = gleis_table_csv_path if table_name == 'gleis' else gleis_classification_csv_path
        table_csv_importer = DB_Table_CSV_Importer(db_path, table_name, db_schema_config['tables'][table_name])
        table_csv_importer.truncate_table()
        table_csv_importer.load_csv_file(table_csv_path)
        table_csv_importer.add_table_indexes()
        table_csv_importer.close()

    log_message('... DONE DB GLEIS INSERT')
    print('')
