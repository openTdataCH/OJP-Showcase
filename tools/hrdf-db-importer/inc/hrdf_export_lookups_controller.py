import os
import sys

from pathlib import Path

from .shared.inc.helpers.db_helpers import table_select_rows, connect_db
from .shared.inc.helpers.log_helpers import log_message
from .shared.inc.helpers.json_helpers import export_json_to_file
from .shared.inc.helpers.hrdf_helpers import compute_formatted_date_from_hrdf_db_path, compute_calendar_info

class HRDF_Export_Lookups_Controller:
    def __init__(self, app_config, hrdf_db_path: Path):
        self.hrdf_db_path = hrdf_db_path

        self.hrdf_db = connect_db(hrdf_db_path)

        hrdf_db_filename = hrdf_db_path.name
        hrdf_day = compute_formatted_date_from_hrdf_db_path(hrdf_db_filename)
        if hrdf_day is None:
            print(f'ERROR - cant read HRDF day from {hrdf_db_path}')
            sys.exit(1)

        hrdf_db_lookups_json_path = app_config['hrdf_db_lookups']['base_path'] + '/' + app_config['hrdf_db_lookups']['db_lookups_filename']
        self.hrdf_db_lookups_json_path = hrdf_db_lookups_json_path.replace('[HRDF_DAY]', hrdf_day)

        self.map_table_keys = app_config['hrdf_db_lookups']['map_table_pks']

    def export(self):
        print('=================================')
        print('HRDF export lookups')
        print('=================================')
        print(f'HRDF DB PATH: {self.hrdf_db_path}')
        print(f'EXPORT JSON PATH: {self.hrdf_db_lookups_json_path}')
        print('=================================')
        print('')

        log_message('START')

        calendar_start_date, calendar_days_no = compute_calendar_info(self.hrdf_db)

        export_hrdf_db_lookups_json = {
            'calendar_data': {
                'start_date': calendar_start_date.strftime("%Y-%m-%d"),
                'days_no': calendar_days_no,
            }
        }

        map_db_lookups_json = self._compute_json_db_lookups(self.hrdf_db)
        export_hrdf_db_lookups_json.update(map_db_lookups_json)

        export_json_to_file(export_hrdf_db_lookups_json, self.hrdf_db_lookups_json_path, pretty_print=True)

        log_message(f'... saved to {self.hrdf_db_lookups_json_path}')

        log_message(f'DONE')

    def _compute_json_db_lookups(self, db_handle):
        map_db_lookups = {}

        for (table_name, pk_field) in self.map_table_keys.items():
            map_db_lookups[table_name] = table_select_rows(db_handle, table_name, group_by_key=pk_field)

        return map_db_lookups
