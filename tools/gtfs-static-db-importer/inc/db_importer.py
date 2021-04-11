import os, sys
import math
import yaml
import csv
import sqlite3
import calendar, datetime
from pathlib import Path

from .shared.inc.helpers.gtfs_helpers import convert_datetime_to_day_minutes, massage_datetime_to_hhmm
from .shared.inc.helpers.log_helpers import log_message
from .shared.inc.helpers.db_helpers import truncate_and_load_table_records, table_select_rows, execute_sql_queries

class GTFS_DB_Importer:
    def __init__(self, gtfs_folder_path, db_path):
        self.gtfs_folder_path = gtfs_folder_path
        self.db_path = str(db_path)
        self.db_schema_config = self._load_schema_config()

    def start(self):
        log_message("START")

        # calendar: calendar + calendar_dates
        map_calendar_rows = self._parse_map_calendar()
        calendar_dates_rows = self._parse_calendar_dates(map_calendar_rows)
        self._insert_calendar_tables(map_calendar_rows, calendar_dates_rows)

        self._parse_import_trips()
        map_trips_data = self._parse_import_stop_times()
        self._update_trips_day_minutes(map_trips_data)

        self._parse_import_routes()
        self._parse_import_agency()
        self._parse_import_stops()

        log_message("DONE")

    # private
    def _load_schema_config(self):
        script_path = Path(os.path.realpath(__file__))
        db_schema_path = f"{script_path.parent}/config/gtfs_schema.yml"
        db_schema_config = yaml.safe_load(open(db_schema_path))

        return db_schema_config

    def _parse_map_calendar(self):
        map_calendar_rows = {}

        log_message(f'START calendar')

        gtfs_file_path = Path(f'{self.gtfs_folder_path}/calendar.txt')
        log_message(f'... parse {gtfs_file_path.name}')

        calendar_start_date = None
        calendar_end_date = None
        calendar_weeks_no = None

        calendar_days = list(calendar.day_name)
        
        csv_handler = open(gtfs_file_path, encoding='utf-8-sig')
        csv_reader = csv.DictReader(csv_handler)
        csv_row_id = 1
        for row in csv_reader:
            service_id = row['service_id']

            if csv_row_id % 10000 == 0:
                log_message(f'... parsed {csv_row_id} rows')

            if service_id in map_calendar_rows:
                print('ERROR, {service_id} already defined')
                print(calendar_row)
                print(map_calendar_rows[service_id])
                sys.exit()

            start_date_s = row['start_date']
            end_date_s = row['end_date']
            
            start_date = datetime.datetime.strptime(start_date_s, "%Y%m%d")
            end_date = datetime.datetime.strptime(end_date_s, "%Y%m%d")

            if not calendar_start_date:
                calendar_start_date = start_date
                calendar_end_date = end_date
                calendar_weeks_no = math.ceil((end_date - start_date).days / 7)
            
            if start_date != calendar_start_date:
                print('TODO - handle different start dates')
                print(start_date)
                print(calendar_start_date)
                sys.exit()

            calendar_row = {
                'service_id': service_id,
                'monday': int(row['monday']),
                'tuesday': int(row['tuesday']),
                'wednesday': int(row['wednesday']),
                'thursday': int(row['thursday']),
                'friday': int(row['friday']),
                'saturday': int(row['saturday']),
                'sunday': int(row['sunday']),
                'start_date': start_date_s,
                'end_date': end_date_s,
                'start_date_obj': start_date,
                'day_bits_list': [],
            }

            map_weekdays_pattern = {}
            for calendar_day in calendar_days:
                day_key = calendar_day.lower()
                map_weekdays_pattern[calendar_day] = calendar_row[day_key] == 1

            day_bits = self._fill_day_bits_pattern(start_date, end_date, calendar_weeks_no, map_weekdays_pattern)

            calendar_row['day_bits_list'] = day_bits

            map_calendar_rows[service_id] = calendar_row

            csv_row_id += 1

        return map_calendar_rows

    def _parse_calendar_dates(self, map_calendar_rows):
        log_message(f'START calendar_dates')

        gtfs_file_path = Path(f'{self.gtfs_folder_path}/calendar_dates.txt')
        log_message(f'... parse {gtfs_file_path.name}')

        table_rows = []

        csv_handler = open(gtfs_file_path, encoding='utf-8-sig')
        csv_reader = csv.DictReader(csv_handler)
        csv_row_id = 1
        for row in csv_reader:
            if csv_row_id % 500000 == 0:
                log_message(f'... parsed {csv_row_id} rows')

            service_id = row['service_id']

            if service_id not in map_calendar_rows:
                print(f'ERROR: service_id "{service_id}" not found in calendar table')
                sys.exit()

            calendar_row = map_calendar_rows[service_id]
            start_date = calendar_row['start_date_obj']
            day_bits = calendar_row['day_bits_list']

            date_s = row['date']
            row_date = datetime.datetime.strptime(date_s, "%Y%m%d")
            exception_type = int(row['exception_type'])

            table_row = {
                'service_id': row['service_id'],
                'date': date_s,
                'exception_type': exception_type,
            }
            table_rows.append(table_row)

            # Update the day_bits in calendar
            day_bit = None
            if exception_type == 1:
                day_bit = '1'
            if exception_type == 2:
                day_bit = '0'

            if not day_bit:
                print(f'ERROR - cant interpret exception_type {table_row}')
                sys.exit()

            day_idx = (row_date-start_date).days
            day_bits[day_idx] = day_bit

            csv_row_id += 1

        # Update day_bits string value
        for service_id in map_calendar_rows:
            calendar_row = map_calendar_rows[service_id]
            day_bits = calendar_row['day_bits_list']
            day_bits_s = ''.join(day_bits)
            calendar_row['day_bits'] = day_bits_s

        return table_rows
    
    def _insert_calendar_tables(self, map_calendar_rows, calendar_dates_rows):
        calendar_rows = list(map_calendar_rows.values())
        log_message(f'INSERT {len(calendar_rows)} rows in calendar...')
        
        table_config = self.db_schema_config['tables']['calendar']
        truncate_and_load_table_records(self.db_path, 'calendar', table_config, calendar_rows)

        log_message(f'... DONE')

        log_message(f'.. INSERT {len(calendar_dates_rows)} rows in DB...')
        
        table_config = self.db_schema_config['tables']['calendar_dates']
        truncate_and_load_table_records(self.db_path, 'calendar_dates', table_config, calendar_dates_rows, log_lines_no=500000)

        log_message(f'.. DONE')

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

    def _parse_import_trips(self):
        log_message(f'START trips')

        db_handle = sqlite3.connect(self.db_path)
        map_calendar_rows = table_select_rows(db_handle, 'calendar', None, 'service_id')

        gtfs_file_path = Path(f'{self.gtfs_folder_path}/trips.txt')
        log_message(f'... parse {gtfs_file_path.name}')

        table_rows = []

        csv_handler = open(gtfs_file_path, encoding='utf-8-sig')
        csv_reader = csv.DictReader(csv_handler)
        csv_row_id = 1
        for row in csv_reader:
            if csv_row_id % 200000 == 0:
                log_message(f'... parsed {csv_row_id} rows')

            route_id = row['route_id']
            service_id = row['service_id']
            trip_id = row['trip_id']
            trip_headsign = row['trip_headsign']
            trip_short_name = row['trip_short_name']
            direction_id = int(row['direction_id'])
            
            if not service_id in map_calendar_rows:
                print(f'ERROR: service_id "{service_id}" not found in calendar table')
                print(row)
                sys.exit()

            table_row = {
                'route_id': route_id,
                'service_id': service_id,
                'trip_id': trip_id,
                'trip_headsign': trip_headsign,
                'trip_short_name': trip_short_name,
                'direction_id': direction_id,
            }

            table_rows.append(table_row)


            csv_row_id += 1
        
        log_message(f'.. INSERT {len(table_rows)} rows in DB...')
        
        table_config = self.db_schema_config['tables']['trips']
        truncate_and_load_table_records(self.db_path, 'trips', table_config, table_rows, log_lines_no=200000)

        log_message(f'.. DONE')

    def _parse_import_stop_times(self):
        log_message(f'START stop_times')

        gtfs_file_path = Path(f'{self.gtfs_folder_path}/stop_times.txt')
        log_message(f'... parse {gtfs_file_path.name}')

        map_trips_data = {}
        table_rows = []

        csv_handler = open(gtfs_file_path, encoding='utf-8-sig')
        csv_reader = csv.DictReader(csv_handler)
        csv_row_id = 1
        debug_logs_no = 1000000
        for row in csv_reader:
            if csv_row_id % debug_logs_no == 0:
                log_message(f'... parsed {csv_row_id} rows')

            trip_id = row['trip_id']
            arrival_time = row['arrival_time']
            departure_time = row['departure_time']
            stop_id = row['stop_id']
            stop_sequence = int(row['stop_sequence'])
            pickup_type = int(row['pickup_type'])
            drop_off_type = int(row['drop_off_type'])

            table_row = {
                'trip_id': trip_id,
                'arrival_time': arrival_time,
                'departure_time': departure_time,
                'stop_id': stop_id,
                'stop_sequence': stop_sequence,
                'pickup_type': pickup_type,
                'drop_off_type': drop_off_type,
            }
            table_rows.append(table_row)
            
            if not trip_id in map_trips_data:
                map_trips_data[trip_id] = {
                    'trip_id': trip_id,
                    'departure_day_minutes': 0,
                    'arrival_day_minutes': 0,
                    'departure_time': '',
                    'arrival_time': '',
                    'stop_times': [],
                }
            
            map_trips_data[trip_id]['stop_times'].append(table_row)

            csv_row_id += 1

        log_message(f'... massage stop_times')
        for trip_id in map_trips_data:
            trip_data = map_trips_data[trip_id]
            stop_times = trip_data['stop_times']

            for stop_type in ['from', 'to']:
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

                stop_time[reset_time_field] = None
                stop_day_minutes_datetime = stop_time[stop_day_minutes_datetime_field]
                stop_day_minutes = convert_datetime_to_day_minutes(stop_day_minutes_datetime)

                trip_data[trip_day_minutes_field] = stop_day_minutes
                trip_data[stop_day_minutes_datetime_field] = stop_day_minutes_datetime
        # end massage stop_times

        log_message(f'.. INSERT {len(table_rows)} rows in DB...')
        
        table_config = self.db_schema_config['tables']['stop_times']
        truncate_and_load_table_records(self.db_path, 'stop_times', table_config, table_rows, log_lines_no=debug_logs_no)

        log_message(f'.. DONE')

        return map_trips_data

    def _update_trips_day_minutes(self, map_trips_data):
        log_message(f'BATCH UPDATE trips with stop_times ...')

        trip_update_queries = []
        for trip_id in map_trips_data:
            trip_data = map_trips_data[trip_id]

            stop_times_values = []
            for stop_time in trip_data['stop_times']:
                stop_id = stop_time['stop_id']

                arrival_time = massage_datetime_to_hhmm(stop_time['arrival_time'])
                departure_time = massage_datetime_to_hhmm(stop_time['departure_time'])
                
                stop_time_value = f'{stop_id}|{arrival_time}|{departure_time}'
                stop_times_values.append(stop_time_value)

            stop_times_s = ' -- '.join(stop_times_values)

            departure_day_minutes = trip_data['departure_day_minutes']
            arrival_day_minutes = trip_data['arrival_day_minutes']
            trip_departure = trip_data['departure_time']
            trip_arrival = trip_data['arrival_time']

            # TODO - move me to a SQL-named
            sql = f'UPDATE trips SET departure_day_minutes = {departure_day_minutes}, arrival_day_minutes = {arrival_day_minutes}, departure_time = "{trip_departure}", arrival_time = "{trip_arrival}", stop_times_s = "{stop_times_s}" WHERE trip_id = "{trip_id}"'
            trip_update_queries.append(sql)
        
        db_handle = sqlite3.connect(self.db_path)
        execute_sql_queries(db_handle, trip_update_queries, log_lines_no=200000)
        
        log_message(f'DONE')

    def _parse_import_routes(self):
        log_message(f'START routes')

        gtfs_file_path = Path(f'{self.gtfs_folder_path}/routes.txt')
        log_message(f'... parse {gtfs_file_path.name}')

        table_rows = []

        csv_handler = open(gtfs_file_path, encoding='utf-8-sig')
        csv_reader = csv.DictReader(csv_handler)
        csv_row_id = 1
        for row in csv_reader:
            if csv_row_id % 200000 == 0:
                log_message(f'... parsed {csv_row_id} rows')

            route_id = row['route_id']

            route_type_s = row['route_type']
            route_type = 0
            if not route_type_s:
                print(f'WARNING - {route_id} empty route_type')
            else:
                route_type = int(route_type_s)

            table_row = {
                'route_id': route_id,
                'agency_id': row['agency_id'],
                'route_short_name': row['route_short_name'],
                'route_long_name': row['route_long_name'],
                'route_desc': row['route_desc'],
                'route_type': route_type,
            }
            table_rows.append(table_row)

            csv_row_id += 1
        
        log_message(f'.. INSERT {len(table_rows)} rows in DB...')
        
        table_config = self.db_schema_config['tables']['routes']
        truncate_and_load_table_records(self.db_path, 'routes', table_config, table_rows, log_lines_no=200000)

        log_message(f'.. DONE')

    def _parse_import_agency(self):
        log_message(f'START agency')

        gtfs_file_path = Path(f'{self.gtfs_folder_path}/agency.txt')
        log_message(f'... parse {gtfs_file_path.name}')

        table_rows = []

        csv_handler = open(gtfs_file_path, encoding='utf-8-sig')
        csv_reader = csv.DictReader(csv_handler)
        csv_row_id = 1
        for row in csv_reader:
            if csv_row_id % 200000 == 0:
                log_message(f'... parsed {csv_row_id} rows')
            
            agency_id = row['agency_id']

            table_row = {
                'agency_id': agency_id,
                'agency_name': row['agency_name'],
                'agency_url': row['agency_url'],
                'agency_timezone': row['agency_timezone'],
                'agency_lang': row['agency_lang'],
                'agency_phone': row['agency_phone'],
            }
            table_rows.append(table_row)

            csv_row_id += 1
        
        log_message(f'.. INSERT {len(table_rows)} rows in DB...')
        
        table_config = self.db_schema_config['tables']['agency']
        truncate_and_load_table_records(self.db_path, 'agency', table_config, table_rows, log_lines_no=200000)

        log_message(f'.. DONE')

    def _parse_import_stops(self):
        log_message(f'START stops')

        gtfs_file_path = Path(f'{self.gtfs_folder_path}/stops.txt')
        log_message(f'... parse {gtfs_file_path.name}')

        table_rows = []

        csv_handler = open(gtfs_file_path, encoding='utf-8-sig')
        csv_reader = csv.DictReader(csv_handler)
        csv_row_id = 1
        for row in csv_reader:
            if csv_row_id % 200000 == 0:
                log_message(f'... parsed {csv_row_id} rows')

            stop_id = row['stop_id']
            stop_lon = round(float(row['stop_lon']), 6)
            stop_lat = round(float(row['stop_lat']), 6)

            table_row = {
                'stop_id': stop_id,
                'stop_name': row['stop_name'],
                'stop_lon': stop_lon,
                'stop_lat': stop_lat,
                'location_type': row['location_type'],
                'parent_station': row['parent_station'],
            }
            table_rows.append(table_row)

            csv_row_id += 1
        
        log_message(f'.. INSERT {len(table_rows)} rows in DB...')
        
        table_config = self.db_schema_config['tables']['stops']
        truncate_and_load_table_records(self.db_path, 'stops', table_config, table_rows, log_lines_no=200000)

        log_message(f'.. DONE')

    def _debug_calendar_row(self, calendar_row):
        start_date = datetime.datetime.strptime(calendar_row['start_date'], "%Y%m%d")
        end_date = datetime.datetime.strptime(calendar_row['end_date'], "%Y%m%d")

        weekdays_pattern_list = [
            calendar_row['monday'],
            calendar_row['tuesday'],
            calendar_row['wednesday'],
            calendar_row['thursday'],
            calendar_row['friday'],
            calendar_row['saturday'],
            calendar_row['sunday'],
        ]
        weekdays_pattern = ''.join(map(str, weekdays_pattern_list))
        print(f'Pattern: {weekdays_pattern}')

        current_date = start_date
        while current_date <= end_date:
            day_idx = (current_date - start_date).days
            day_bit = calendar_row['day_bits_list'][day_idx]
            weekday_s = current_date.strftime("%A")
            print(f'{day_idx} -- {str(current_date)[0:10]} - {weekday_s} - {day_bit}')
            
            current_date = current_date + datetime.timedelta(days=1)

        print('========')