import os, sys

from pathlib import Path

import re

from typing import Union

from datetime import datetime

import gzip
import shutil

from .helpers.config_helpers import load_yaml_config
from .helpers.gtfs_helpers import compute_gtfs_db_filename
from .helpers.json_helpers import load_json_from_file, export_json_to_file
from .helpers.log_helpers import log_message

from .models.gtfs_static_db_catalog import GTFS_Static_Catalog_Report, GTFS_Static_Catalog_Item
from .models.gtfs_rt import GTFS_RT_Response
from .models.gtfs_rt_static_report import GTFS_RT_Static_Report, GTFS_RT_Static_Report_Metadata

from .gtfs_db import GTFS_DB

from .fetch import fetch_latest, compute_resource_snapshot_path

class GTFS_Controller:
    def __init__(self, app_path: Path):
        config_path = f'{app_path}/config/config.yml'
        self.app_config = load_yaml_config(config_path, app_path=app_path)
        
        gtfs_dbs_report_path = self.app_config['resource_paths']['gtfs_dbs_json_path']
        gtfs_dbs_report_json = load_json_from_file(gtfs_dbs_report_path)
        self.gtfs_dbs_report = GTFS_Static_Catalog_Report.from_json(gtfs_dbs_report_json)
        
    def compare_latest_gtfs_rt_static(self):
        self._compare_compare_latest_gtfs_rt_static()
        
    def load_gtfs_db(self, gtfs_catalog_item: GTFS_Static_Catalog_Item):
        return self._load_gtfs_db(gtfs_catalog_item)
    
    def compare_gtfs_rt_from_file(self, gtfs_rt_file_dt: datetime, gtfs_rt_path: Path, gtfs_catalog_item: GTFS_Static_Catalog_Item, gtfs_db: GTFS_DB):
        self._compare_gtfs_rt_from_file(gtfs_rt_file_dt, gtfs_rt_path, gtfs_catalog_item, gtfs_db)
        
    def compute_gtfs_db_dt(self, dt: datetime):
        return self._compute_gtfs_db_catalog_item(dt)
        
    # PRIVATE
    def _compare_compare_latest_gtfs_rt_static(self):
        header_separator_s = '-' * 60
        
        print(header_separator_s)
        log_message(f'START COMPARE GTFS -RT GTFS STATIC')
        print(header_separator_s)
        
        fetch_dt = datetime.now()
        
        log_message(f'... START fetch GTFS-RT')
        log_message(f'... TS REQUEST    : {fetch_dt}')
        
        resource_path = self.app_config['resource_paths']['gtfs_rt_snapshot']
        gtfs_rt_snapshot_path = compute_resource_snapshot_path(resource_path, fetch_dt)
        
        gtfs_rt_response = fetch_latest(self.app_config, gtfs_rt_snapshot_path)
        log_message(f'... DONE fetch')
        print(f'saved to {gtfs_rt_snapshot_path}')
        print(header_separator_s)
        
        gtfs_rt_dt = datetime.fromtimestamp(gtfs_rt_response.header.timestamp)
        gtfs_catalog_item = self._compute_gtfs_db_catalog_item(gtfs_rt_dt)
        if gtfs_catalog_item is None:
            print('WHOOPS - cant find a GTFS catalog item')
            sys.exit(1)
            
        log_message(f'... LOAD DB GTFS-DAY: {gtfs_catalog_item.gtfs_day} - {gtfs_catalog_item.db_relative_path}')
            
        gtfs_db = self._load_gtfs_db(gtfs_catalog_item)
        
        log_message(f'... DONE LOAD DB')
        print(header_separator_s)
        
        report = self._compare_file_gtfs_rt_static(
            fetch_dt,  
            gtfs_rt_snapshot_path, gtfs_rt_response, 
            gtfs_catalog_item, gtfs_db
        )
        
        print()
        print(header_separator_s)
        log_message('GTFS-RT <-> GTFS-STATIC Report')
        print(header_separator_s)
        print(f'GTFS-RT age         : {report.metadata.gtfs_rt_age} seconds')
        print(f'GTFS-static DB age  : {report.metadata.gtfs_db_age} days')
        print()
        print(f'rows no             : {report.metadata.total_rows_no}')
        print(f'trips OK            : {report.metadata.tripOK_routeOK_no}')
        print()
        print(f'tripOK_routeNOK_no  : {report.metadata.tripOK_routeNOK_no}')
        print(f'tripNOK_routeOK_no  : {report.metadata.tripNOK_routeOK_no}')
        print(f'tripNOK_routeNOK_no : {report.metadata.tripNOK_routeNOK_no}')
        print(f'tripNOK_NOJP_no     : {report.metadata.tripNOK_NOJP_no}')
        print()
        
        report_path = self.app_config['resource_paths']['gtfs_rt_static_report']
        report_path = compute_resource_snapshot_path(report_path, fetch_dt)
        
        dt_year = fetch_dt.strftime('%Y')
        dt_month = fetch_dt.strftime('%m')
        dt_day = fetch_dt.strftime('%d')
        report_url = f'https://tools.odpch.ch/gtfs-rt-static-compare-report/{dt_year}/{dt_month}/{dt_day}/{report_path.name}';
        print(f'Report URL          : {report_url}')
        print(header_separator_s)
        
        print(f'... saved to {report_path}')
        print(header_separator_s)
        
        print(f'... cleaning up, gzip resource')
        self._cleanup_resource(gtfs_rt_snapshot_path)
        
        log_message('... DONE')
        
    def _load_gtfs_db(self, gtfs_catalog_item: GTFS_Static_Catalog_Item):
        gtfs_dbs_basepath = Path(self.app_config['resource_paths']['gtfs_db']).parent
        gtfs_db_path = Path(f'{gtfs_dbs_basepath}/{gtfs_catalog_item.db_relative_path}')
            
        if not os.path.isfile(gtfs_db_path):
            print('WHOOPS - cant find DB at path')
            print(gtfs_db_path)
            return None

        gtfs_db = GTFS_DB(db_path=gtfs_db_path, resources_path_config=self.app_config['resource_paths'])
        gtfs_db.init_lookups()
        
        return gtfs_db
    
    def _compare_gtfs_rt_from_file(self, gtfs_rt_file_dt: datetime, gtfs_rt_path: Path, gtfs_catalog_item: GTFS_Static_Catalog_Item, gtfs_db: GTFS_DB):
        gtfs_rt_json = load_json_from_file(gtfs_rt_path)
        gtfs_rt_response = GTFS_RT_Response.from_gtfs_rt_json(gtfs_rt_json)
        
        self._compare_file_gtfs_rt_static(
            gtfs_rt_file_dt, gtfs_rt_path, gtfs_rt_response,
            gtfs_catalog_item,
            gtfs_db
        )
        
    def _compute_gtfs_db_catalog_item(self, dt: datetime) -> Union[GTFS_Static_Catalog_Item, None]:
        found_gtfs_db_item: Union[GTFS_Static_Catalog_Item, None] = None
        for gtfs_db_item in self.gtfs_dbs_report.items:
            # because the GTFS-RT is switch later, we need to use the switch time
            gtfs_rt_switch_dt = datetime.strptime(gtfs_db_item.gtfs_rt_switch_datetime_s, '%Y-%m-%d %H:%M')
            
            # the request is for an older DB, ignore the DBs in the future
            if gtfs_rt_switch_dt.timestamp() > dt.timestamp():
                continue
            
            # ignore DBs that are not on disk
            if gtfs_db_item.db_relative_path is None:
                continue
            
            found_gtfs_db_item = gtfs_db_item
            break # on first item
        # loop GTFS DB catalog items
        
        return found_gtfs_db_item
    
    def _compare_file_gtfs_rt_static(self, 
            report_dt: datetime, gtfs_rt_path: Path, gtfs_rt_response: GTFS_RT_Response, 
            gtfs_catalog_item: GTFS_Static_Catalog_Item,
            gtfs_db: GTFS_DB,
        ):
        gtfs_rt_dt = datetime.fromtimestamp(gtfs_rt_response.header.timestamp)
        
        gtfs_static_day = gtfs_catalog_item.gtfs_day
        gtfs_rt_age = round(gtfs_rt_dt.timestamp() - report_dt.timestamp())
        
        gtfs_db_dt = datetime.strptime(gtfs_catalog_item.gtfs_datetime_s, '%Y-%m-%d %H:%M')
        gtfs_db_age = round((gtfs_rt_dt.timestamp() - gtfs_db_dt.timestamp()) / (3600 * 24), 2)
        
        report_metdata = GTFS_RT_Static_Report_Metadata(
            report_dt=report_dt,
            gtfs_db_filename=compute_gtfs_db_filename(gtfs_static_day),
            gtfs_db_age=gtfs_db_age,
            
            gtfs_rt_filename=gtfs_rt_path.name,
            gtfs_rt_ts=round(gtfs_rt_dt.timestamp()),
            gtfs_rt_dt=gtfs_rt_dt,
            gtfs_rt_age=gtfs_rt_age,
    
            total_rows_no=0,
            tripOK_routeOK_no=0,
            tripOK_routeNOK_no=0,
            tripNOK_routeOK_no=0,
            tripNOK_routeNOK_no=0,
            tripNOK_NOJP_no=0
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
            
            # match tripId that DOESNT start with 'ojp:' 'atv:'
            special_trip_id_matches = trip_id.startswith('ojp') or trip_id.startswith('atv')
            if not trip_OK and not special_trip_id_matches:
                report_stats.metadata.tripNOK_NOJP_no += 1
        # loop entity
        
        report_path = self.app_config['resource_paths']['gtfs_rt_static_report']
        report_path = compute_resource_snapshot_path(report_path, report_dt)
        report_json = report_stats.as_json()
        export_json_to_file(report_json, report_path, pretty_print=True)

        return report_stats
    # _compare_file_gtfs_rt_static
    
    # keep a GZIP version of the snapshot
    def _cleanup_resource(self, resource_path):
        gzip_path = f'{resource_path}.gz'
        
        with open(resource_path, 'rb') as f_in:
            with gzip.open(gzip_path, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        # with
        
        os.remove(resource_path)
