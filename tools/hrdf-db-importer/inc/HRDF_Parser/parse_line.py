import os
import sys

from pathlib import Path

from .shared.inc.helpers.log_helpers import log_message
from .shared.inc.helpers.hrdf_helpers import compute_file_rows_no
from .shared.inc.helpers.db_table_csv_importer import DB_Table_CSV_Importer
from .shared.inc.helpers.csv_updater import CSV_Updater

def import_db_line(app_config, db_schema_config, hrdf_path, db_path: Path):
    log_message("IMPORT LINIE")

    map_hrdf_line_properties = app_config['map_hrdf_line_properties']
    hrdf_line_property_keys = list(map_hrdf_line_properties.keys())

    map_line_data = _parse_hrdf_line(hrdf_line_property_keys, hrdf_path)
    _parse_map_line_data(map_line_data, db_schema_config, db_path)

def _parse_hrdf_line(hrdf_line_property_keys, hrdf_path):
    log_message('START PARSE HRDF.LINIE...')
    hrdf_file_path = f"{hrdf_path}/LINIE"
    hrdf_file_rows_no = compute_file_rows_no(hrdf_file_path)
    log_message(f"... found {hrdf_file_rows_no} lines")

    row_line_idx = 0

    map_line_data = {}

    hrdf_file = open(hrdf_file_path, encoding='utf-8')
    for row_line in hrdf_file:
        if (row_line_idx % 1000000) == 0:
            log_message(f"... LINIE.loop parse {row_line_idx}/ {hrdf_file_rows_no} lines")

        row_line = row_line.strip()

        line_id = row_line[0:7]
        line_property_data = row_line[8:].strip()
        property_key, property_value = _parse_line_property(line_property_data, hrdf_line_property_keys)
        if property_key is None:
            print(f'ERROR: Cant _parse_line_property =={line_property_data}==')
            sys.exit(1)

        if line_id not in map_line_data:
            map_line_data[line_id] = {}

        map_line_data[line_id][property_key] = property_value

        row_line_idx += 1
    # loop LINIE

    return map_line_data

def _parse_map_line_data(map_line_data, db_schema_config, db_path):
    csv_write_base_path = f'/tmp/{db_path.name}'
    service_line_table_config = db_schema_config['tables']['service_line']
    service_line_csv_path = f'{csv_write_base_path}-service_line.csv'
    service_line_csv_writer = CSV_Updater.init_with_table_config(service_line_csv_path, service_line_table_config)

    for line_id, line_metadata in map_line_data.items():
        service_line_db_row = {
            'service_line_id': f'#{line_id}',
        }

        for property_key, property_value in line_metadata.items():
            if property_key == 'K':
                service_line_db_row['line_code'] = property_value
            if property_key == 'N T':
                service_line_db_row['short_line_name'] = property_value
            if property_key == 'F':
                service_line_db_row['color'] = _parse_color(property_value)
            if property_key == 'B':
                service_line_db_row['bg_color'] = _parse_color(property_value)
        # loop metadata keys

        service_line_csv_writer.prepare_row(service_line_db_row)
    # loop LINE metadata rows

    service_line_csv_writer.close()

    log_message('START SERVICE_LINE DB INSERT')

    table_csv_importer = DB_Table_CSV_Importer(db_path, 'service_line', db_schema_config['tables']['service_line'])
    table_csv_importer.truncate_table()
    table_csv_importer.load_csv_file(service_line_csv_path)
    table_csv_importer.add_table_indexes()
    table_csv_importer.close()

    log_message('... DONE SERVICE_LINE DB INSERT')

def _parse_line_property(line_property_data, hrdf_line_property_keys):
    property_value = None

    for property_key in hrdf_line_property_keys:
        if not line_property_data.startswith(property_key):
            continue

        property_value = line_property_data[len(property_key):].strip()

        return property_key, property_value

    return None, None

def _parse_color(metadata_text):
    rgb_parts = [f'{int(x):02x}' for x in metadata_text.split(' ')]
    rgb_text = '#' + ''.join(rgb_parts)
    return rgb_text
