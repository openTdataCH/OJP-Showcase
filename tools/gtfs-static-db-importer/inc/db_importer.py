import os, sys

from pathlib import Path

import shutil
import math
import yaml
import csv

import calendar, datetime

from inc.shared.inc.helpers.csv_updater import CSV_Updater

from .shared.inc.helpers.db_table_csv_importer import DB_Table_CSV_Importer
from .shared.inc.helpers.db_table_csv_updater import DB_Table_CSV_Updater
from .shared.inc.helpers.gtfs_helpers import convert_datetime_to_day_minutes, extract_stop_times_data_from_s, massage_datetime_to_hhmm, seconds_to_hhmmss
from .shared.inc.helpers.log_helpers import log_message
from .shared.inc.helpers.db_helpers import fetch_column_names, count_rows_table, load_sql_from_file, connect_db, table_select_rows

class GTFS_DB_Importer:
    def __init__(self, app_config, gtfs_folder_path, db_path: Path):
        self.map_sql_queries = app_config['map_sql_queries']

        self.gtfs_folder_path = gtfs_folder_path
        self.db_path = db_path
        self.db_lock_path = Path(f'{self.db_path}.lock')
        self.db_handle = connect_db(db_path, is_read_only=False)
        self.db_schema_config = self._load_schema_config()

        self.db_tmp_path = f'{db_path.parent}/{db_path.name}-tmp'
        if not os.path.isdir(self.db_tmp_path):
            os.makedirs(self.db_tmp_path, exist_ok=True)

    def start(self):
        log_message("START GTFS IMPORT")
        log_message(f'DB PATH: {self.db_path}')
        
        if os.path.isfile(self.db_lock_path):
            print('ERROR: lock path present, ABORT')
            print(f'ls -al {self.db_lock_path.parent}')
            sys.exit(1)
        
        self._write_lock_file()

        self._import_csv_tables()
        self._update_calendar()
        self._update_trips()
        self._update_frequencies()
        self._update_routes()
        self._update_routes_representative_trip()
        self._create_fts_routes()
        
        self._cleanup()

        self.db_handle.close()
        
        self._remove_lock_file()

        log_message("DONE GTFS IMPORT")

    # private
    def _load_schema_config(self):
        script_path = Path(os.path.realpath(__file__))
        db_schema_path = f"{script_path.parent}/config/gtfs_schema.yml"
        db_schema_config = yaml.safe_load(open(db_schema_path, encoding='utf-8'))

        return db_schema_config
    
    def _write_lock_file(self):
        now_f = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        lock_file_text = f'START: {now_f}'
        lock_file = open(self.db_lock_path, 'w', encoding='utf-8')
        lock_file.write(lock_file_text)
        lock_file.close()
        
    def _remove_lock_file(self):
        os.remove(self.db_lock_path)

    
    def _import_csv_tables(self):
        '''
        Batch TRUNCATE / INSERT csv rows from GTFS in db.
        '''
        table_names = ['agency', 'calendar', 'calendar_dates', 'feed_info', 'frequencies', 'routes', 'shapes', 'stop_times', 'stops', 'transfers', 'trips']

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

                if table_name == 'calendar':
                    calendar_dates_path = f'{self.gtfs_folder_path}/calendar_dates.txt'
                    if os.path.isfile(calendar_dates_path):
                        log_message('... no calendar found, using calendar_dates instead')
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
        '''
        - if calendar.txt is missing
            INSERT into calendar.txt DISTINCT rows from calendar_dates
        - UPDATE calendar SET day_bits, start_date, end_date
        '''
        log_message('START update calendar')
        
        rows_no = count_rows_table(self.db_handle, 'calendar')
        log_message(f'... found {rows_no} rows in calendar')

        if rows_no == 0:
            self._fill_calendar_from_calendar_dates()

        table_csv_path = Path(f'{self.db_tmp_path}/calendar_update_day_bits.csv')
        table_csv_updater = DB_Table_CSV_Updater(table_csv_path, ['service_id', 'day_bits', 'start_date', 'end_date'])

        sql = 'SELECT MIN(start_date) AS min_date FROM calendar'
        min_date_s = self.db_handle.cursor().execute(sql).fetchone()[0]
        sql = 'SELECT MAX(end_date) AS min_date FROM calendar'
        max_date_s = self.db_handle.cursor().execute(sql).fetchone()[0]
        calendar_start_date = datetime.datetime.strptime(min_date_s, "%Y%m%d")
        calendar_end_date = datetime.datetime.strptime(max_date_s, "%Y%m%d")

        print('')
        log_message('CALENDAR DATES:')

        MAX_DAYS_NO = 366

        today_date = datetime.datetime.combine(datetime.datetime.today(), datetime.datetime.min.time())

        today_start_date_diff = (today_date - calendar_start_date).days
        if today_start_date_diff > MAX_DAYS_NO:
            log_message(f'   ... too far back START - {calendar_start_date} - {today_start_date_diff} days to today')
            calendar_start_date = today_date - datetime.timedelta(days=MAX_DAYS_NO)
            log_message(f'   ... set to - {calendar_start_date}')

        today_end_date_diff = (calendar_end_date - today_date).days
        if today_end_date_diff > MAX_DAYS_NO:
            log_message(f'   ... too far away END - {calendar_end_date} - {today_end_date_diff} days from today')
            calendar_end_date = today_date + datetime.timedelta(days=MAX_DAYS_NO)
            log_message(f'   ... set to - {calendar_end_date}')

        calendar_days_no = (calendar_end_date - calendar_start_date).days
        calendar_weeks_no = math.ceil(calendar_days_no / 7)
        
        log_message(f'   START      : {calendar_start_date}')
        log_message(f'   END        : {calendar_end_date}')
        log_message(f'   DAYS NO    : {calendar_days_no + 1}')
        log_message(f'   WEEKS NO   : {calendar_weeks_no}')
        print('')

        log_message(f"... running calendar SQL")

        self.db_handle.execute("UPDATE calendar SET day_bits = ''")
        self.db_handle.commit()

        sql_path = self.map_sql_queries['select_calendar_dates_group_by']
        sql = load_sql_from_file(sql_path)

        calendar_days = list(calendar.day_name)

        db_cursor = self.db_handle.cursor()
        row_id = 1
        for db_row in db_cursor.execute(sql):
            if row_id % 10000 == 0:
                log_message(f'... parsed {row_id} rows')

            service_id = db_row['service_id']
            day_bits = self._compute_calendar_day_bits(db_row, calendar_days, calendar_start_date, calendar_end_date)

            row_dict = {
                'service_id': service_id,
                'day_bits': day_bits,
                'start_date': calendar_start_date.strftime("%Y%m%d"),
                'end_date': calendar_end_date.strftime("%Y%m%d"),
            }
            table_csv_updater.prepare_row(row_dict)

            row_id += 1
        
        db_cursor.close()
        
        sql_template = 'UPDATE calendar SET day_bits = :day_bits, start_date = :start_date, end_date = :end_date  WHERE service_id = :service_id'
        table_csv_updater.update_table(self.db_handle, sql_template, rows_report_no=10000)

        log_message('DONE update calendar')
        print('')

    def _compute_calendar_day_bits(self, calendar_db_row, calendar_days, calendar_start_date, calendar_end_date):
        start_date_s = calendar_db_row['start_date']
        end_date_s = calendar_db_row['end_date']

        start_date = datetime.datetime.strptime(start_date_s, "%Y%m%d")
        if start_date < calendar_start_date:
            start_date = calendar_start_date

        end_date = datetime.datetime.strptime(end_date_s, "%Y%m%d")
        if end_date > calendar_end_date:
            end_date = calendar_end_date

        days_no = (end_date - start_date).days
        weeks_no = math.ceil(days_no / 7)

        map_weekdays_pattern = {}
        for calendar_day in calendar_days:
            day_key = calendar_day.lower()
            is_enabled = int(calendar_db_row[day_key]) == 1
            map_weekdays_pattern[calendar_day] = is_enabled

        day_bits_list = self._fill_day_bits_pattern(start_date, end_date, weeks_no, map_weekdays_pattern)
        self._update_day_bits_from_calendar_dates(day_bits_list, calendar_db_row, start_date)

        day_bits = ''.join(day_bits_list)

        days_no_before = (start_date - calendar_start_date).days
        days_no_after = (calendar_end_date - end_date).days

        day_bits = '0' * days_no_before + day_bits + '0' * days_no_after

        return day_bits

    def _fill_day_bits_pattern(self, start_date, end_date, weeks_no, map_weekdays_pattern):
        day_bits_7d = []
        current_date = start_date
        while current_date <= end_date:
            weekday_s = current_date.strftime("%A")
            day_bit = '1' if map_weekdays_pattern[weekday_s] else '0'
            day_bits_7d.append(day_bit)
            
            current_date = current_date + datetime.timedelta(days=1)

            if len(day_bits_7d) == 7:
                break

        day_bits_s = ''.join(day_bits_7d) * weeks_no
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
            if day_idx < len(day_bits_list):
                # this case happens when we have to cap the calendar to +1year
                day_bits_list[day_idx] = day_bit

    def _update_trips(self):
        '''
        - DROP trips
        - batch INSERT trips with new columns (departure_ / arrival_ , stop_times_s)
        '''
        log_message('START update trips/stop_times')
        
        trips_column_names = fetch_column_names(self.db_handle, 'trips')
        new_trips_table_csv_file_path = Path(f'{self.db_tmp_path}/new_trips.csv')
        new_trips_table_csv_updater = CSV_Updater(new_trips_table_csv_file_path, trips_column_names)

        rows_no = count_rows_table(self.db_handle, 'trips')
        log_message(f'... found {rows_no} rows')
        
        db_cursor = self.db_handle.cursor()

        map_stop_times_reset_table = {}
        for time_type in ['arrival_time', 'departure_time']:
            csv_path = Path(f'{self.db_tmp_path}/stop_times_reset_{time_type}.csv')
            column_names = ['table_rowid']
            map_stop_times_reset_table[time_type] = DB_Table_CSV_Updater(csv_path, column_names)

        sql_path = self.map_sql_queries['select_stop_times_group_by']
        sql = load_sql_from_file(sql_path)

        log_message(f"... running select_stop_times_group_by SQL")

        db_cursor = self.db_handle.cursor()
        row_id = 1
        for db_row in db_cursor.execute(sql):
            if row_id % 200_000 == 0:
                log_message(f'... parsed {row_id} rows')

            stop_times_s = db_row['stop_times_data']
            stop_times = extract_stop_times_data_from_s(stop_times_s)
                
            trip_new_row = {}
            for column_name in trips_column_names:
                trip_new_row[column_name] = db_row[column_name]
            
            # reset time fields
            trip_new_row['departure_day_minutes'] = None
            trip_new_row['departure_time'] = None
            trip_new_row['arrival_day_minutes'] = None
            trip_new_row['arrival_time'] = None
            trip_new_row['stop_times_s'] = None
            trip_new_row['stop_times_count'] = None

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

                db_rowid = stop_time['sql_row_id']

                stop_times_row_dict = {
                    'table_rowid': db_rowid, 
                }
                map_stop_times_reset_table[reset_time_field].prepare_row(stop_times_row_dict)

                stop_time[reset_time_field] = None
                stop_day_minutes_datetime = stop_time[stop_day_minutes_datetime_field]
                if stop_day_minutes_datetime is None:
                    continue

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
            trip_new_row['stop_times_count'] = len(stop_times)

            new_trips_table_csv_updater.prepare_row(trip_new_row)

            row_id += 1
        # loop trips SQL
        db_cursor.close()

        new_trips_table_csv_updater.close()

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

        for time_type, stop_times_updater in map_stop_times_reset_table.items():
            template_sql_path = self.map_sql_queries['update_stop_times_reset']
            template_sql = load_sql_from_file(template_sql_path)
            template_sql = template_sql.replace('[COLUMN_TO_RESET]', time_type)
            stop_times_updater.update_table(self.db_handle, template_sql, rows_report_no=200_000)

            log_message(f'DONE update stop_times RESET for {time_type}')
            print('')
    # _update_trips
    
    def _update_routes(self):
        '''
        - DROP routes
        - batch INSERT routes with new columns (day_bits)
        '''
        log_message('START update routes')
        
        sql_path = self.map_sql_queries['select_route_trips_calendar_day_bits']
        sql = load_sql_from_file(sql_path)
        
        log_message(f"... running select_route_trips_calendar_day_bits SQL")
        
        map_db_routes = table_select_rows(self.db_handle, 'routes', '', 'route_id')

        db_cursor = self.db_handle.cursor()
        row_id = 1
        for db_row in db_cursor.execute(sql):
            if row_id % 1000 == 0:
                log_message(f'... parsed {row_id} rows')
                
            trips_day_bits_s: str = db_row['trips_day_bits']
            trips_day_bits = trips_day_bits_s.split(',')
            
            route_day_bits = ['0'] * len(trips_day_bits[0])
            for trip_day_bits in trips_day_bits:
                for idx, day_bit in enumerate(trip_day_bits):
                    if day_bit == '1':
                        route_day_bits[idx] = '1'
                        
            route_day_bits_s = ''.join(route_day_bits)
            
            route_id = db_row['route_id']
            map_db_routes[route_id]['day_bits'] = route_day_bits_s
        # loop SQL
        
        routes_column_names = fetch_column_names(self.db_handle, 'routes')
        new_routes_table_csv_file_path = Path(f'{self.db_tmp_path}/new_routes.csv')
        new_routes_table_csv_updater = CSV_Updater(new_routes_table_csv_file_path, routes_column_names)
        
        for route_id, db_route in map_db_routes.items():
            new_routes_table_csv_updater.prepare_row(db_route)
        
        new_routes_table_csv_updater.close()
        
        print('')
        log_message(f"... INSERT new routes ...")
        
        routes_table_config = self.db_schema_config['tables']['routes']
        new_routes_table_writer = DB_Table_CSV_Importer(self.db_path, 'routes', routes_table_config)
        new_routes_table_writer.truncate_table()
        new_routes_table_writer.load_csv_file(new_routes_table_csv_file_path)
        new_routes_table_writer.add_table_indexes()
        new_routes_table_writer.close()

        log_message(f"... DONE INSERT new routes ...")
        print('')
        
    def _update_routes_representative_trip(self):
        '''
        - UPDATE routes SET representative_trip_id
        '''
        log_message(f"START UPDATE routes-trip (representative)")
        
        db_cursor = self.db_handle.cursor()
        
        sql_path = self.map_sql_queries['update_routes_representative_trip']
        sql = load_sql_from_file(sql_path)
        db_cursor.executescript(sql)
        
        log_message(f"... DONE UPDATE routes-trip (representative)")
        print('')
        
    def _create_fts_routes(self):
        '''
        - CREATE fts_routes from SQL
        '''
        log_message(f"START CREATE FTS routes ...")
        
        db_cursor = self.db_handle.cursor()
        
        sql_path = self.map_sql_queries['create_fts_routes']
        sql = load_sql_from_file(sql_path)
        db_cursor.executescript(sql)
        
        log_message(f"... DONE FTS routes ...")
        print('')

    def _fill_calendar_from_calendar_dates(self):
        '''
        INSERT into calendar.txt DISTINCT rows from calendar_dates
        '''
        log_message(f'START filling calendar from calendar_dates')

        calendar_dates_rows_no = count_rows_table(self.db_handle, 'calendar_dates')
        if calendar_dates_rows_no == 0:
            print('ERROR - empty calendar, calendar_dates ?')
            sys.exit()
        log_message(f'... found {calendar_dates_rows_no} rows')

        sql = 'SELECT MIN(date) AS min_date FROM calendar_dates'
        min_date_s = self.db_handle.cursor().execute(sql).fetchone()[0]

        sql = 'SELECT MAX(date) AS min_date FROM calendar_dates'
        max_date_s = self.db_handle.cursor().execute(sql).fetchone()[0]

        sql = 'SELECT DISTINCT(service_id) AS service_id FROM calendar_dates'
        db_cursor = self.db_handle.cursor()

        calendar_column_names = fetch_column_names(self.db_handle, 'calendar')
        calendar_table_csv_file_path = Path(f'{self.db_tmp_path}/calendar_update_from_calendar_dates.csv')
        calendar_table_csv_updater = CSV_Updater(calendar_table_csv_file_path, calendar_column_names)

        row_idx = 0
        for db_row in db_cursor.execute(sql):
            trip_new_row = {
                'service_id': db_row['service_id'],
                'monday': 0, 
                'tuesday': 0, 
                'wednesday': 0, 
                'thursday': 0, 
                'friday': 0, 
                'saturday': 0, 
                'sunday': 0, 
                'start_date': min_date_s, 
                'end_date': max_date_s, 
                'day_bits': '',
            }
            calendar_table_csv.writerow(trip_new_row)

            row_idx += 1
        #end loop SQL
        db_cursor.close()

        calendar_table_csv_updater.close()

        log_message(f'... found {row_idx} calendar entries')

        table_config = self.db_schema_config['tables']['calendar']

        log_message(f'START populate table calendar')
        
        db_table_writer = DB_Table_CSV_Importer(self.db_path, 'calendar', table_config)
        db_table_writer.truncate_table()

        db_table_writer.load_csv_file(calendar_table_csv_file_path)
        db_table_writer.add_table_indexes()
        db_table_writer.close()

        log_message(f'DONE _fill_calendar_from_calendar_dates')
        print()

    def _cleanup(self):
        log_message(f'Remove temp folder {self.db_tmp_path}')
        shutil.rmtree(self.db_tmp_path)

    def _update_frequencies(self):
        '''
        INSERT into trips, stop_times from frequencies.txt
        '''
        log_message(f'START parsing frequencies...')

        trips_column_names = fetch_column_names(self.db_handle, 'trips')
        trips_frequencies_table_csv_file_path = Path(f'{self.db_tmp_path}/trips_frequencies.csv')
        trips_frequencies_csv_updater = CSV_Updater(trips_frequencies_table_csv_file_path, trips_column_names)

        stop_times_column_names = fetch_column_names(self.db_handle, 'stop_times')
        stop_times_frequencies_table_csv_file_path = Path(f'{self.db_tmp_path}/stop_times_frequencies.csv')
        stop_times_frequencies_table_csv_updater = CSV_Updater(stop_times_frequencies_table_csv_file_path, stop_times_column_names)

        sql_path = self.map_sql_queries['select_trips_group_by_stop_times_frequencies']
        sql = load_sql_from_file(sql_path)

        log_message(f"... running select_stop_times_group_by + frequencies SQL")

        db_cursor = self.db_handle.cursor()
        row_id = 1
        for db_row in db_cursor.execute(sql):
            if row_id % 1_000 == 0:
                log_message(f'... parsed {row_id} rows')

            start_seconds = convert_datetime_to_day_minutes(db_row['start_time']) * 60
            headway_seconds = db_row['headway_secs']
            
            current_seconds = start_seconds + headway_seconds
            end_seconds = convert_datetime_to_day_minutes(db_row['end_time']) * 60

            stop_times_data_s = db_row['stop_times_data']
            stop_times_data = extract_stop_times_data_from_s(stop_times_data_s)

            original_trip_id = db_row['trip_id']
            
            freq_idx = 1
            while current_seconds <= end_seconds:
                delta_seconds = current_seconds - start_seconds

                trip_id = f'{original_trip_id}.freq.{freq_idx}'
                stop_times_s_parts = []

                for stop_idx, stop_time_data in enumerate(stop_times_data):
                    stop_id = stop_time_data['stop_id']

                    new_stop_time = {
                        'trip_id': trip_id,
                        'arrival_time': None,
                        'departure_time': None,
                        'stop_id': stop_id,
                        'stop_sequence': stop_idx + 1,
                    }

                    stop_times_s_part = [
                        stop_id,
                    ]

                    arrival_seconds = stop_time_data['arrival_seconds']
                    if arrival_seconds is None:
                        stop_times_s_part.append('')
                    else:
                        new_stop_time['arrival_time'] = seconds_to_hhmmss(arrival_seconds + delta_seconds)
                        arrival_time_m = new_stop_time['arrival_time'][0:5]
                        stop_times_s_part.append(arrival_time_m)
                    
                    departure_seconds = stop_time_data['departure_seconds']
                    if departure_seconds is None:
                        stop_times_s_part.append('')
                    else:
                        new_stop_time['departure_time'] = seconds_to_hhmmss(departure_seconds + delta_seconds)
                        departure_time_m = new_stop_time['departure_time'][0:5]
                        stop_times_s_part.append(departure_time_m)

                    stop_times_s_parts.append('|'.join(stop_times_s_part))

                    stop_times_frequencies_table_csv_updater.prepare_row(new_stop_time)
                # loop stop_times

                departure_day_seconds = db_row['departure_day_minutes'] * 60 + delta_seconds
                departure_day_minutes = int(departure_day_seconds / 60)
                departure_time = seconds_to_hhmmss(departure_day_seconds)

                arrival_day_seconds = db_row['arrival_day_minutes'] * 60 + delta_seconds
                arrival_day_minutes = int(arrival_day_seconds / 60)
                arrival_time = seconds_to_hhmmss(arrival_day_seconds)

                stop_times_s = ' -- '.join(stop_times_s_parts)
                
                new_trip = {
                    'trip_id': trip_id,
                    'route_id': db_row['route_id'],
                    'service_id': db_row['service_id'],
                    'trip_headsign': db_row['trip_headsign'],
                    'trip_short_name': db_row['trip_short_name'],
                    'direction_id': db_row['direction_id'],
                    'block_id': db_row['block_id'],
                    'departure_day_minutes': departure_day_minutes,
                    'arrival_day_minutes': arrival_day_minutes,
                    'departure_time': departure_time,
                    'arrival_time': arrival_time,
                    'stop_times_s': stop_times_s,
                    'stop_times_count': db_row['stop_times_count'],
                    'shape_id': db_row['shape_id'],
                    'original_trip_id': db_row['original_trip_id'],
                    'hints': db_row['hints'],
                }

                trips_frequencies_csv_updater.prepare_row(new_trip)

                current_seconds += headway_seconds
                freq_idx += 1
            # loop frequencies
        # loop DB trips-with-frequencies

        log_message(f'... saving CSV files')

        trips_frequencies_csv_updater.close()
        stop_times_frequencies_table_csv_updater.close()

        log_message(f'... load into DB')

        trips_table_config = self.db_schema_config['tables']['trips']
        trips_table_writer = DB_Table_CSV_Importer(self.db_path, 'trips', trips_table_config)
        trips_table_writer.load_csv_file(trips_frequencies_table_csv_file_path)

        stop_times_table_config = self.db_schema_config['tables']['stop_times']
        stop_times_table_writer = DB_Table_CSV_Importer(self.db_path, 'stop_times', stop_times_table_config)
        stop_times_table_writer.load_csv_file(stop_times_frequencies_table_csv_file_path)

        log_message(f'... DONE')
        print()
    # _update_frequencies
