import os, sys

from datetime import datetime
from pathlib import Path

import requests

from .helpers.json_helpers import load_json_from_file, export_json_to_file
from .models.gtfs_rt import GTFS_RT_Response

def fetch_latest(app_config: dict, gtfs_rt_snapshot_path: Path):
    if not os.path.isdir(gtfs_rt_snapshot_path.parent):
        os.makedirs(gtfs_rt_snapshot_path.parent)
        
    gtfs_rt_response_json = _fetch_latest_gtfs_rt_resource(app_config, gtfs_rt_snapshot_path)
    gtfs_rt_response = GTFS_RT_Response.from_gtfs_rt_json(gtfs_rt_response_json)
    
    return gtfs_rt_response

def compute_resource_snapshot_path(resource_path: str, fetch_dt: datetime):
    dt_year = fetch_dt.strftime('%Y')
    dt_month = fetch_dt.strftime('%m')
    dt_day = fetch_dt.strftime('%d')
    dt_hhmm = fetch_dt.strftime('%H%M')
    
    resource_path = resource_path.replace('[YEAR]', dt_year)
    resource_path = resource_path.replace('[MONTH]', dt_month)
    resource_path = resource_path.replace('[DAY]', dt_day)
    resource_path = resource_path.replace('[HHMM]', dt_hhmm)
    
    return Path(resource_path)

def _fetch_latest_gtfs_rt_resource(app_config: dict, resource_path: Path):
    if os.path.isfile(resource_path):
        gtfs_rt_json = load_json_from_file(resource_path)
        return gtfs_rt_json
    
    url = app_config['opentransportdata']['gtfs_rt_url']
    api_key = app_config['opentransportdata']['key']
    
    http_headers = {
        'Authorization': f'Bearer {api_key}'
    }
    
    response = requests.get(url, headers=http_headers, timeout=10)
    if response.status_code != 200:
        print(f'ERROR - broken response fom {url}')
        print(response.text)
        sys.exit(1)
    
    # save it formatted
    response_json = response.json()
    export_json_to_file(response_json, resource_path, pretty_print=True)
    gtfs_rt_json = load_json_from_file(resource_path)
    
    return gtfs_rt_json
