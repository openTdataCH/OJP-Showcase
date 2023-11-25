import os, sys
import datetime
import yaml

from .parse_infotext import parse_infotext
from .shared.inc.helpers.log_helpers import log_message
from .shared.inc.helpers.hrdf_helpers import compute_file_rows_no, extract_hrdf_content, normalize_fplan_trip_id, normalize_agency_id
from .shared.inc.helpers.db_table_csv_importer import DB_Table_CSV_Importer

def import_db_fplan(app_config, hrdf_path, db_path):
    log_message("IMPORT FPLAN")

    db_schema_config_path = app_config['other_configs']['schema_config_path']
    db_schema_config = yaml.safe_load(open(db_schema_config_path, encoding='utf-8'))

    log_message("... HRDF_FPLAN_Parser init")

    default_service_id = app_config['hrdf_default_service_id']

    parser = HRDF_FPLAN_Parser(hrdf_path, db_path, db_schema_config, default_service_id)
    parser.parse_fplan()

class HRDF_FPLAN_Parser:
    def __init__(self, hrdf_path, db_path, db_schema_config, default_service_id):
        self.hrdf_path = hrdf_path

        self.default_service_id = default_service_id

        fplan_table_config = db_schema_config['tables']['fplan']
        self.fplan_table_writer = DB_Table_CSV_Importer(db_path, 'fplan', fplan_table_config)
        self.fplan_table_writer.truncate_table()

        fplan_bitfeld_table_config = db_schema_config['tables']['fplan_trip_bitfeld']
        self.fplan_bitfeld_table_writer = DB_Table_CSV_Importer(db_path, 'fplan_trip_bitfeld', fplan_bitfeld_table_config)
        self.fplan_bitfeld_table_writer.truncate_table()

    def parse_fplan(self):
        fplan_table_writer_csv_path = '/tmp/fplan.csv'
        self.fplan_table_writer.create_csv_file(fplan_table_writer_csv_path)

        fplan_bitfeld_table_writer_csv_path = '/tmp/fplan_trip_bitfeld.csv'
        self.fplan_bitfeld_table_writer.create_csv_file(fplan_bitfeld_table_writer_csv_path)

        log_message('START PARSE FPLAN...')

        current_fplan_row_json = {}

        row_line_idx = 1

        hrdf_file_path = f"{self.hrdf_path}/FPLAN"

        hrdf_file_rows_no = compute_file_rows_no(hrdf_file_path)
        log_message(f"... found {hrdf_file_rows_no} lines")

        map_ignore_row_types = {}

        map_infotext = parse_infotext(self.hrdf_path)

        hrdf_file = open(hrdf_file_path, encoding='utf-8')
        for row_line in hrdf_file:
            if (row_line_idx % 5000000) == 0:
                log_message(f"... parse {row_line_idx}/ {hrdf_file_rows_no} lines")

            row_line_type = extract_hrdf_content(row_line, 2, 5).strip()

            if row_line.startswith("*"):
                if row_line.startswith("*Z"):
                    self._insert_fplan_row(current_fplan_row_json)
                    current_fplan_row_json = self._parse_z_line(row_line_idx, row_line)
                elif row_line.startswith("*G"):
                    current_fplan_row_json["vehicle_type"] = self._parse_g_line(row_line)
                elif row_line.startswith("*A VE"):
                    service_id_json = self._parse_a_ve_line(row_line)
                    current_fplan_row_json["service_ids_json"].append(service_id_json)
                elif row_line.startswith("*L"):
                    current_fplan_row_json["service_line"] = self._parse_l_line(row_line)
                elif row_line.startswith('*I JY'):
                    current_fplan_row_json['infotext_id'] = self._parse_jy_line(row_line, map_infotext)
                else:
                    if row_line_type not in map_ignore_row_types:
                        map_ignore_row_types[row_line_type] = 0
                    map_ignore_row_types[row_line_type] += 1
            # else - is a stop_time row, ignore it

            current_fplan_row_json["fplan_content_rows"].append(row_line.strip())

            row_line_idx += 1
        hrdf_file.close()

        # insert last *Z
        self._insert_fplan_row(current_fplan_row_json)

        if len(map_ignore_row_types.keys()) > 0: 
            log_message("Unhandled row_types:")
            print(map_ignore_row_types)

        log_message('... DONE CREATE FPLAN CSV')
        print('')

        log_message('START INSERT FPLAN CSV...')
        self.fplan_table_writer.close_csv_file()
        self.fplan_table_writer.load_csv_file(fplan_table_writer_csv_path)
        self.fplan_table_writer.add_table_indexes()
        log_message('... DONE')
        print('')

        log_message('START INSERT FPLAN_BITFELD CSV...')
        self.fplan_bitfeld_table_writer.close_csv_file()
        self.fplan_bitfeld_table_writer.load_csv_file(fplan_bitfeld_table_writer_csv_path)
        self.fplan_bitfeld_table_writer.add_table_indexes()
        log_message('... DONE')

    def _insert_fplan_row(self, fplan_row_json):
        if not fplan_row_json:
            return

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

            self.fplan_bitfeld_table_writer.write_csv_handle.writerow(fplan_trip_bitfeld_row)
            service_id_idx += 1

        fplan_row_json.pop('fplan_content_rows', None)
        fplan_row_json.pop('service_ids_json', None)

        self.fplan_table_writer.write_csv_handle.writerow(fplan_row_json)

    def _parse_z_line(self, row_line_idx, row_line):
        fplan_trip_id = normalize_fplan_trip_id(extract_hrdf_content(row_line, 4, 9))
        agency_id = normalize_agency_id(extract_hrdf_content(row_line, 11, 16))
        frequency_cno = extract_hrdf_content(row_line, 24, 26, 0)
        frequency_interval = extract_hrdf_content(row_line, 28, 30)

        fplan_row_json = {
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

        return fplan_row_json

    def _parse_g_line(self, row_line):
        vehicle_type = extract_hrdf_content(row_line, 4, 6)
        return vehicle_type

    def _parse_a_ve_line(self, row_line):
        from_stop_id = extract_hrdf_content(row_line, 7, 13)
        to_stop_id = extract_hrdf_content(row_line, 15, 21)
        service_id = extract_hrdf_content(row_line, 23, 28, self.default_service_id)

        service_id_json = {
            "from_stop_id": from_stop_id,
            "to_stop_id": to_stop_id,
            "service_id": service_id,
        }

        return service_id_json

    def _parse_l_line(self, row_line):
        service_line = extract_hrdf_content(row_line, 4, 11)
        return service_line

    # *I JY                        000000000
    def _parse_jy_line(self, row_line, map_infotext):
        infotext_id = row_line[29:38].strip()
        infotext_value = None
        if infotext_id in map_infotext:
            infotext_value = map_infotext[infotext_id]

        return infotext_value
