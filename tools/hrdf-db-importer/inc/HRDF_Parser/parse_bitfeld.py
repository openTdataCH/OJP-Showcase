import datetime
import sys

from ..shared.inc.helpers.log_helpers import log_message
from ..shared.inc.helpers.db_helpers import truncate_and_load_table_records

def import_db_bitfeld(hrdf_path, db_path, db_schema_config):
    log_message(f"IMPORT BITFELD")

    bitfeld_row_items = _parse_hrdf_bitfeld(hrdf_path)
    truncate_and_load_table_records(db_path, 'calendar', db_schema_config['tables']['calendar'], bitfeld_row_items)

def _parse_hrdf_bitfeld(hrdf_path):
    hrdf_from_date, hrdf_to_date = _parse_hrdf_eckdaten(hrdf_path)
    days_count = (hrdf_to_date - hrdf_from_date).days
    days_end_idx = days_count + 1 # adds one so we can include also the to_date
    
    bitfeld_row_items = []

    hrdf_file_path = f"{hrdf_path}/BITFELD"
    hrdf_file = open(hrdf_file_path, encoding='utf-8')
    for row_line in hrdf_file:
        row_line = row_line.strip()
        service_id = row_line[0:6]
        
        fplan_day_bits_hexa_s = row_line[7:].strip()
        fplan_day_bits_int = int(fplan_day_bits_hexa_s, base=16)
        fplan_day_bits_s = "{0:b}".format(fplan_day_bits_int)

        # HRDF inserts 2 bits before the first day of the start of the timetable
        fplan_day_bits_s = fplan_day_bits_s[2:]
        # Keep only the bits from the ECKDATEN
        fplan_day_bits_s = fplan_day_bits_s[0:days_end_idx]

        bitfeld_json = {
            "service_id": service_id,
            "start_date": hrdf_from_date.strftime('%Y%m%d'),
            "end_date": hrdf_to_date.strftime('%Y%m%d'),
            "day_bits": fplan_day_bits_s,
        }
        bitfeld_row_items.append(bitfeld_json)

    return bitfeld_row_items

def _parse_hrdf_eckdaten(hrdf_path):
    eckdaten_path = f"{hrdf_path}/ECKDATEN"
    eckdaten_file = open(eckdaten_path, encoding='utf-8')
    eckdaten_line_rows = eckdaten_file.read().split("\n")
    eckdaten_file.close()

    from_date = datetime.datetime.strptime(eckdaten_line_rows[0], "%d.%m.%Y")
    to_date = datetime.datetime.strptime(eckdaten_line_rows[1], "%d.%m.%Y")

    return from_date, to_date