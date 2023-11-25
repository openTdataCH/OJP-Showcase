import os
import sys

from .shared.inc.helpers.log_helpers import log_message
from .shared.inc.helpers.hrdf_helpers import compute_file_rows_no

def parse_infotext(hrdf_path):
    log_message("... PARSE INFOTEXT")

    hrdf_file_path = f"{hrdf_path}/INFOTEXT_DE"
    hrdf_file_rows_no = compute_file_rows_no(hrdf_file_path)
    log_message(f"... PARSE_INFOTEXT: found {hrdf_file_rows_no} INFOTEXT lines")

    map_values = {}
    hrdf_file = open(hrdf_file_path, encoding='utf-8')
    for row_line in hrdf_file:
        row_line = row_line.strip()
        infotext_id = row_line[0:9]
        infotext_value = row_line[10:255].strip()

        if infotext_id in map_values:
            print(f'ERROR - {infotext_id} already in the file')
            print(f'EXISTING: {map_values[infotext_id]}')
            print(f'NEW     : {row_line}')
            sys.exit()
        map_values[infotext_id] = infotext_value
    # loop hrdf_file lines

    print('... PARSE_INFOTEXT - DONE')

    return map_values
