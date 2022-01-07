import os
import sys
import sqlite3
from datetime import datetime
from typing import List
from operator import itemgetter

from pathlib import Path

from .shared.inc.helpers.gtfs_helpers import compute_formatted_date_from_gtfs_folder_path
from .shared.inc.helpers.file_helpers import compute_file_rows_no
from .shared.inc.helpers.csv_updater import CSV_Updater
from .shared.inc.helpers.bundle_helpers import load_resource_from_bundle
from .shared.inc.helpers.db_helpers import table_select_rows
from .shared.inc.helpers.log_helpers import log_message

from .t_models import HRDF_Trip_Variant, GTFS_Trip

class GTFS_HRDF_Compare_Controller:
    def __init__(self, app_config, gtfs_db_path: Path, hrdf_db_path: Path):
        log_message('GTFS_HRDF_Compare_Controller - START INIT')

        self.map_sql_queries = app_config['map_sql_queries']
        self.report_paths = app_config['report_paths']

        self.gtfs_db_path = gtfs_db_path
        self.gtfs_db = sqlite3.connect(str(gtfs_db_path))
        self.gtfs_db.row_factory = sqlite3.Row

        self.hrdf_db_path = hrdf_db_path
        self.hrdf_db = sqlite3.connect(str(hrdf_db_path))
        self.hrdf_db.row_factory = sqlite3.Row

        self.gtfs_db_lookups = self._compute_lookups(self.gtfs_db)
        self.hrdf_db_lookups = self._compute_lookups(self.hrdf_db)

        start_date, days_no = self._compute_calendar_info()
        self.calendar_start_date = start_date
        self.calendar_days_no = days_no
        
        self.map_calendar_gtfs = self._compute_map_calendar_gtfs_hrdf()

        log_message('GTFS_HRDF_Compare_Controller - DONE INIT')

    def compare(self, request_date: datetime, agency_id: str):
        print(f'=================================')
        print(f'COMPARE GTFS WITH HRDF')
        print(f'=================================')
        print(f'HRDF DB PATH: {self.hrdf_db_path}')
        print(f'GTFS DB PATH: {self.gtfs_db_path}')
        print(f'DAY         : {request_date}')
        print(f'AGENCY ID   : {agency_id}')
        print(f'=================================')
        print('')

        map_hrdf_trips = self._compute_map_hrdf_trips(agency_id=agency_id, request_date=request_date)
        map_gtfs_trips = self._compute_map_gtfs_trips(agency_id=agency_id, request_date=request_date)

        self._compare_stats_datasets(map_hrdf_trips, map_gtfs_trips)
        
        csv_reporter_field_names = ['trip_id', 'route_short_name', 'short_name', 'agency_id', 'route_id', 'service_id', 'hrdf_match_type', 'hrdf_service_id_match_score', 'hrdf_FPLAN_row_idx']
        csv_reporter = CSV_Updater(self.report_paths['gtfs_trips_with_csv_path'], csv_reporter_field_names)

        for map_gtfs_agency_trips in map_gtfs_trips.values():
            for route_short_name in map_gtfs_agency_trips:
                gtfs_trips = map_gtfs_agency_trips[route_short_name]
                
                for gtfs_trip in gtfs_trips:
                    report_csv_row = {
                        'trip_id': gtfs_trip.trip_id,
                        'route_short_name': gtfs_trip.route.route_short_name,
                        'short_name': gtfs_trip.trip_short_name,
                        'route_id': gtfs_trip.route.route_id,
                        'agency_id': gtfs_trip.route.agency.agency_id,
                        'service_id': gtfs_trip.service.service_id,
                        'hrdf_match_type': None,
                        'hrdf_service_id_match_score': None,
                        'hrdf_FPLAN_row_idx': None,
                    }

                    matched_data_rows = self._match_hrdf_trips(gtfs_trip, map_hrdf_trips)
                    matched_data_rows = sorted(matched_data_rows, key=itemgetter('match_score'), reverse=True)

                    match_status = 'NO_MATCH'
                    if len(matched_data_rows) > 0:
                        first_matched_row = matched_data_rows[0]
                        match_status = first_matched_row['match_status']

                    if match_status in ['EXACT_MATCH', 'TRIP_ID_PLUS_ENDPOINTS']:
                        filtered_matched_data_rows = [row for row in matched_data_rows if row['match_status'] == match_status]
                        filtered_matched_data_rows_no = len(filtered_matched_data_rows)

                        if filtered_matched_data_rows_no > 1:
                            match_status = f'{match_status}_{filtered_matched_data_rows_no}'

                        hrdf_trip: HRDF_Trip_Variant = first_matched_row['trip']
                        report_csv_row['hrdf_FPLAN_row_idx'] = hrdf_trip.fplan_row_idx

                        service_id_matched_days = first_matched_row['match_details']['service_id_matched_days']
                        service_id_match_score = round(service_id_matched_days / len(hrdf_trip.service.day_bits), 3)
                        report_csv_row['hrdf_service_id_match_score'] = service_id_match_score

                    report_csv_row['hrdf_match_type'] = match_status

                    csv_reporter.prepare_row(report_csv_row)
                # end GTFS trip
            # end MAP_GTFS route_short_name
        # end MAP_GTFS agency_id

        csv_reporter.close()
        log_message(f'Saved report to {csv_reporter.csv_file.name}')

    def _compare_stats_datasets(self, map_hrdf_trips, map_gtfs_trips):
        log_message('STATS DATASETS')
        
        map_aggregated_trips = {}
        for map_dataset_trips in [map_gtfs_trips, map_hrdf_trips]:
            dataset_type = 'gtfs' if map_dataset_trips == map_gtfs_trips else 'hrdf'

            for agency_id in map_dataset_trips:
                if agency_id not in map_aggregated_trips:
                    map_aggregated_trips[agency_id] = {}
                
                for vehicle_type_key in map_dataset_trips[agency_id]:
                    if vehicle_type_key not in map_aggregated_trips[agency_id]:
                        map_aggregated_trips[agency_id][vehicle_type_key] = {
                            'vehicle_type': vehicle_type_key,
                            'gtfs_trips_no': 0,
                            'hrdf_trips_no': 0,
                        }
                    
                    dataset_trips = map_dataset_trips[agency_id][vehicle_type_key]
                    dataset_trips_no = len(dataset_trips)

                    dataset_type_key = f'{dataset_type}_trips_no'
                    
                    map_aggregated_trips[agency_id][vehicle_type_key][dataset_type_key] += dataset_trips_no

        report_vehicle_type_lines = [
            '| Agency ID | FPLAN Type + Line | HRDF trips no | GTFS trips no | Trips Delta |',
            '|---|---|---|---|---|',
        ]

        for agency_id in map_aggregated_trips:
            trips_agency_data = map_aggregated_trips[agency_id]

            for vehicle_type in trips_agency_data:
                vehicle_type_data = trips_agency_data[vehicle_type]

                vehicle_type_key_s = vehicle_type_data['vehicle_type'].ljust(10, ' ')
                trips_hrdf_no = vehicle_type_data['hrdf_trips_no']
                trips_gtfs_no = vehicle_type_data['gtfs_trips_no']
                trips_delta = trips_gtfs_no - trips_hrdf_no
                trips_delta_s = '' if trips_delta == 0 else f'{trips_delta}'

                md_line_values = [
                    agency_id,
                    vehicle_type_key_s,
                    f'{trips_hrdf_no}',
                    f'{trips_gtfs_no}',
                    trips_delta_s,
                ]

                md_line_values_s = ' | '.join(md_line_values)

                report_vehicle_type_line = f'| {md_line_values_s} |'
                report_vehicle_type_lines.append(report_vehicle_type_line)

        report_vehicle_type_stats_path = self.report_paths['vehicle_type_stats_path']
        report_vehicle_type_stats_file = open(report_vehicle_type_stats_path, 'w')
        report_vehicle_type_stats_file.write("\n".join(report_vehicle_type_lines))
        report_vehicle_type_stats_file.close()

        log_message(f'... saved stats to {report_vehicle_type_stats_path}')

    def _compute_lookups(self, db_handle):
        map_db_lookups = {}

        table_names = ['agency', 'calendar', 'stops']
        if db_handle == self.gtfs_db:
            table_names.append('routes')

        map_table_keys = {
            'agency': 'agency_id',
            'calendar': 'service_id',
            'stops': 'stop_id',
            'routes': 'route_id',
        }

        for table_name in table_names:
            pk_field = map_table_keys[table_name]
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

    def _compute_calendar_day_idx(self, for_date: datetime):
        day_idx = (for_date - self.calendar_start_date).days
        return day_idx

    def _compute_map_calendar_gtfs_hrdf(self):
        days_no = self.calendar_days_no
        
        calendar_hrdf_db_rows = table_select_rows(self.hrdf_db, 'calendar')
        map_calendar_hrdf_day_bits = {}
        for gtfs_db_row in calendar_hrdf_db_rows:
            service_id = gtfs_db_row['service_id']
            day_bits_key = gtfs_db_row['day_bits'][0:days_no]
            
            if day_bits_key in map_calendar_hrdf_day_bits:
                service_id_prev = map_calendar_hrdf_day_bits[day_bits_key]
                print(f'WHOOPS - {service_id} has same day_bits with {service_id_prev}')
                sys.exit(1)

            map_calendar_hrdf_day_bits[day_bits_key] = service_id

        map_calendar_gtfs = table_select_rows(self.gtfs_db, 'calendar', group_by_key='service_id')
        for service_id in map_calendar_gtfs:
            gtfs_db_row = map_calendar_gtfs[service_id]
            
            day_bits_key = gtfs_db_row['day_bits'][0:days_no]

            hrdf_service_id = map_calendar_hrdf_day_bits.get(day_bits_key) or None
            gtfs_db_row['hrdf_service_id'] = hrdf_service_id

        return map_calendar_gtfs

    def _compute_map_hrdf_trips(self, agency_id: str, request_date: datetime):
        log_message(f'Query HRDF trips ...')

        hrdf_trips_sql = load_resource_from_bundle(self.map_sql_queries, 'hrdf_select_trips')
        
        where_parts = []
        if agency_id:
            sql_where = f'AND fplan.agency_id = "{agency_id}"'
            where_parts.append(sql_where)

        day_idx = self._compute_calendar_day_idx(request_date)
        # +1 because the SUBSTR is 1-based index
        day_bit_where = f"AND SUBSTR(calendar.day_bits, {day_idx} + 1, 1) = '1'"
        where_parts.append(day_bit_where)

        where_parts_s = "\n".join(where_parts)
        hrdf_trips_sql = hrdf_trips_sql.replace('[EXTRA_WHERE]', where_parts_s)

        trips_hrdf_cursor = self.hrdf_db.cursor()
        trips_hrdf_cursor.execute(hrdf_trips_sql)

        map_hrdf_trips = {}
        trip_idx = 0
        for hrdf_trip_db_row in trips_hrdf_cursor:
            trip = HRDF_Trip_Variant.init_from_db_row(hrdf_trip_db_row, self.hrdf_db_lookups['calendar'], self.hrdf_db_lookups['agency'], self.hrdf_db_lookups['stops'])

            agency_id = trip.agency.agency_id
            if agency_id not in map_hrdf_trips:
                map_hrdf_trips[agency_id] = {}
            
            map_service_trips = map_hrdf_trips[agency_id]
            
            trip_fplan_key = trip.vehicle_type_key()
            if trip_fplan_key not in map_service_trips:
                map_service_trips[trip_fplan_key] = []

            map_service_trips[trip_fplan_key].append(trip)

            trip_idx += 1

        log_message(f'... return {trip_idx} trips')

        return map_hrdf_trips

    def _compute_map_gtfs_trips(self, agency_id: str, request_date: datetime):
        log_message(f'Query GTFS trips ...')

        gtfs_trips_sql = load_resource_from_bundle(self.map_sql_queries, 'gtfs_select_trips')
        
        where_parts = []
        if agency_id:
            sql_where = f'AND routes.agency_id = "{agency_id}"'
            where_parts.append(sql_where)

        day_idx = self._compute_calendar_day_idx(request_date)
        # +1 because the SUBSTR is 1-based index
        day_bit_where = f"AND SUBSTR(calendar.day_bits, {day_idx} + 1, 1) = '1'"
        where_parts.append(day_bit_where)

        where_parts_s = "\n".join(where_parts)
        gtfs_trips_sql = gtfs_trips_sql.replace('[EXTRA_WHERE]', where_parts_s)

        trips_gtfs_cursor = self.gtfs_db.cursor()
        trips_gtfs_cursor.execute(gtfs_trips_sql)

        trip_idx = 0

        map_gtfs_trips = {}
        for gtfs_trip_db_row in trips_gtfs_cursor:
            trip = GTFS_Trip.init_from_db_row(gtfs_trip_db_row, self.gtfs_db_lookups['calendar'], self.gtfs_db_lookups['agency'], self.gtfs_db_lookups['routes'], self.gtfs_db_lookups['stops'])

            agency_id = trip.route.agency.agency_id
            if agency_id not in map_gtfs_trips:
                map_gtfs_trips[agency_id] = {}

            route_short_name = trip.route.route_short_name
            if route_short_name not in map_gtfs_trips[agency_id]:
                map_gtfs_trips[agency_id][route_short_name] = []

            map_gtfs_trips[agency_id][route_short_name].append(trip)

            trip_idx += 1

        log_message(f'... return {trip_idx} trips')
        
        return map_gtfs_trips

    def _match_hrdf_trips(self, gtfs_trip: GTFS_Trip, map_hrdf_trips):
        agency_id = gtfs_trip.route.agency.agency_id
        map_hrdf_agency_trips = map_hrdf_trips[agency_id]

        gtfs_vehicle_type_key = gtfs_trip.route.route_short_name
        if gtfs_vehicle_type_key not in map_hrdf_agency_trips:
            matched_data_row = {
                'match_status': 'NO_VEHICLE_TYPE_MATCH',
                'match_score': 0,
                'trip': None
            }
            return [matched_data_row]

        hrdf_trips: List[HRDF_Trip_Variant] = map_hrdf_agency_trips[gtfs_vehicle_type_key]

        gtfs_calendar_db_row = self.map_calendar_gtfs[gtfs_trip.service.service_id]
        gtfs_calendar_hrdf_service_id = gtfs_calendar_db_row['hrdf_service_id']

        matched_data_rows = []

        for hrdf_trip in hrdf_trips:
            matched_data_row = self._match_hrdf_trip(gtfs_trip, gtfs_calendar_hrdf_service_id, hrdf_trip)
            if matched_data_row['match_score'] > 0:
                matched_data_rows.append(matched_data_row)

        return matched_data_rows

    def _match_hrdf_trip(self, gtfs_trip: GTFS_Trip, gtfs_calendar_hrdf_service_id: str, hrdf_trip: HRDF_Trip_Variant):
        has_same_FPLAN_trip_id = hrdf_trip.fplan_trip_id == gtfs_trip.trip_short_name
        has_same_service_id = hrdf_trip.service.service_id == gtfs_calendar_hrdf_service_id
        
        has_same_departure = hrdf_trip.trip_departure_time() == gtfs_trip.departure_time
        has_same_arrival = hrdf_trip.trip_arrival_time() == gtfs_trip.arrival_time
        
        gtfs_trip_from_stop = gtfs_trip.from_stop_time().stop
        gtfs_trip_from_stop_id = gtfs_trip_from_stop.stop_id.split(':')[0]
        hrdf_trip_from_stop_id = hrdf_trip.from_stop.stop_id
        has_same_from_stop_id = gtfs_trip_from_stop_id == hrdf_trip_from_stop_id
        
        gtfs_trip_to_stop = gtfs_trip.to_stop_time().stop
        gtfs_trip_to_stop_id = gtfs_trip_to_stop.stop_id.split(':')[0]
        hrdf_trip_to_stop_id = hrdf_trip.to_stop.stop_id
        has_same_to_stop_id = gtfs_trip_to_stop_id == hrdf_trip_to_stop_id

        has_same_endpoints = has_same_departure and has_same_arrival and has_same_from_stop_id and has_same_to_stop_id
        
        matched_data_row = {
            'match_status': 'NO_MATCH',
            'match_score': 0,
            'trip': hrdf_trip,
            'match_details': {
                'FPLAN_trip_id': has_same_FPLAN_trip_id,
                'service_id': has_same_service_id,
                'service_id_matched_days': 0,
                'endpoints': has_same_endpoints,
            }
        }

        match_score = 0

        if has_same_FPLAN_trip_id and has_same_endpoints:
            matched_data_row['match_status'] = 'EXACT_MATCH'
            match_score += 1000

        service_id_matched_days = 0
        if match_score > 0:
            service_id_matched_days = self._match_service_score(gtfs_trip.service.day_bits, hrdf_trip.service.day_bits)

        match_score += service_id_matched_days

        matched_data_row['match_score'] = match_score
        matched_data_row['match_details']['service_id_matched_days'] = service_id_matched_days
        
        return matched_data_row

    def _match_service_score(self, day_bits_a, day_bits_b):
        matched_days_no = 0
        
        for idx, day_bit_a in enumerate(day_bits_a):
            day_bit_b = day_bits_b[idx]
            if day_bit_a == day_bit_b:
                matched_days_no += 1

        return matched_days_no
