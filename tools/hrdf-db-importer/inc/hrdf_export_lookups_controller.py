import os, sys
import sqlite3
from datetime import datetime

from pathlib import Path

from .shared.inc.helpers.db_helpers import table_select_rows
from .shared.inc.helpers.log_helpers import log_message
from .shared.inc.helpers.json_helpers import export_json_to_file
from .shared.inc.helpers.hrdf_helpers import compute_formatted_date_from_hrdf_db_path
from .shared.inc.models.gtfs_static.calendar import Calendar as GTFS_Calendar

class HRDF_Export_Lookups_Controller:
    def __init__(self, app_config, hrdf_db_path: Path):
        self.hrdf_db_path = hrdf_db_path
        self.hrdf_db = sqlite3.connect(str(hrdf_db_path))
        self.hrdf_db.row_factory = sqlite3.Row

        hrdf_db_filename = hrdf_db_path.name
        hrdf_day = compute_formatted_date_from_hrdf_db_path(hrdf_db_filename)
        if hrdf_day is None:
            print(f'ERROR - cant read HRDF day from {hrdf_db_path}')
            sys.exit(1)

        hrdf_db_lookups_json_path = app_config['hrdf_db_lookups']['base_path'] + '/' + app_config['hrdf_db_lookups']['db_lookups_filename']
        self.hrdf_db_lookups_json_path = hrdf_db_lookups_json_path.replace('[HRDF_DAY]', hrdf_day)

        self.map_table_keys = app_config['hrdf_db_lookups']['map_table_pks']

    def export(self):
        print(f'=================================')
        print(f'HRDF export lookups')
        print(f'=================================')
        print(f'HRDF DB PATH: {self.hrdf_db_path}')
        print(f'EXPORT JSON PATH: {self.hrdf_db_lookups_json_path}')
        print(f'=================================')
        print('')

        log_message('START')

        calendar_start_date, calendar_days_no = self._compute_calendar_info()

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
    
    def _compute_calendar_info(self):
        sql = 'SELECT service_id, start_date, end_date, day_bits FROM calendar LIMIT 1'
        
        db_row = self.hrdf_db.execute(sql).fetchone()
        start_date = datetime.strptime(db_row['start_date'], "%Y%m%d").date()
        end_date = datetime.strptime(db_row['end_date'], "%Y%m%d").date()
        days_no = (end_date - start_date).days + 1 # adds 1 to include also the last day of the interval

        day_bits = db_row['day_bits'][0:days_no]
        is_all_days = day_bits == len(day_bits) * '1'
        if not is_all_days:
            print('ERROR - calendar row is not representative')
            service_id = db_row['service_id']
            print(f'{service_id} => {day_bits}')
            sys.exit(1)

        return start_date, days_no
