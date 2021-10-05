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
from .shared.inc.helpers.gtfs_helpers import convert_datetime_to_day_minutes, massage_datetime_to_hhmm
from .shared.inc.helpers.log_helpers import log_message
from .shared.inc.helpers.db_helpers import truncate_and_load_table_records, table_select_rows, execute_sql_queries, drop_and_recreate_table, fetch_column_names, add_table_indexes, count_rows_table
from .shared.inc.helpers.file_helpers import compute_file_rows_no

class GTFS_DB_Importer:
    def __init__(self, gtfs_folder_path, db_path: Path):
        self.gtfs_folder_path = gtfs_folder_path
        self.db_path = str(db_path)
        self.db_schema_config = self._load_schema_config()

        self.db_tmp_path = f'{db_path.parent}/{db_path.name}-tmp'
        if not os.path.isdir(self.db_tmp_path):
            os.makedirs(self.db_tmp_path, exist_ok=True)

    def start(self):
        log_message("START GTFS IMPORT")

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
        db_schema_config = yaml.safe_load(open(db_schema_path))

        return db_schema_config

    def _import_csv_tables(self):
        table_names = ['agency', 'calendar', 'calendar_dates', 'routes', 'stop_times', 'stops', 'trips']

        log_message(f'START BATCH IMPORT')

        for table_name in table_names:
            log_message(f'TABLE: {table_name}')
            if not table_name in self.db_schema_config['tables']:
                print(f'ERROR - missing config for table {table_name}')
                sys.exit(1)

            table_config = self.db_schema_config['tables'][table_name]

            db_table_writer = DB_Table_CSV_Importer(self.db_path, self.db_tmp_path, table_name, table_config)
            db_table_writer.truncate_table()

            gtfs_file_path = Path(f'{self.gtfs_folder_path}/{table_name}.txt')
            db_table_writer.load_csv_file(gtfs_file_path)
        
        log_message(f'... DONE BATCH IMPORT')

    def _update_calendar(self):
        log_message('START update calendar')
        
        db_handle = sqlite3.connect(self.db_path)
        db_handle.row_factory = sqlite3.Row

        rows_no = count_rows_table(db_handle, 'calendar')
        log_message(f'... found {rows_no} rows')
        
        db_cursor = db_handle.cursor()

        calendar_start_date = None
        calendar_end_date = None
        calendar_weeks_no = None
        calendar_days = list(calendar.day_name)

        table_csv_update_path = f'{self.db_tmp_path}/calendar_update_day_bits.csv'
        table_csv_update_file = open(table_csv_update_path, 'w')
        table_csv_update_file.write("service_id,day_bits\n")

        sql = 'SELECT service_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday, start_date, end_date FROM calendar'
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
                calendar_weeks_no = math.ceil((end_date - start_date).days / 7)
                log_message(f'... FROM    : {start_date}')
                log_message(f'... TO      : {end_date}')
                log_message(f'... weeks_no: {calendar_weeks_no}')

            day_bits = self._compute_calendar_day_bits(service_id, db_handle, db_row, calendar_days, start_date, end_date, calendar_weeks_no)
            table_csv_update_file.write(f"{service_id},{day_bits}\n")

            row_id += 1
        
        db_cursor.close()
        table_csv_update_file.close()

        log_message(f'... reading {table_csv_update_path} ...')
        table_csv_update_file = open(table_csv_update_path)
        
        csv_reader = csv.DictReader(table_csv_update_file)
        csv_row_id = 1

        db_update_cursor = db_handle.cursor()

        for row in csv_reader:
            service_id = row['service_id']
            day_bits = row['day_bits']
            sql = f"UPDATE calendar SET day_bits = '{day_bits}' WHERE service_id = '{service_id}'"
            db_update_cursor.execute(sql)

            csv_row_id += 1
        
        table_csv_update_file.close()

        db_handle.commit()
        db_update_cursor.close()
        
        db_handle.close()

        log_message('DONE update calendar')

    def _compute_calendar_day_bits(self, service_id: str, db_handle, calendar_db_row, calendar_days, start_date, end_date, calendar_weeks_no):
        map_weekdays_pattern = {}
        for calendar_day in calendar_days:
            day_key = calendar_day.lower()
            is_enabled = int(calendar_db_row[day_key]) == 1
            map_weekdays_pattern[calendar_day] = is_enabled

        day_bits_list = self._fill_day_bits_pattern(start_date, end_date, calendar_weeks_no, map_weekdays_pattern)
        day_bits_list = self._update_day_bits_from_calendar_dates(service_id, db_handle, day_bits_list, start_date)

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
        day_bits_s = day_bits_s[0:(days_no + 1)]

        day_bits = list(day_bits_s)

        return day_bits

    def _update_day_bits_from_calendar_dates(self, service_id, db_handle, day_bits_list, start_date):
        calendar_dates_sql = f"SELECT date, exception_type FROM calendar_dates WHERE service_id = '{service_id}'"
        calendar_date_cursor = db_handle.cursor()
        calendar_date_cursor.execute(calendar_dates_sql)
        calendar_dates_rows = calendar_date_cursor.fetchall()
        calendar_date_cursor.close()

        for calendar_dates_row in calendar_dates_rows:
            date_s = calendar_dates_row['date']
            row_date = datetime.datetime.strptime(date_s, "%Y%m%d")
            exception_type = int(calendar_dates_row['exception_type'])

            day_bit = None
            if exception_type == 1:
                day_bit = '1'
            if exception_type == 2:
                day_bit = '0'
            if not day_bit:
                print(f'ERROR - cant interpret exception_type {calendar_dates_row}')
                sys.exit()

            day_idx = (row_date-start_date).days
            day_bits_list[day_idx] = day_bit

        return day_bits_list

    def _update_trips(self):
        log_message('START update trips/stop_times')
        
        db_handle = sqlite3.connect(self.db_path)
        db_handle.row_factory = sqlite3.Row

        rows_no = count_rows_table(db_handle, 'trips')
        log_message(f'... found {rows_no} rows')
        
        db_cursor = db_handle.cursor()

        table_csv_update_path = f'{self.db_tmp_path}/trips_update_times.csv'
        table_csv_update_file = open(table_csv_update_path, 'w')
        table_csv_columns = ['trip_id', 'departure_day_minutes', 'arrival_day_minutes', 'departure_time', 'arrival_time', 'stop_times_s']
        table_csv_update_file.write(','.join(table_csv_columns) + "\n")

        stop_times_update_file_path = f'{self.db_tmp_path}/stop_times_update_times.csv'
        stop_times_update_file = open(stop_times_update_file_path, 'w')
        stop_times_update_columns = ['db_rowid', 'column_to_reset']
        stop_times_update_file.write(','.join(stop_times_update_columns) + "\n")

        sql = 'SELECT trip_id FROM trips'
        row_id = 1
        for db_row in db_cursor.execute(sql):
            if row_id % 200000 == 0:
                log_message(f'... parsed {row_id} rows')

            trip_id = db_row['trip_id']
            table_stop_times_sql = f"SELECT rowid, stop_id, arrival_time, departure_time FROM stop_times WHERE trip_id = '{trip_id}' ORDER BY stop_sequence"
            
            stop_times_cursor = db_handle.cursor()
            stop_times_cursor.execute(table_stop_times_sql)
            stop_times_rows = stop_times_cursor.fetchall()
            stop_times_cursor.close()

            stop_times = []

            for stop_times_row in stop_times_rows:
                db_rowid = stop_times_row['rowid']
                stop_id = stop_times_row['stop_id']
                arrival_time = stop_times_row['arrival_time']
                departure_time = stop_times_row['departure_time']

                stop_time_row = {
                    'db_rowid': db_rowid,
                    'stop_id': stop_id,
                    'arrival_time': arrival_time,
                    'departure_time': departure_time,
                }

                stop_times.append(stop_time_row)

            trip_data = {
                'trip_id': trip_id,
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
                stop_times_update_file.write(f"{db_rowid},{reset_time_field}\n")

                stop_time[reset_time_field] = None
                stop_day_minutes_datetime = stop_time[stop_day_minutes_datetime_field]
                if stop_day_minutes_datetime == None:
                    print(trip_id)
                    print(table_stop_times_sql)
                    sys.exit()
                stop_day_minutes = convert_datetime_to_day_minutes(stop_day_minutes_datetime)

                trip_data[trip_day_minutes_field] = stop_day_minutes
                trip_data[stop_day_minutes_datetime_field] = stop_day_minutes_datetime

            trip_stop_times_values = []
            for stop_time in stop_times:
                stop_id = stop_time['stop_id']

                arrival_time = massage_datetime_to_hhmm(stop_time['arrival_time'])
                departure_time = massage_datetime_to_hhmm(stop_time['departure_time'])
                
                stop_time_value = f'{stop_id}|{arrival_time}|{departure_time}'
                trip_stop_times_values.append(stop_time_value)

            trip_data['stop_times_s'] = ' -- '.join(trip_stop_times_values)

            csv_row_values = []
            for column_name in table_csv_columns:
                csv_row_value = f'{trip_data[column_name]}'
                csv_row_values.append(csv_row_value)
            csv_row_s = ','.join(csv_row_values)

            table_csv_update_file.write(f"{csv_row_s}\n")

            row_id += 1

        db_cursor.close()
        table_csv_update_file.close()
        stop_times_update_file.close()

        log_message(f'... UPDATE trips with times info ...')
        self._update_trips_times(db_handle, table_csv_update_path)

        log_message(f'... RESET dep/arr times in stop_times ...')
        self._update_stop_times(db_handle, stop_times_update_file_path)
        
        db_handle.close()

        log_message('DONE update trips/stop_times')

    def _update_trips_times(self, db_handle: any, csv_path: str):
        table_csv_update_file = open(csv_path)
        
        csv_reader = csv.DictReader(table_csv_update_file)
        csv_row_id = 1

        db_update_cursor = db_handle.cursor()

        for row in csv_reader:
            if csv_row_id % 100000 == 0:
                db_handle.commit()
                log_message(f'... updated {csv_row_id} rows')

            trip_id = row['trip_id']
            departure_day_minutes = row['departure_day_minutes']
            arrival_day_minutes = row['arrival_day_minutes']
            departure_time = row['departure_time']
            arrival_time = row['arrival_time']
            stop_times_s = row['stop_times_s']
            
            sql = f"UPDATE trips SET departure_day_minutes = {departure_day_minutes}, arrival_day_minutes = {arrival_day_minutes}, departure_time = '{departure_time}', arrival_time = '{arrival_time}', stop_times_s = '{stop_times_s}' WHERE trip_id = '{trip_id}'"
            db_update_cursor.execute(sql)

            csv_row_id += 1
        
        table_csv_update_file.close()

        db_handle.commit()
        db_update_cursor.close()

    def _update_stop_times(self, db_handle: any, csv_path: str):
        table_csv_update_file = open(csv_path)
        
        csv_reader = csv.DictReader(table_csv_update_file)
        csv_row_id = 1

        db_update_cursor = db_handle.cursor()

        for row in csv_reader:
            if csv_row_id % 100000 == 0:
                db_handle.commit()
                log_message(f'... updated {csv_row_id} rows')

            db_rowid = row['db_rowid']
            column_to_reset = row['column_to_reset']
            
            sql = f"UPDATE stop_times SET {column_to_reset} = NULL WHERE ROWID = '{db_rowid}'"
            db_update_cursor.execute(sql)

            csv_row_id += 1
        
        table_csv_update_file.close()

        db_handle.commit()
        db_update_cursor.close()
