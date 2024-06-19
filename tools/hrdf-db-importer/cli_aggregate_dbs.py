import os
import sys
from pathlib import Path

from typing import Dict, List
from datetime import datetime

from inc.HRDF_Parser.shared.inc.helpers.config_helpers import load_convenience_config
from inc.HRDF_Parser.shared.inc.models.ckan_data import CKAN_Data, CKAN_Resource
from inc.HRDF_Parser.shared.inc.models.hrdf_db_catalog import HRDF_Catalog_Report, HRDF_Catalog_Item, HRDF_Catalog_Metadata
from inc.HRDF_Parser.shared.inc.helpers.gtfs_helpers import compute_date_from_gtfs_db_filename

from inc.HRDF_Parser.shared.inc.helpers.json_helpers import export_json_to_file, load_json_from_file
from inc.HRDF_Parser.shared.inc.helpers.hrdf_helpers import compute_hrdf_dt_from_resource_path
from inc.HRDF_Parser.shared.inc.helpers.db_engine import SQLiteDBEngine

from inc.HRDF_Parser.shared.inc.helpers.log_helpers import log_message

def main():
    script_path = Path(os.path.realpath(__file__))
    app_config = load_convenience_config(script_path)
    
    _process(app_config)

def _scan_local_dbs(app_config: any) -> Dict[str, Path]:
    map_local_dbs = {}
    
    hrdf_dbs_base_path = Path(app_config['hrdf_dbs_base_path'])
    hrdf_db_paths = hrdf_dbs_base_path.rglob('hrdf_*.sqlite')
    
    for hrdf_db_path in hrdf_db_paths:
        hrdf_db_lock_path = Path(f'{hrdf_db_path}.lock')
        if os.path.isfile(hrdf_db_lock_path):
            continue
        
        # semantically is wrong but the filename logic is the same
        hrdf_db_date = compute_date_from_gtfs_db_filename(hrdf_db_path.name)
        if hrdf_db_date is None:
            print('ERROR - cant extract day from filename')
            print(hrdf_db_path.name)
            sys.exit(1)
            
        hrdf_day = hrdf_db_date.strftime('%Y-%m-%d')
        
        relative_path = hrdf_db_path.relative_to(hrdf_dbs_base_path)
        
        map_local_dbs[hrdf_day] = relative_path
        
    return map_local_dbs

def _load_ckan_data(app_config: any) -> List[CKAN_Resource]:
    ckan_json_path = app_config['hrdf_ckan_json_path']
    ckan_json = load_json_from_file(ckan_json_path)
    hrdf_ckan = CKAN_Data.from_ckan_json(ckan_json)
    
    return hrdf_ckan.result.resources

def _compute_map_hrdf_catalog(app_config) -> Dict[str, HRDF_Catalog_Item]:
    hrdf_catalog_json_path = app_config['hrdf_dbs_json_path']
    
    map_hrdf_catalog_items = {}
    
    if not os.path.isfile(hrdf_catalog_json_path):
        return map_hrdf_catalog_items
    
    hrdf_catalog_json = load_json_from_file(hrdf_catalog_json_path)
    hrdf_catalog = HRDF_Catalog_Report.from_json(hrdf_catalog_json)
    for hrdf_catalog_item in hrdf_catalog.items:
        hrdf_db_day = hrdf_catalog_item.hrdf_day
        map_hrdf_catalog_items[hrdf_db_day] = hrdf_catalog_item
    
    return map_hrdf_catalog_items
    
def _process(app_config: any):
    map_hrdf_catalog = _compute_map_hrdf_catalog(app_config)
    map_local_dbs = _scan_local_dbs(app_config)
    ckan_data = _load_ckan_data(app_config)

    hrdf_dbs_base_path = Path(app_config['hrdf_dbs_base_path'])
    
    # loop through all CKAN resources and create new HRDF_Catalog_Item objects if needed
    for ckan_resource in ckan_data:
        hrdf_dt = compute_hrdf_dt_from_resource_path(ckan_resource.identifier)
        if hrdf_dt is None:
            print(f'ERROR - cant extract HRDF dt from resource: {ckan_resource.identifier}')
            sys.exit(1)
            
        hrdf_day_f = hrdf_dt.strftime('%Y-%m-%d')
        if hrdf_day_f in map_hrdf_catalog:
            continue
        
        hrdf_day_dt = datetime(hrdf_dt.year, hrdf_dt.month, hrdf_dt.day)
        hrdf_dt_age = round((hrdf_dt.timestamp() - hrdf_day_dt.timestamp()) / (3600 * 24), 2)
        if hrdf_dt_age > 1.0:
            error_message = f'ERROR - {hrdf_day_f} - HRDF DT age too high: {hrdf_dt_age}'
            print(ckan_resource)
            raise Exception(error_message)
        
        hrdf_db_relative_path = map_local_dbs.get(hrdf_day_f, None)
        hrdf_dt_f = hrdf_dt.strftime('%Y-%m-%d %H:%M:%S')

        hrdf_catalog_item = HRDF_Catalog_Item(
            hrdf_datetime_s=hrdf_dt_f,
            hrdf_day=hrdf_day_f,
            table_stats={}, # compute them in the next loop
            db_relative_path=hrdf_db_relative_path,
        )
        
        map_hrdf_catalog[hrdf_day_f] = hrdf_catalog_item
    # loop ckan_resource in ckan_data
    
    # loop through all catalog items and validate if DB file is present locally
    for hrdf_day_f, hrdf_catalog_item in map_hrdf_catalog.items():
        hrdf_db_relative_path = map_local_dbs.get(hrdf_day_f, None)
        if hrdf_db_relative_path is None:
            hrdf_catalog_item.db_relative_path = None
        else:
            hrdf_catalog_item.db_relative_path = f'{hrdf_db_relative_path}' # format otherwise JSON encoder will scream
        
        # compute stats only if necessary
        if hrdf_catalog_item.table_stats == {} and hrdf_db_relative_path is not None:
            hrdf_db_path = f'{hrdf_dbs_base_path}/{hrdf_db_relative_path}'
            hrdf_db_engine = SQLiteDBEngine(hrdf_db_path)
            hrdf_catalog_item.table_stats = hrdf_db_engine.compute_table_stats()
    
    # build a list and sort descending by hrdf_day
    hrdf_catalog_items = list(map_hrdf_catalog.values())
    hrdf_catalog_items = sorted(hrdf_catalog_items, key=lambda x: x.hrdf_day, reverse=True)
    
    now_f = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    metadata = HRDF_Catalog_Metadata(
        comment=f'Created at {now_f}',
        last_update=now_f,
    )
    hrdf_catalog = HRDF_Catalog_Report(metadata, items=hrdf_catalog_items)
    
    hrdf_catalog_path = app_config['hrdf_dbs_json_path']
    hrdf_catalog_json = hrdf_catalog.as_json()
    export_json_to_file(hrdf_catalog_json, hrdf_catalog_path, pretty_print=True)
    
    log_message(f'... saved to {hrdf_catalog_path}')    
    
if __name__ == "__main__":
    main()
