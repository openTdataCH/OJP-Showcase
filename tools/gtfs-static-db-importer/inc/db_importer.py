import os, sys
import math
import yaml
import csv
import sqlite3
import calendar, datetime
from pathlib import Path
import shutil
import sqlite3

from .shared.inc.helpers.db_table_csv_importer import DB_Table_CSV_Importer
from .shared.inc.helpers.db_table_csv_updater import DB_Table_CSV_Updater
from .shared.inc.helpers.gtfs_helpers import convert_datetime_to_day_minutes, massage_datetime_to_hhmm
from .shared.inc.helpers.log_helpers import log_message
from .shared.inc.helpers.db_helpers import truncate_and_load_table_records, table_select_rows, execute_sql_queries, drop_and_recreate_table, fetch_column_names, add_table_indexes, count_rows_table, load_sql_from_file
from .shared.inc.helpers.file_helpers import compute_file_rows_no

class GTFS_DB_Importer:
    def __init__(self, app_config, gtfs_folder_path, db_path: Path):
        self.map_sql_queries = app_config['map_sql_queries']

        self.gtfs_folder_path = gtfs_folder_path
        self.db_path = db_path
        self.db_schema_config = self._load_schema_config()

        self.db_tmp_path = f'{db_path.parent}/{db_path.name}-tmp'
        if not os.path.isdir(self.db_tmp_path):
            os.makedirs(self.db_tmp_path, exist_ok=True)

    def start(self):
        log_message("START GTFS IMPORT")
        log_message(f'DB FILENAME: {self.db_path.name}')

        self._import_csv_tables()
        self._update_calendar()
        self._update_trips()

        log_message(f'Remove temp folder {self.db_tmp_path}')
        shutil.rmtree(self.db_tmp_path)

        log_message("DONE GTFS IMPORT")

    # private
    def _load_schema_config(self):
        script_path = Path(os.path.realpath(__file__))
        db_schema_path = f"{script_path.parent}/config/gtfs_schema.yml"
        db_schema_config = yaml.safe_load(open(db_schema_path, encoding='utf-8'))

        return db_schema_config

    def _import_csv_tables(self):
        table_names = ['agency', 'calendar', 'calendar_dates', 'routes', 'shapes', 'stop_times', 'stops', 'trips']

        print('')
        log_message(f'START BATCH IMPORT')

        for table_name in table_names:
            print('')
            log_message(f'TABLE: {table_name}')
            if not table_name in self.db_schema_config['tables']:
                print(f'ERROR - missing config for table {table_name}')
                sys.exit(1)

            table_config = self.db_schema_config['tables'][table_name]

            db_table_writer = DB_Table_CSV_Importer(self.db_path, table_name, table_config)
            db_table_writer.truncate_table()

            gtfs_file_path = Path(f'{self.gtfs_folder_path}/{table_name}.txt')
            if not os.path.isfile(gtfs_file_path):
                is_skip_ok = False

                if table_name == 'shapes':
                    is_skip_ok = True
                
                if is_skip_ok:
                    continue
                else:
                    print(f'ERROR = required table "{table_name}" not found {gtfs_file_path}')
                    sys.exit()

            db_table_writer.load_csv_file(gtfs_file_path)
            db_table_writer.add_table_indexes()
            db_table_writer.close()
        
        log_message(f'DONE BATCH IMPORT')
        print('')

    def _update_calendar(self):
        log_message('START update calendar')
        
        db_handle = sqlite3.connect(self.db_path)
        db_handle.row_factory = sqlite3.Row

        rows_no = count_rows_table(db_handle, 'calendar')
        log_message(f'... found {rows_no} rows in calendar')

        table_csv_path = Path(f'{self.db_tmp_path}/calendar_update_day_bits.csv')
        table_csv_updater = DB_Table_CSV_Updater(table_csv_path, ['service_id', 'day_bits'])

        sql_path = self.map_sql_queries['select_calendar_dates_group_by']
        sql = load_sql_from_file(sql_path)

        log_message(f"... running calendar SQL")

        calendar_start_date = None
        calendar_end_date = None
        calendar_weeks_no = None
        calendar_days = list(calendar.day_name)

        db_handle.execute("UPDATE calendar SET day_bits = ''")
        db_handle.commit()

        db_cursor = db_handle.cursor()
        row_id = 1
        for db_row in db_cursor.execute(sql):
            if row_id % 10000 == 0:
                log_message(f'... parsed {row_id} rows')

            service_id = db_row['service_id']

            start_date_s = db_row['start_date']
            end_date_s = db_row['end_date']

            start_date = datetime.datetime.strptime(start_date_s, "%Y%m%d")
            end_date = datetime.datetime.strptime(end_date_s, "%Y%m%d")

            if not (calendar_start_date and calendar_end_date):
                log_message(f'... init calendar dates')
                calendar_start_date = start_date
                calendar_end_date = end_date
                calendar_days_no = (end_date - start_date).days
                calendar_weeks_no = math.ceil(calendar_days_no / 7)
                log_message(f'... FROM    : {start_date}')
                log_message(f'... TO      : {end_date}')
                log_message(f'... days_no: {calendar_days_no + 1}')
                log_message(f'... weeks_no: {calendar_weeks_no}')

            day_bits = self._compute_calendar_day_bits(db_row, calendar_days, start_date, end_date, calendar_weeks_no)
            row_dict = {
                'service_id': service_id,
                'day_bits': day_bits,
            }
            table_csv_updater.prepare_row(row_dict)

            row_id += 1
        
        db_cursor.close()
        
        sql_template = 'UPDATE calendar SET day_bits = :day_bits WHERE service_id = :service_id'
        table_csv_updater.update_table(db_handle, sql_template, rows_report_no=10000)

        db_handle.close()

        log_message('DONE update calendar')
        print('')

    def _compute_calendar_day_bits(self, calendar_db_row, calendar_days, start_date, end_date, calendar_weeks_no):
        map_weekdays_pattern = {}
        for calendar_day in calendar_days:
            day_key = calendar_day.lower()
            is_enabled = int(calendar_db_row[day_key]) == 1
            map_weekdays_pattern[calendar_day] = is_enabled

        day_bits_list = self._fill_day_bits_pattern(start_date, end_date, calendar_weeks_no, map_weekdays_pattern)
        self._update_day_bits_from_calendar_dates(day_bits_list, calendar_db_row, start_date)

        day_bits = ''.join(day_bits_list)
        
        return day_bits

    def _fill_day_bits_pattern(self, start_date, end_date, calendar_weeks_no, map_weekdays_pattern):
        day_bits_7d = []
        current_date = start_date
        while current_date <= end_date:
            weekday_s = current_date.strftime("%A")
            day_bit = '1' if map_weekdays_pattern[weekday_s] else '0'
            day_bits_7d.append(day_bit)
            
            current_date = current_date + datetime.timedelta(days=1)

            if len(day_bits_7d) == 7:
                break

        day_bits_s = ''.join(day_bits_7d) * calendar_weeks_no
        days_no = (end_date - start_date).days
        day_bits_end_idx = days_no + 1
        day_bits_s = day_bits_s[0:day_bits_end_idx]

        day_bits = list(day_bits_s)

        return day_bits

    def _update_day_bits_from_calendar_dates(self, day_bits_list, calendar_db_row, start_date):
        calendar_dates_cno = calendar_db_row['calendar_dates_cno']
        if calendar_dates_cno == 0:
            return

        exception_dates = calendar_db_row['exception_dates'].split(',')

        for calendar_dates_s in exception_dates:
            (date_s, exception_type_s) = calendar_dates_s.split('|')
            row_date = datetime.datetime.strptime(date_s, "%Y%m%d")
            exception_type = int(exception_type_s)

            day_bit = None
            if exception_type == 1:
                day_bit = '1'
            if exception_type == 2:
                day_bit = '0'
            if not day_bit:
                print(f'ERROR - cant interpret exception_type {calendar_dates_s}')
                sys.exit()

            day_idx = (row_date-start_date).days
            day_bits_list[day_idx] = day_bit

    def _update_trips(self):
        log_message('START update trips/stop_times')
        
        db_handle = sqlite3.connect(self.db_path)
        db_handle.row_factory = sqlite3.Row

        trips_column_names = fetch_column_names(db_handle, 'trips')
        new_trips_table_csv_file_path = Path(f'{self.db_tmp_path}/new_trips.csv')
        new_trips_table_csv_file = open(new_trips_table_csv_file_path, 'w', encoding='utf-8')
        new_trips_table_csv = csv.DictWriter(new_trips_table_csv_file, trips_column_names)
        new_trips_table_csv.writeheader()

        rows_no = count_rows_table(db_handle, 'trips')
        log_message(f'... found {rows_no} rows')
        
        db_cursor = db_handle.cursor()

        map_stop_times_reset_table = {}
        for time_type in ['arrival_time', 'departure_time']:
            csv_path = Path(f'{self.db_tmp_path}/stop_times_reset_{time_type}.csv')
            column_names = ['table_rowid']
            map_stop_times_reset_table[time_type] = DB_Table_CSV_Updater(csv_path, column_names)

        sql_path = self.map_sql_queries['select_stop_times_group_by']
        sql = load_sql_from_file(sql_path)

        log_message(f"... running select_stop_times_group_by SQL")

        db_cursor = db_handle.cursor()
        row_id = 1
        for db_row in db_cursor.execute(sql):
            if row_id % 200000 == 0:
                log_message(f'... parsed {row_id} rows')

            trip_id = db_row['trip_id']
            stop_times_data = db_row['stop_times_data'].split(',')

            stop_times = []
            for stop_time_data in stop_times_data:
                stop_time_parts = stop_time_data.split('|')

                db_rowid = int(stop_time_parts[0])
                stop_id = stop_time_parts[1]
                arrival_time = stop_time_parts[2]
                departure_time = stop_time_parts[3]

                stop_time_row = {
                    'db_rowid': db_rowid,
                    'stop_id': stop_id,
                    'arrival_time': arrival_time,
                    'departure_time': departure_time,
                }

                stop_times.append(stop_time_row)

            trip_new_row = {
                'trip_id': trip_id,
                'route_id': db_row['route_id'],
                'service_id': db_row['service_id'],
                'trip_headsign': db_row['trip_headsign'],
                'trip_short_name': db_row['trip_short_name'],
                'direction_id': db_row['direction_id'],
                'departure_day_minutes': None,
                'departure_time': None,
                'arrival_day_minutes': None,
                'arrival_time': None,
                'stop_times_s': None,
            }

            for stop_type in ['from', 'to']:
                db_rowid = None
                stop_time = None
                reset_time_field = None
                stop_day_minutes_datetime_field = None
                trip_day_minutes_field = None
                
                if stop_type == 'from':
                    stop_time = stop_times[0]
                    reset_time_field = 'arrival_time'
                    stop_day_minutes_datetime_field = 'departure_time'
                    trip_day_minutes_field = 'departure_day_minutes'
                else:
                    stop_time = stop_times[-1]
                    reset_time_field = 'departure_time'
                    stop_day_minutes_datetime_field = 'arrival_time'
                    trip_day_minutes_field = 'arrival_day_minutes'

                db_rowid = stop_time['db_rowid']

                stop_times_row_dict = {
                    'table_rowid': db_rowid, 
                }
                map_stop_times_reset_table[reset_time_field].prepare_row(stop_times_row_dict)

                stop_time[reset_time_field] = None
                stop_day_minutes_datetime = stop_time[stop_day_minutes_datetime_field]
                stop_day_minutes = convert_datetime_to_day_minutes(stop_day_minutes_datetime)

                trip_new_row[trip_day_minutes_field] = stop_day_minutes
                trip_new_row[stop_day_minutes_datetime_field] = stop_day_minutes_datetime

            trip_stop_times_values = []
            for stop_time in stop_times:
                stop_id = stop_time['stop_id']

                arrival_time = massage_datetime_to_hhmm(stop_time['arrival_time'])
                departure_time = massage_datetime_to_hhmm(stop_time['departure_time'])
                
                stop_time_value = f'{stop_id}|{arrival_time}|{departure_time}'
                trip_stop_times_values.append(stop_time_value)

            trip_new_row['stop_times_s'] = ' -- '.join(trip_stop_times_values)

            new_trips_table_csv.writerow(trip_new_row)

            row_id += 1
        # loop trips SQL
        db_cursor.close()

        new_trips_table_csv_file.close()

        print('')
        log_message(f"... INSERT new trips ...")
        
        trips_table_config = self.db_schema_config['tables']['trips']
        new_trips_table_writer = DB_Table_CSV_Importer(self.db_path, 'trips', trips_table_config)
        new_trips_table_writer.truncate_table()
        new_trips_table_writer.load_csv_file(new_trips_table_csv_file_path)
        new_trips_table_writer.add_table_indexes()
        new_trips_table_writer.close()

        log_message(f"... DONE INSERT new trips ...")
        print('')

        for time_type in map_stop_times_reset_table:
            stop_times_updater = map_stop_times_reset_table[time_type]
            template_sql_path = self.map_sql_queries['update_stop_times_reset']
            template_sql = load_sql_from_file(template_sql_path)
            template_sql = template_sql.replace('[COLUMN_TO_RESET]', time_type)
            stop_times_updater.update_table(db_handle, template_sql, rows_report_no=200000)

            log_message(f'DONE update stop_times RESET for {time_type}')

        db_handle.close()
