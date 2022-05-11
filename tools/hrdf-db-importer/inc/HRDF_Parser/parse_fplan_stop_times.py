import datetime
import json
import sqlite3
import sys
import yaml

from pathlib import Path

from ..shared.inc.helpers.log_helpers import log_message
from ..shared.inc.helpers.db_helpers import truncate_and_load_table_records
from ..shared.inc.helpers.hrdf_helpers import extract_hrdf_content
from ..shared.inc.helpers.bundle_helpers import load_resource_from_bundle
from ..shared.inc.helpers.db_table_csv_importer import DB_Table_CSV_Importer

def import_db_stop_times(app_config, db_path, db_schema_config):
    parser = HRDF_FPLAN_Stops_Parser(app_config, db_path)

    map_gleis = parser.fetch_map_gleis()
    
    
    parser.parse_fplan_stops(map_gleis)

    log_message(f"DONE")

class HRDF_FPLAN_Stops_Parser:
    def __init__(self, app_config, db_path):
        if isinstance(db_path, str):
            db_path = Path(db_path)

        self.app_config = app_config
        self.db_path = db_path
        self.db_handle = sqlite3.connect(db_path)
        self.db_handle.row_factory = sqlite3.Row
        
        schema_config_path = app_config['other_configs']['schema_config_path']
        self.db_schema_config = yaml.safe_load(open(schema_config_path, encoding='utf-8'))

    def fetch_map_gleis(self):
        log_message(f"QUERY GLEIS ...")
        map_gleis = {}

        sql = "SELECT gleis_classification_key, gleis_stop_info_id FROM gleis_classification"
        select_cursor = self.db_handle.cursor()
        select_cursor.execute(sql)
        for db_row in select_cursor:
            gleis_classification_key = db_row['gleis_classification_key']
            gleis_stop_info_id = db_row['gleis_stop_info_id']

            map_gleis[gleis_classification_key] = gleis_stop_info_id
        select_cursor.close()

        map_gleis_cno = len(map_gleis.keys())
        log_message(f"... mapped {map_gleis_cno} GLEIS entries")

        return map_gleis

    def parse_fplan_stops(self, map_gleis):
        log_message(f"TRUNCATE fplan_stop_times, create fplan_stop_times.csv ...")
        table_config = self.db_schema_config['tables']['fplan_stop_times']
        db_table_writer = DB_Table_CSV_Importer(self.db_path, 'fplan_stop_times', table_config)
        db_table_writer.truncate_table()

        db_table_writer_csv_path = f'/tmp/fplan_stop_times.csv'
        db_table_writer.create_csv_file(db_table_writer_csv_path)

        log_message(f"QUERY FPLAN_TRIP_BETRIEB ...")

        sql = load_resource_from_bundle(self.app_config['map_sql_queries'], 'fplan_join_trip_bitfeld')

        select_cursor = self.db_handle.cursor()
        select_cursor.execute(sql)

        trip_row_idx = 1
        for db_row in select_cursor:
            if trip_row_idx % 100000 == 0:
                log_message(f"... parsed {trip_row_idx} rows ...")

            fplan_row_idx = db_row['row_idx']
            fplan_trip_bitfeld_id = db_row['fplan_trip_bitfeld_id']
            fplan_content = db_row['fplan_content']
            service_id = db_row['service_id']
            from_stop_id = db_row['from_stop_id']
            to_stop_id = db_row['to_stop_id']
            agency_id = db_row['agency_id']
            fplan_trip_id = db_row['fplan_trip_id']

            stop_times_json = self.parse_stop_times_from_fplan_content(fplan_content)

            from_idx = None
            to_idx = None
            for stop_idx, stop_time_json in enumerate(stop_times_json):
                stop_time_json["fplan_trip_bitfeld_id"] = fplan_trip_bitfeld_id
                stop_id = stop_time_json['stop_id']

                if from_idx is None:
                    if from_stop_id == stop_id:
                        from_idx = stop_idx
                
                if to_stop_id == stop_id:
                    to_idx = stop_idx

                gleis_key = f"{agency_id}.{fplan_trip_id}.{stop_id}.{service_id}"
                if gleis_key in map_gleis:
                    stop_time_json["gleis_id"] = map_gleis[gleis_key]

            if (from_idx is None) or (to_idx is None):
                print(f'ERROR stop_times: fplan.row_idx = {fplan_row_idx}')
                print(f'from_idx: {from_idx}')
                print(f'to_idx: {to_idx}')
                print(db_row)

                service_stop_times_json = []
                # sys.exit()
                continue
            else:
                service_stop_times_json = stop_times_json[from_idx : to_idx + 1]
                service_stop_times_json[0]["stop_arrival"] = None
                service_stop_times_json[0]["is_boarding_allowed"] = None
                service_stop_times_json[-1]["stop_departure"] = None
                service_stop_times_json[-1]["is_getoff_allowed"] = None

            db_table_writer.write_csv_handle.writerows(service_stop_times_json)

            trip_row_idx += 1
        select_cursor.close()

        db_table_writer.close_csv_file()
        db_table_writer.load_csv_file(db_table_writer_csv_path)

    def parse_stop_times_from_fplan_content(self, fplan_content):
        stop_times_json = []

        fplan_content_rows = fplan_content.split("\n")
        for row_line in fplan_content_rows:
            if row_line.startswith("*"):
                continue

            stop_id = extract_hrdf_content(row_line, 1, 7)
            
            is_boarding_allowed_s = extract_hrdf_content(row_line, 30, 30)
            is_boarding_allowed = 0 if is_boarding_allowed_s == '-' else 1
            stop_arrival = extract_hrdf_content(row_line, 32, 35)
            
            is_getoff_allowed_s = extract_hrdf_content(row_line, 37, 37)
            is_getoff_allowed = 0 if is_getoff_allowed_s == '-' else 1
            stop_departure = extract_hrdf_content(row_line, 39, 42)

            fplan_stop_time_json = {
                'stop_id': stop_id,
                'stop_arrival': stop_arrival,
                'stop_departure': stop_departure,
                'is_boarding_allowed': is_boarding_allowed,
                'is_getoff_allowed': is_getoff_allowed,
            }
            stop_times_json.append(fplan_stop_time_json)

        return stop_times_json
