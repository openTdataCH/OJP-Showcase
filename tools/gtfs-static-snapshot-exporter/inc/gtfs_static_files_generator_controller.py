import os, sys
import json
import sqlite3
from datetime import datetime, timedelta, date
from pathlib import Path

from .shared.inc.helpers.gtfs_helpers import compute_date_from_gtfs_db_filename
from .shared.inc.helpers.log_helpers import log_message
from .shared.inc.helpers.bundle_helpers import load_resource_from_bundle

from .shared.inc.controllers.gtfs_static_db_controller import GTFS_Static_DB_Controller
from .shared.inc.controllers.gtfs_rt_agency_controller import GTFS_RT_Agency_Controller

class GTFS_Static_Files_Generator_Controller:
    def __init__(self, gtfs_db_path: Path, app_config):
        gtfs_date = compute_date_from_gtfs_db_filename(gtfs_db_path.name)
        if not gtfs_date:
            print(f'ERROR - cant compute date from {gtfs_db_path.name}')
            sys.exit(1)

        self.gtfs_date = gtfs_date
        self.db = sqlite3.connect(str(gtfs_db_path))
        self.db.row_factory = sqlite3.Row
        
        self.gtfs_static_db_controller = GTFS_Static_DB_Controller(gtfs_db_path)

        go_realtime_csv_path = app_config['go_realtime_csv_path']
        self.gtfs_rt_agency_controller = GTFS_RT_Agency_Controller(go_realtime_csv_path)

        self.static_snapshot_paths = app_config['gtfs_static_snapshot_paths']
        self.map_sql_queries = app_config['map_sql_queries']

    def generate_weekday_files(self):
        self._generate_lookups()
        self._generate_weekday_files()

    def _generate_lookups(self):
        gtfs_date_s = f'{self.gtfs_date}'

        map_lookups_path = self.static_snapshot_paths['db_lookups_json_path']
        map_lookups_path = map_lookups_path.replace('[GTFS_DB_DAY]', gtfs_date_s)
        map_lookups_path = Path(map_lookups_path)
        os.makedirs(map_lookups_path.parent, exist_ok=True)

        map_lookups = {}

        table_names = ['agency', 'routes', 'stops']
        for table_name in table_names:
            table_result_rows = self._generate_lookup(table_name)
            map_lookups[table_name] = {
                'lookup_name': table_name,
                'data_source': f'DB: {self.gtfs_date}',
                'rows_no': len(table_result_rows),
                'rows': table_result_rows,
            }

        map_lookups_file = open(map_lookups_path, 'w')
        map_lookups_file.write(json.dumps(map_lookups))
        map_lookups_file.close()

        table_names_s = ','.join(table_names)
        log_message(f'saved DB lookups({table_names_s}) to {map_lookups_path}')
    
    def _generate_lookup(self, table_name):
        result_rows = []
        
        sql = f'SELECT * FROM {table_name}'
        select_cursor = self.db.cursor()
        select_cursor.execute(sql)
        for db_row in select_cursor:
            row_dict = {}
            for columnn_name in db_row.keys():
                row_dict[columnn_name] = db_row[columnn_name]
            
            result_rows.append(row_dict)
        select_cursor.close()

        return result_rows

    def _compute_trips_base_sql(self):
        sql = load_resource_from_bundle(self.map_sql_queries, 'gtfs_query_active_trips')

        sql_where_addtional_parts = []
        
        go_realtime_agency_ids = self.gtfs_rt_agency_controller.compute_agency_ids()
        
        agency_ids_in_s = ', '.join(map(lambda x: "'" + x + "'", go_realtime_agency_ids))
        sql_where = f'AND routes.agency_id IN ({agency_ids_in_s})'
        sql_where_addtional_parts.append(sql_where)

        sql_where_addtional = "\n".join(sql_where_addtional_parts)
        sql = sql.replace('[EXTRA_WHERE]', sql_where_addtional)

        return sql

    def _generate_weekday_files(self):
        gtfs_day_idx = self.gtfs_static_db_controller.compute_day_idx(self.gtfs_date)

        sql_template = self._compute_trips_base_sql()

        db_trips_day_json_path_template = self.static_snapshot_paths['db_trips_day_json_path']

        gtfs_date_s = f'{self.gtfs_date}'
        db_trips_day_json_path_template = db_trips_day_json_path_template.replace('[GTFS_DB_DAY]', gtfs_date_s)

        # 7 days - we export from Wed to Wed to catch the overlapping time
        for weekday_idx in range(7 + 1):
            day_idx = gtfs_day_idx + weekday_idx

            day_date = self.gtfs_static_db_controller.from_date + timedelta(days=day_idx)
            
            sql = f'{sql_template}'
            sql = sql.replace('[DAY_IDX]', str(day_idx))

            log_message(f'Query for active trips in {day_date} ...')

            trip_rows = []
            select_cursor = self.db.cursor()
            select_cursor.execute(sql)
            for db_row in select_cursor:
                trip_row = {
                    'trip_id': db_row['trip_id'],
                    'trip_short_name': db_row['trip_short_name'],
                    'route_id': db_row['route_id'],
                    'stop_times_s': db_row['stop_times_s'],
                }
                trip_rows.append(trip_row)
            select_cursor.close()

            db_weekday_json_path = f'{db_trips_day_json_path_template}'
            db_weekday_json_path = db_weekday_json_path.replace('[GTFS_DAY]', f'{day_date}')
            db_weekday_json_path = Path(db_weekday_json_path)
            os.makedirs(db_weekday_json_path.parent, exist_ok=True)

            db_weekday_json_file = open(db_weekday_json_path, 'w')
            db_weekday_json_file.write(json.dumps(trip_rows, indent=4))
            db_weekday_json_file.close()
            log_message(f'... saved {len(trip_rows)} trips to {db_weekday_json_path}')
        
        log_message(f'DONE')