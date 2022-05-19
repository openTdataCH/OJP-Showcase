import os, sys
import json
import re
import sqlite3
import copy

from datetime import datetime
from typing import List
from operator import itemgetter

from pathlib import Path

from .shared.inc.models.gtfs_static.calendar import Calendar as GTFS_Calendar
from .shared.inc.models.hrdf.trip_variant import Trip_Variant as HRDF_Trip_Variant

from .shared.inc.helpers.bundle_helpers import load_resource_from_bundle
from .shared.inc.helpers.db_helpers import table_select_rows
from .shared.inc.helpers.log_helpers import log_message
from .shared.inc.helpers.hrdf_helpers import compute_formatted_date_from_hrdf_db_path

class HRDF_Check_Duplicates_Controller:
    def __init__(self, app_config, hrdf_db_path: Path):
        log_message('HRDF_Check_Duplicates_Controller - START INIT')

        self.hrdf_db_path = hrdf_db_path
        self.hrdf_db = sqlite3.connect(str(hrdf_db_path))
        self.hrdf_db.row_factory = sqlite3.Row

        self.hrdf_db_lookups = self._compute_lookups(self.hrdf_db)

        self.map_sql_queries = app_config['map_sql_queries']

        self.report_paths = app_config['report_paths']

        log_message('HRDF_Check_Duplicates_Controller - DONE INIT')

    def check(self):
        print(f'=================================')
        print(f'HRDF check duplicates')
        print(f'=================================')
        print(f'HRDF DB PATH: {self.hrdf_db_path}')
        print(f'=================================')
        print('')

        file_ymd = compute_formatted_date_from_hrdf_db_path(self.hrdf_db_path)
        if file_ymd is None:
            print(f'ERROR - cant read ymd from {self.hrdf_db_path.name}')
            sys.exit()

        map_hrdf_duplicates_agency_errors_path: str = self.report_paths['hrdf_duplicates_report_path']
        map_hrdf_duplicates_agency_errors_path = map_hrdf_duplicates_agency_errors_path.replace('[HRDF_YMD]', file_ymd)
        
        map_hrdf_duplicates_agency_errors = self._check()
        
        map_hrdf_duplicates_agency_errors_file = open(map_hrdf_duplicates_agency_errors_path, 'w', encoding='utf-8')
        map_hrdf_duplicates_agency_errors_file.write(json.dumps(map_hrdf_duplicates_agency_errors, indent=4))
        map_hrdf_duplicates_agency_errors_file.close()

        log_message(f'Saved report to {map_hrdf_duplicates_agency_errors_path}')

        log_message(f'DONE')

    def _check(self):
        map_hrdf_duplicates_errors = {
            'agency_data': {},
            'service_data': {},
            'map_hrdf_trips': {}
        }

        map_hrdf_trips = self._query_map_trips()
        
        for agency_id, map_agency_data in map_hrdf_trips.items():
            for trip_key, hrdf_trips_data in map_agency_data['map_trips'].items():
                hrdf_trips: List[HRDF_Trip_Variant] = hrdf_trips_data
                if len(hrdf_trips) == 1:
                    continue

                merged_service: GTFS_Calendar = None
                has_overlaps = False

                map_fplan_row_indices = {}
                
                for hrdf_trip in hrdf_trips:
                    if merged_service is None:
                        merged_service = copy.copy(hrdf_trip.service)
                        continue

                    if merged_service.has_overlaps(hrdf_trip.service):
                        has_overlaps = True

                    merged_service = merged_service.merge(hrdf_trip.service)

                    map_fplan_row_indices[hrdf_trip.fplan_row_idx] = 1

                # Check for same FPLAN entry (same fplan_row_idx) but 2 different variants (*A VE)
                fplan_row_indices = list(map_fplan_row_indices.keys())
                if len(fplan_row_indices) == 1:
                    continue
                
                if not has_overlaps:
                    continue

                if agency_id not in map_hrdf_duplicates_errors['agency_data']:
                    map_hrdf_duplicates_errors['agency_data'][agency_id] = {}

                map_agency_trips = map_hrdf_duplicates_errors['agency_data'][agency_id]
                map_agency_trips[trip_key] = []
                
                for hrdf_trip in hrdf_trips:
                    calendar_service_id = hrdf_trip.service.service_id

                    # include also service_id (for *A VE cases)
                    hrdf_lookup_key = f'{hrdf_trip.fplan_row_idx}.{calendar_service_id}'

                    map_agency_trips[trip_key].append(hrdf_lookup_key)

                    trip_json = hrdf_trip.as_json()

                    map_hrdf_duplicates_errors['map_hrdf_trips'][hrdf_lookup_key] = trip_json
                    if calendar_service_id not in map_hrdf_duplicates_errors['service_data']:
                        map_hrdf_duplicates_errors['service_data'][calendar_service_id] = hrdf_trip.service.pretty_print()
                    
                # END trips for teh current group
            # END loop map_agency_data['map_trips']
        # END loop map_hrdf_trips

        return map_hrdf_duplicates_errors

    def _query_map_trips(self):
        map_hrdf_trips = {}

        sql = 'SELECT DISTINCT agency_id FROM fplan'
        db_cursor = self.hrdf_db.cursor()
        db_cursor.execute(sql)

        log_message('START QUERY trips by agency')

        agency_row_idx = 0

        for fplan_db_row in db_cursor:
            if agency_row_idx % 50 == 0:
                log_message(f"... parsed {agency_row_idx} agencies ...")

            agency_id = fplan_db_row['agency_id']
            agency_hrdf_trips = self._query_trips_by_agency_id(agency_id)

            map_agency_duplicates = self._filter_hrdf_duplicates(agency_hrdf_trips)
            duplicate_groups_no = len(map_agency_duplicates.keys())
            if duplicate_groups_no == 0:
                continue

            map_hrdf_trips[agency_id] = {
                'agency': agency_hrdf_trips[0].agency,
                'map_trips': map_agency_duplicates,
            }

            agency_row_idx += 1

        db_cursor.close()

        log_message('... DONE')

        return map_hrdf_trips

    def _filter_hrdf_duplicates(self, hrdf_trips):
        map_duplicate_trips = {}

        for hrdf_trip in hrdf_trips:
            agency_id = hrdf_trip.agency.agency_id

            fplan_trip_id = hrdf_trip.fplan_trip_id
            trip_key = fplan_trip_id
            if agency_id == '801':
                irn_rows = hrdf_trip.compute_property_rows('*I RN')
                if len(irn_rows) == 1:
                    extra_key = irn_rows[0][29:38]
                    trip_key = f'{trip_key}-{extra_key}'
                else:
                    print('WHOOPS - expected 1 *I RN row')
                    sys.exit()

            if trip_key not in map_duplicate_trips:
                map_duplicate_trips[trip_key] = []

            map_duplicate_trips[trip_key].append(hrdf_trip)

        return map_duplicate_trips

    def _query_trips_by_agency_id(self, agency_id):
        hrdf_trips_sql = load_resource_from_bundle(self.map_sql_queries, 'hrdf_select_trips')

        where_parts = [
            f"AND fplan.agency_id = '{agency_id}'"
        ]

        where_parts_s = "\n".join(where_parts)
        hrdf_trips_sql = hrdf_trips_sql.replace('[EXTRA_WHERE]', where_parts_s)

        hrdf_cursor = self.hrdf_db.cursor()
        hrdf_cursor.execute(hrdf_trips_sql)
        
        hrdf_trips = []

        hrdf_trip_idx = 0

        for hrdf_trip_db_row in hrdf_cursor:
            hrdf_trip = HRDF_Trip_Variant.init_from_db_row(hrdf_trip_db_row, 
                self.hrdf_db_lookups['calendar'], self.hrdf_db_lookups['agency'], self.hrdf_db_lookups['stops']
            )
            
            if not hrdf_trip:
                continue

            hrdf_trips.append(hrdf_trip)

            hrdf_trip_idx += 1

        return hrdf_trips

    def _compute_lookups(self, db_handle):
        map_db_lookups = {}

        table_names = ['agency', 'calendar', 'stops']
        map_table_keys = {
            'agency': 'agency_id',
            'calendar': 'service_id',
            'stops': 'stop_id',
        }
        for table_name in table_names:
            pk_field = map_table_keys[table_name]
            map_db_lookups[table_name] = table_select_rows(db_handle, table_name, group_by_key=pk_field)

        return map_db_lookups
