import os, sys

from typing import List

from pathlib import Path
import sqlite3
import csv

from datetime import datetime
import time

from lxml import html

from .helpers.bundle_helpers import load_resource_from_bundle
from .helpers.config_helpers import load_yaml_config
from .helpers.db_engine import SQLiteDBEngine
from .helpers.http_helpers import download_file
from .helpers.json_helpers import load_json_from_file, export_json_to_file
from .helpers.log_helpers import log_message

from .models.gtfs_static_db_catalog import GTFS_Static_Catalog_Report

class AtlasLookupLinesController:
    def __init__(self, app_path: Path):
        config_path = Path(f'{app_path}/config/config.yml')
        self.app_config = load_yaml_config(config_path, app_path=app_path)
        
        self.map_sql: dict[str, str] = {}
        for key, _ in self.app_config['map_sql_paths'].items():
            self.map_sql[key] = load_resource_from_bundle(self.app_config['map_sql_paths'], key)
        
        gtfs_dbs_catalog_path = self.app_config['resource_paths']['gtfs_dbs_catalog_path']
        gtfs_dbs_catalog_json = load_json_from_file(gtfs_dbs_catalog_path)
        gtfs_dbs_catalog = GTFS_Static_Catalog_Report.from_json(gtfs_dbs_catalog_json)
        
        gtfs_db_item = gtfs_dbs_catalog.compute_latest_item()
        if (gtfs_db_item is None) or (gtfs_db_item.db_relative_path is None):
            print('ERROR - cant read latest item from GTFS catalog')
            print(gtfs_dbs_catalog_path)
            sys.exit(1)
        
        gtfs_db_path_s: str = self.app_config['resource_paths']['gtfs_db_path']
        gtfs_db_path_s = gtfs_db_path_s.replace('[GTFS_DB_FILENAME]', gtfs_db_item.db_relative_path)
        gtfs_db_path = Path(gtfs_db_path_s)
        
        self.db_engine = SQLiteDBEngine(gtfs_db_path)
        self.map_stops: dict[str, str] = self.db_engine.query_table('stops', map_by_field='stop_id')
        
    def process(self):
        map_atlas_oev_report_json = self._load_atlas_oev_report()
        
        csv_result_rows = []
        
        atlas_csv_rows = self._load_atlas_csv_rows()
        log_message(f'... loading latest Atlas, found {len(atlas_csv_rows)} rows')
        
        for csv_row in atlas_csv_rows:
            slnid = csv_row['slnid']
            
            row_idx = len(csv_result_rows)
            if row_idx % 500 == 0:
                log_message(f'... parsing {row_idx}/{len(atlas_csv_rows)} rows. slnid: {slnid}')
            
            if slnid in map_atlas_oev_report_json:
                csv_result_row = map_atlas_oev_report_json[slnid]
                csv_result_rows.append(csv_result_row)
                continue
            # if/else check in cache
            
            oev_id_file = self._fetch_oev_id_file(csv_row)
            
            oev_stop_names = None
            gtfs_route_id = None
            gtfs_trip_stop_names = None
            
            match_status = 'ERROR_NO_OEV_FILE'
            
            if oev_id_file is not None:
                file_stop_names = self._extract_stop_names(f'{oev_id_file}')
                oev_stop_names = ' - '.join(file_stop_names)
                
                db_trip = self._match_gtfs_trip(file_stop_names)
                
                if db_trip:
                    gtfs_route_id = db_trip['route_id']
                
                    trip_id = db_trip['trip_id']
                    gtfs_trip_stop_names = self._compute_trip_stop_times(trip_id)
                
                    match_status = 'OK_TRIP'
                else:
                    match_status = 'ERROR_NO_GTFS_TRIP'
            # oev_id_file exists
                
            csv_result_row = {
                'slnid': slnid,
                'businessOrganisation': csv_row['businessOrganisation'],
                'swissLineNumber': csv_row['swissLineNumber'],
                'number': csv_row['number'],
                'description': csv_row['description'],
                'oev_stop_names': oev_stop_names,
                'gtfs_route_id': gtfs_route_id,
                'gtfs_trip_stop_names': gtfs_trip_stop_names,
                'status': match_status,
            }
            csv_result_rows.append(csv_result_row)
        # loop CSV rows
        
        if len(csv_result_rows) == 0:
            print('ERORR: no rows to save')
            sys.exit(1)
            
        self._save_report_csv(csv_result_rows)
        self._save_report_json(csv_result_rows)
        
        log_message('... DONE: process extract OEV data')
        
    def _load_atlas_oev_report(self):
        map_atlas_oev_report_json = {}
        
        report_path = Path(self.app_config['oev_ch']['atlas_oev_report_json_path'])
        if not os.path.isfile(report_path):
            return map_atlas_oev_report_json
        
        report_json = load_json_from_file(report_path)
        
        rows_no = len(report_json['rows'])
        log_message(f'... reading report JSON cache, found {rows_no} rows')
        
        for row in report_json['rows']:
            slnid = row['slnid']
            map_atlas_oev_report_json[slnid] = row
            
        return map_atlas_oev_report_json
    # process()
    
    # private
    
    def _load_atlas_csv_rows(self):
        csv_path = self.app_config['resource_paths']['atlas_csv_path']
        csv_file = open(csv_path, mode="r", encoding="utf-8-sig")
        
        csv_rows = []
    
        reader = csv.DictReader(csv_file, delimiter=";")
        for row in reader:
            csv_rows.append(row)
        
        csv_file.close()
        
        return csv_rows
    
    def _fetch_oev_id_file(self, row: dict):
        slnid = row['slnid']

        swissLineNumber = row['swissLineNumber']
        swissLineNumber_parts = swissLineNumber.split('.')
        swissLineNumber_cat = swissLineNumber_parts[0]
        
        if swissLineNumber_cat not in ['f', 'n', 'r']:
            # download only f(uni), n(avigation), r(outes) types
            # others are train routes which have multiple lines in the OEV detail / PDFs
            return None
        
        oev_id = '.'.join(swissLineNumber_parts[1:])
        
        if ':' in oev_id:
            # meta routes, ending in :K, ignore
            return None
        
        oev_request_year: str = self.app_config['oev_ch']['request_year']
        oev_request_year = oev_request_year.replace('[YEAR]', datetime.now().strftime('%Y'))

        slnid_filename = slnid.replace(':', '__')
        oev_id_file_path_s: str = self.app_config['oev_ch']['oev_fahrplan_detail_page_path']
        
        oev_id_file_path_s = oev_id_file_path_s.replace('[YEAR]', oev_request_year)
        oev_id_file_path_s = oev_id_file_path_s.replace('[SLNID_FILENAME]', slnid_filename)
        oev_id_file_path = Path(oev_id_file_path_s)
        
        if os.path.isfile(oev_id_file_path):
            return oev_id_file_path
        
        file_error_path = Path(f'{oev_id_file_path}.error.json')
        
        has_file = False
        if not os.path.isfile(file_error_path):
            url: str = self.app_config['oev_ch']['oev_fahrplan_detail_page_url']
            url = url.replace('[YEAR]', oev_request_year)
            url = url.replace('[OEV_ID]', oev_id)
            
            log_message(f'... fetching {url} to {oev_id_file_path}')
            has_file = download_file(url, oev_id_file_path, check_if_exists=True)
            time.sleep(0.5)
        #
        
        if has_file:
            return oev_id_file_path
        else:
            if not os.path.isfile(file_error_path):
                export_json_to_file(dict(row), file_error_path, pretty_print=True)
            return None
        #
    # _fetch_oev_id_file()
    
    def _extract_stop_names(self, oev_id_file_path: str):
        oev_id_file = open(oev_id_file_path, 'r', encoding='utf-8')
        
        oev_html = html.fromstring(oev_id_file.read())
        
        # <div class="stop-row flex justify-between">
        stop_links = oev_html.xpath('//div[contains(@class, "stop-row")]/a') 
        
        # unfortunately this is in the data
        # https://www.oev-info.ch/de/fahrplan-aktuell/fahrplanfelder/2025-2615
        # if len(stop_links) < 2:
        #     print(f'ERROR: 0 or 1 stop names found')
        #     print(oev_id_file_path)
        #     print()
        #     sys.exit(1)
            
        file_stop_names: List[str] = []
            
        for stop_link in stop_links:
            file_stop_names.append(stop_link.text.strip())
        #
        
        oev_id_file.close()

        return file_stop_names
    
    def _match_gtfs_trip(self, file_stop_names: List[str]):
        if len(file_stop_names) < 2:
            return None
        
        sql = self.map_sql['query_trips_filter_stop_names']
        
        filter_stop_names = list(
            map(lambda el: f"stop_name = '{escape_sql_single_quotes(el)}'", file_stop_names)
        )
        sql_where_stop_names = ' OR '.join(filter_stop_names)
                                        
        sql = sql.replace('[STOP_NAMES_WHERE]', sql_where_stop_names)
        
        try:
            trip_rows = self.db_engine.query(sql)
        except sqlite3.Error as e:
            print("SQL error:", e)
            print('========================================')
            print(sql)
            sys.exit(1)
            
        stops_matches_no_max = 0
        matched_trip = None
        
        for row in trip_rows:
            stops_matches_no = 0
            stop_times_parts = row['stop_times_s'].split(' -- ')
            for stop_time_s in stop_times_parts:
                stop_time_parts = stop_time_s.split('|')

                stop_id = stop_time_parts[0]
                stop_name = self.map_stops[stop_id]['stop_name']
                
                if stop_name in file_stop_names:
                    stops_matches_no += 1

            if stops_matches_no > stops_matches_no_max:
                stops_matches_no_max = stops_matches_no
                matched_trip = row
        # loop trips SQL
        
        return matched_trip
    # _match_gtfs_trip()
    
    def _compute_trip_stop_times(self, trip_id: str):
        sql = self.map_sql['query_trip_stop_names']
        sql = sql.replace('[TRIP_ID]', trip_id)
        
        stop_time_rows = self.db_engine.query(sql)
        stop_names: List[str] = []
        for row in stop_time_rows:
            stop_names.append(row['stop_name'])
            
        stop_names_s = ' - '.join(stop_names)
        
        return stop_names_s
        
    def _save_report_csv(self, csv_rows):
        if len(csv_rows) == 0:
            print('ERORR: no rows to save')
            sys.exit()
    
        csv_path = self.app_config['oev_ch']['atlas_oev_report_csv_path']
        
        csv_file = open(csv_path, mode='w', encoding='utf-8')
        
        fieldnames = csv_rows[0].keys()
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(csv_rows)
        
        csv_file.close()
        log_message(f'... saved report to {csv_path}')
        
    def _save_report_json(self, csv_rows):
        report_dt_s = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        result_json = {
            'metadata': {
                'created': report_dt_s,
                'rows': len(csv_rows),
            },
            'rows': csv_rows,
        }
        
        json_path = self.app_config['oev_ch']['atlas_oev_report_json_path']
        export_json_to_file(result_json, json_path, pretty_print=True)
        
        log_message(f'... saved report to {json_path}')
    # _save_report_json()

def escape_sql_single_quotes(s: str):
    s = s.replace("'", "''")
    return s
