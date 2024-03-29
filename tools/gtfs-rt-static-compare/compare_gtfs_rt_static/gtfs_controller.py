import os, sys

from pathlib import Path

from typing import Dict, Optional

from datetime import datetime, timedelta

from .helpers.config_helpers import load_yaml_config
from .helpers.gtfs_helpers import compute_gtfs_db_filename
from .helpers.json_helpers import load_json_from_file, export_json_to_file
from .helpers.db_engine import SQLiteDBEngine
from .helpers.log_helpers import log_message

from .models.gtfs_rt import GTFS_RT_Response
from .models.gtfs_rt_static_report import GTFS_RT_Static_Report, GTFS_RT_Static_Report_Metadata

from .models.gtfs_static_db import Route as RouteDB
from .models.gtfs_static_db import Trip as TripDB

from .fetch import fetch_latest, compute_resource_snapshot_path

class GTFS_DB:
    _db: SQLiteDBEngine
    map_routes: Dict[str, RouteDB]
    map_trips: Dict[str, TripDB]
    _gtfs_db_table_cache_template: Optional[str]
    
    def __init__(self, db_path: Path, resources_path_config: Optional[Dict[str, str]]):
        self._db = SQLiteDBEngine(db_path)
        
        self.map_routes = {}
        self.map_routes = {}
        
        if resources_path_config is not None:
            self._gtfs_db_table_cache_template = resources_path_config.get('cache_gtfs_db_table', None)
            
    def init_lookups(self):
        gtfs_routes_db = self._load_gtfs_table('routes', map_by_field='route_id')
        self.map_routes = {}
        for route_id, route_db_json in gtfs_routes_db.items():
            self.map_routes[route_id] = RouteDB(**route_db_json)        
        
        gtfs_trips_db = self._load_gtfs_table('trips', map_by_field='trip_id')
        self.map_trips: dict[str, TripDB] = {}
        for trip_id, trip_db_json in gtfs_trips_db.items():
            self.map_trips[trip_id] = TripDB(**trip_db_json)
        
    def _load_gtfs_table(self, table_name: str, map_by_field: str = None):
        res_cache_path = None
        if self._gtfs_db_table_cache_template is not None:
            res_cache_path_s: str = f'{self._gtfs_db_table_cache_template}'
            res_cache_path_s = res_cache_path_s.replace('[GTFS_FILENAME]', f'{self._db.db_path.name}')
            res_cache_path_s = res_cache_path_s.replace('[TABLE_NAME]', table_name)
            res_cache_path = Path(res_cache_path_s)
        
            if os.path.isfile(res_cache_path):
                res_json = load_json_from_file(res_cache_path)
                return res_json
        
        sql = None
        if table_name == 'trips':
            sql = 'SELECT trip_id, route_id, service_id FROM trips'
        if sql is None:
            sql = f'SELECT * FROM {table_name}'
            
        res_json = self._db.query(sql, map_by_field=map_by_field)
        
        if res_cache_path is not None:
            export_json_to_file(res_json, res_cache_path, pretty_print=True)
        
        return res_json
        
class GTFS_Controller:
    def __init__(self, app_path: Path):
        config_path = f'{app_path}/config/config.yml'
        self.app_config = load_yaml_config(config_path, app_path=app_path)
        
    def compare_latest_gtfs_rt_static(self):
        self._compare_compare_latest_gtfs_rt_static()
        
    def load_gtfs_db(self, gtfs_db_dt: datetime):
        return self._load_gtfs_db(gtfs_db_dt)
    
    def compare_gtfs_rt_from_file(self, gtfs_static_db_dt: datetime, gtfs_rt_file_dt: datetime, gtfs_rt_path: Path, gtfs_db: GTFS_DB):
        self._compare_gtfs_rt_from_file(gtfs_static_db_dt, gtfs_rt_file_dt, gtfs_rt_path, gtfs_db)
        
    def compute_gtfs_db_dt(self, dt: datetime):
        return self._compute_gtfs_db_dt(dt)
        
    # PRIVATE
    def _compare_compare_latest_gtfs_rt_static(self):
        log_message(f'START COMPARE GTFS -RT GTFS STATIC')
        
        fetch_dt = datetime.now()
        
        log_message(f'... START fetch GTFS-RT')
        log_message(f'... TS REQUEST    : {fetch_dt}')
        
        resource_path = self.app_config['resource_paths']['gtfs_rt_snapshot']
        gtfs_rt_snapshot_path = compute_resource_snapshot_path(resource_path, fetch_dt)
        gtfs_rt_response = fetch_latest(self.app_config, gtfs_rt_snapshot_path)
        
        gtfs_rt_dt = datetime.fromtimestamp(gtfs_rt_response.header.timestamp)
        
        gtfs_db_dt = self._compute_gtfs_db_dt(gtfs_rt_dt)
        
        # wednesdays are special, the DB might not be ready yet
        wed_week_idx = 2
        if gtfs_rt_dt.weekday() == wed_week_idx:
            gtfs_db_dt = self._rewind_gtfs_db_dt_if_needed(gtfs_db_dt)
            
        gtfs_db = self._load_gtfs_db(gtfs_db_dt)
        if gtfs_db is None:
            gtfs_db_day = gtfs_db_dt.strftime('%Y-%m-%d')
            print(f'ERROR: no DB found for {gtfs_db_day}')
            return
        
        self._compare_file_gtfs_rt_static(
            fetch_dt, gtfs_db_dt, 
            gtfs_rt_snapshot_path, gtfs_rt_response, gtfs_db
        )
        
    def _rewind_gtfs_db_dt_if_needed(self, gtfs_db_dt: datetime):
        gtfs_db_day = gtfs_db_dt.strftime('%Y-%m-%d')
        gtfs_db_filename = compute_gtfs_db_filename(gtfs_db_day)
        gtfs_db_path: str = self.app_config['resource_paths']['gtfs_db']
        gtfs_db_path = gtfs_db_path.replace('[GTFS_FILENAME]', gtfs_db_filename)
        
        if not os.path.isfile(gtfs_db_path):
            gtfs_db_dt = gtfs_db_dt - timedelta(days=7)
            
        return gtfs_db_dt
        
    def _load_gtfs_db(self, gtfs_db_dt: datetime):
        log_message(f'START GTFS lookups')
        
        gtfs_day = gtfs_db_dt.strftime('%Y-%m-%d')
        gtfs_db_filename = compute_gtfs_db_filename(gtfs_day)
        log_message(f'... loading {gtfs_db_filename}')
        gtfs_db_path: str = self.app_config['resource_paths']['gtfs_db']
        gtfs_db_path = gtfs_db_path.replace('[GTFS_FILENAME]', gtfs_db_filename)
        
        if not os.path.isfile(gtfs_db_path):
            return None
        
        gtfs_db = GTFS_DB(gtfs_db_path, self.app_config['resource_paths'])
        gtfs_db.init_lookups()
        
        log_message(f'... DONE GTFS lookups')
        
        return gtfs_db
    
    def _compare_gtfs_rt_from_file(self, gtfs_static_db_dt: datetime, gtfs_rt_file_dt: datetime, gtfs_rt_path: Path, gtfs_db: GTFS_DB):
        log_message(f'... JSON path: {gtfs_rt_path}')
        
        gtfs_rt_json = load_json_from_file(gtfs_rt_path)
        gtfs_rt_response = GTFS_RT_Response.from_gtfs_rt_json(gtfs_rt_json)
        
        self._compare_file_gtfs_rt_static(
            gtfs_rt_file_dt, gtfs_static_db_dt, 
            gtfs_rt_path, gtfs_rt_response, gtfs_db
        )
        
    def _compare_file_gtfs_rt_static(self, report_dt: datetime, gtfs_db_dt: datetime, gtfs_rt_path: Path, gtfs_rt_response: GTFS_RT_Response, gtfs_db: GTFS_DB):
        gtfs_rt_dt = datetime.fromtimestamp(gtfs_rt_response.header.timestamp)
        log_message(f'... RESPONSE')
        log_message(f'... rows: {len(gtfs_rt_response.entity)}')
        log_message(f'... TS RESPONSE   : {gtfs_rt_dt}')
        
        gtfs_static_day = gtfs_db_dt.strftime('%Y-%m-%d')
        gtfs_rt_age = round(gtfs_rt_dt.timestamp() - report_dt.timestamp())
        
        report_metdata = GTFS_RT_Static_Report_Metadata(
            report_dt=report_dt,
            gtfs_db_filename=compute_gtfs_db_filename(gtfs_static_day),
            gtfs_rt_filename=gtfs_rt_path.name,
            gtfs_rt_ts=round(gtfs_rt_dt.timestamp()),
            gtfs_rt_dt=gtfs_rt_dt,
            gtfs_rt_age=gtfs_rt_age,
    
            total_rows_no=0,
            tripOK_routeOK_no=0,
            tripOK_routeNOK_no=0,
            tripNOK_routeOK_no=0,
            tripNOK_routeNOK_no=0,
        )
        
        report_stats = GTFS_RT_Static_Report.init_with_metadata(report_metdata)
        
        for entity in gtfs_rt_response.entity:
            report_stats.metadata.total_rows_no += 1
            
            trip_id = entity.tripUpdate.trip.tripId
            route_id = entity.tripUpdate.trip.routeId
            
            trip_OK = trip_id in gtfs_db.map_trips
            route_OK = route_id in gtfs_db.map_routes
            
            if trip_OK and route_OK:
                report_stats.metadata.tripOK_routeOK_no += 1
                
            if trip_OK and not route_OK:
                report_stats.tripOK_routeNOK.append(entity.id)
                report_stats.metadata.tripOK_routeNOK_no += 1
                
            if not trip_OK and route_OK:
                report_stats.tripNOK_routeOK.append(entity.id)
                report_stats.metadata.tripNOK_routeOK_no += 1
                
            if not trip_OK and not route_OK:
                report_stats.tripNOK_routeNOK.append(entity.id)
                report_stats.metadata.tripNOK_routeNOK_no += 1
        # loop entity

        print(f'age                 : {gtfs_rt_age}')
        if abs(gtfs_rt_age) > 60:
            print(f'                    : ERROR, TOO OLD')
            print(f'                    : ' + gtfs_rt_dt.strftime('%Y-%m-%d %H:%M:%S'))
            print(f'                    : ' + report_dt.strftime('%Y-%m-%d %H:%M:%S'))
            print()
        print(f'rows                : {report_stats.metadata.total_rows_no}')
        print(f'OK                  : {report_stats.metadata.tripOK_routeOK_no}')
        print(f'tripOK  - routeNOT  : {len(report_stats.tripOK_routeNOK)}')
        print(f'tripNOT - routeOK   : {len(report_stats.tripNOK_routeOK)}')
        print(f'tripNOT - routeNOT  : {len(report_stats.tripNOK_routeNOK)}')
        print()
        
        report_path = self.app_config['resource_paths']['gtfs_rt_static_report']
        report_path = compute_resource_snapshot_path(report_path, report_dt)
        report_json = report_stats.as_json()
        export_json_to_file(report_json, report_path, pretty_print=True)
        log_message(f'... saved to {report_path}')
        
        log_message('... DONE')
        
    def _compute_gtfs_db_dt(self, dt: datetime):
        # GTFS static is published Wednesdays
        wed_week_idx = 2
        
        days_since_last_wed = (dt.weekday() - wed_week_idx) % 7
        
        # ... around 5AM
        if days_since_last_wed == 0:
            dt_hhmm = dt.strftime('%H%M')
            # at 6AM runs the cronjob for the new DB
            if dt_hhmm < "0700":
                days_since_last_wed = 7
                
        last_wed_dt = dt - timedelta(days=days_since_last_wed)
        
        return last_wed_dt
        
    def _compute_gtfs_db_filename_from_day(self, dt: datetime):
        last_wed_dt = self._compute_gtfs_db_dt(dt)
        
        last_wed_day = last_wed_dt.strftime("%Y-%m-%d")      
        gtfs_db_filename = compute_gtfs_db_filename(last_wed_day)
        
        return gtfs_db_filename
    
    def _load_gtfs_table(self, gtfs_db: SQLiteDBEngine, table_name: str, map_by_field: str = None):
        res_cache_path_s: str = self.app_config['resource_paths']['cache_gtfs_db_table']
        res_cache_path_s = res_cache_path_s.replace('[GTFS_FILENAME]', f'{gtfs_db.db_path.name}')
        res_cache_path_s = res_cache_path_s.replace('[TABLE_NAME]', table_name)
        res_cache_path = Path(res_cache_path_s)
        
        if os.path.isfile(res_cache_path):
            res_json = load_json_from_file(res_cache_path)
            return res_json
        
        sql = None
        if table_name == 'trips':
            sql = 'SELECT trip_id, route_id, service_id FROM trips'
        if sql is None:
            sql = f'SELECT * FROM {table_name}'
            
        res_json = gtfs_db.query(sql, map_by_field=map_by_field)
        
        export_json_to_file(res_json, res_cache_path, pretty_print=True)
        
        return res_json
        
    def _init_gtfs_db(self, gtfs_db_filename: str):
        gtfs_db_path: str = self.app_config['resource_paths']['gtfs_db']
        gtfs_db_path = gtfs_db_path.replace('[GTFS_FILENAME]', gtfs_db_filename)
        
        if not os.path.isfile(gtfs_db_path):
            return None
        
        gtfs_db = GTFS_DB(gtfs_db_path, self.app_config['resource_paths'])
        gtfs_db.init_lookups()
        
        return gtfs_db
