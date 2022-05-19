import datetime
import json
import sys

from ..shared.inc.helpers.log_helpers import log_message
from ..shared.inc.helpers.db_helpers import truncate_and_load_table_records
from ..shared.inc.helpers.hrdf_helpers import compute_file_rows_no, extract_hrdf_content, normalize_fplan_trip_id, normalize_agency_id

def import_db_fplan(hrdf_path, db_path, db_schema_config):
    log_message(f"Parse FPLAN ...")
    
    parser = HRDF_FPLAN_Parser(hrdf_path)
    parser.parse_fplan()

    log_message(f"MASSAGE rows ...")

    fplan_trip_bitfeld_rows = []

    for fplan_row_json in parser.fplan_rows:
        fplan_row_json["fplan_content"] = "\n".join(fplan_row_json["fplan_content_rows"])
        fplan_row_json["service_ids_cno"] = len(fplan_row_json["service_ids_json"])

        service_id_idx = 1
        for service_id_json in fplan_row_json["service_ids_json"]:
            fplan_row_idx = fplan_row_json["row_idx"]
            service_id = service_id_json["service_id"]
            fplan_trip_bitfeld_key = f"{fplan_row_idx}.{service_id_idx}"

            fplan_trip_bitfeld_row = {
                "fplan_trip_bitfeld_id": fplan_trip_bitfeld_key,
                "fplan_row_idx": fplan_row_idx,
                "service_id": service_id,
                "from_stop_id": service_id_json["from_stop_id"],
                "to_stop_id": service_id_json["to_stop_id"],
            }
            fplan_trip_bitfeld_rows.append(fplan_trip_bitfeld_row)

            service_id_idx += 1

    truncate_and_load_table_records(db_path, 'fplan', db_schema_config['tables']['fplan'], parser.fplan_rows)
    truncate_and_load_table_records(db_path, 'fplan_trip_bitfeld', db_schema_config['tables']['fplan_trip_bitfeld'], fplan_trip_bitfeld_rows)

    log_message(f"DONE")

class HRDF_FPLAN_Parser:
    def __init__(self, hrdf_path):
        self.hrdf_path = hrdf_path

        self.default_service_id = "000017" # TODO - DONT HARCODE ME

        self.fplan_rows = []
        self.current_fplan_row_json = None

    def parse_fplan(self):
        self.fplan_rows = []
        self.current_fplan_row_json = None

        row_line_idx = 1

        hrdf_file_path = f"{self.hrdf_path}/FPLAN"

        hrdf_file_rows_no = compute_file_rows_no(hrdf_file_path)
        log_message(f"... found {hrdf_file_rows_no} lines")

        map_ignore_row_types = {}

        hrdf_file = open(hrdf_file_path, encoding='utf-8')
        for row_line in hrdf_file:
            if (row_line_idx % 1000000) == 0:
                log_message(f"... parse {row_line_idx}/ {hrdf_file_rows_no} lines")

            row_line_type = extract_hrdf_content(row_line, 2, 5).strip()

            if row_line.startswith("*Z"):
                self._insert_fplan_row()
                self._parse_z_line(row_line_idx, row_line)
            elif row_line.startswith("*G"):
                self._parse_g_line(row_line)
            elif row_line.startswith("*A VE"):
                self._parse_a_ve_line(row_line)
            elif row_line.startswith("*L"):
                self._parse_l_line(row_line)
            elif not row_line.startswith("*"):
                a1 = "handle STOP"
            else:
                if row_line_type not in map_ignore_row_types:
                    map_ignore_row_types[row_line_type] = 0
                map_ignore_row_types[row_line_type] += 1

            self.current_fplan_row_json["fplan_content_rows"].append(row_line.strip())
            
            row_line_idx += 1
        hrdf_file.close()
        self._insert_fplan_row()

        if len(map_ignore_row_types.keys()) > 0: 
            log_message("Unhandled row_types:")
            print(map_ignore_row_types)

    def _insert_fplan_row(self):
        if not self.current_fplan_row_json:
            return

        new_row = self.current_fplan_row_json.copy()
        self.fplan_rows.append(new_row)

    def _parse_z_line(self, row_line_idx, row_line):
        fplan_trip_id = normalize_fplan_trip_id(extract_hrdf_content(row_line, 4, 9))
        agency_id = normalize_agency_id(extract_hrdf_content(row_line, 11, 16))
        frequency_cno = extract_hrdf_content(row_line, 24, 26, 0)
        frequency_interval = extract_hrdf_content(row_line, 28, 30)

        self.current_fplan_row_json = {
            "row_idx": row_line_idx,
            "agency_id": agency_id,
            "vehicle_type": None,
            "service_line": None,
            "fplan_trip_id": fplan_trip_id,
            "service_ids_json": [],
            "frequency_cno": frequency_cno,
            "frequency_interval": frequency_interval,
            "fplan_content_rows": [],
        }
    
    def _parse_g_line(self, row_line):
        vehicle_type = extract_hrdf_content(row_line, 4, 6)
        self.current_fplan_row_json["vehicle_type"] = vehicle_type

    def _parse_a_ve_line(self, row_line):
        from_stop_id = extract_hrdf_content(row_line, 7, 13)
        to_stop_id = extract_hrdf_content(row_line, 15, 21)
        service_id = extract_hrdf_content(row_line, 23, 28, self.default_service_id)

        service_id_json = {
            "from_stop_id": from_stop_id,
            "to_stop_id": to_stop_id,
            "service_id": service_id,
        }

        self.current_fplan_row_json["service_ids_json"].append(service_id_json)

    def _parse_l_line(self, row_line):
        service_line = extract_hrdf_content(row_line, 4, 11)
        self.current_fplan_row_json["service_line"] = service_line