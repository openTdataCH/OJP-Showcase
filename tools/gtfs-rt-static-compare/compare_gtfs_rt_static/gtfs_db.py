import os, sys

from pathlib import Path

from typing import Dict, Optional

from .helpers.json_helpers import load_json_from_file, export_json_to_file
from .helpers.db_engine import SQLiteDBEngine

from .models.gtfs_static_db import Route as RouteDB
from .models.gtfs_static_db import Trip as TripDB

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
            route_db_json_cleaned = {k: v for k, v in route_db_json.items() if k in RouteDB.__annotations__}
            self.map_routes[route_id] = RouteDB(**route_db_json_cleaned)        
        
        gtfs_trips_db = self._load_gtfs_table('trips', map_by_field='trip_id')
        self.map_trips: dict[str, TripDB] = {}
        for trip_id, trip_db_json in gtfs_trips_db.items():
            trip_db_json_cleaned = {k: v for k, v in trip_db_json.items() if k in TripDB.__annotations__}
            self.map_trips[trip_id] = TripDB(**trip_db_json_cleaned)
            # Dont use Trip because is slower init
            # self.map_trips[trip_id] = Trip.init_from_db_row(trip_db_json, gtfs_calendar_db, gtfs_agency_db, gtfs_routes_db, gtfs_stops_db)
        
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
