import os, sys

import re
import argparse

from pathlib import Path
from typing import Dict, List
from datetime import datetime

from compare_gtfs_rt_static.gtfs_controller import GTFS_Controller
from compare_gtfs_rt_static.models.gtfs_static_db_catalog import GTFS_Static_Catalog_Item
from compare_gtfs_rt_static.helpers.log_helpers import log_message

def main():
    app_path = Path(os.path.realpath(__file__)).parent
    
    report_now = datetime.now()
    report_ym = report_now.strftime('%Y-%m')
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--month', '--month', default=report_ym)
    args = parser.parse_args()
    
    report_ym = args.month

    gtfs_rt_snapshot_files_path = Path(f'{app_path}/data/gtfs-rt-snapshot')
    
    gtfs_rt_file_paths: List[Path] = []
    for gtfs_rt_file_path in gtfs_rt_snapshot_files_path.rglob('*.json'):
        gtfs_rt_file_paths.append(gtfs_rt_file_path)
    gtfs_rt_file_paths.sort()
    
    gtfs_controller = GTFS_Controller(app_path)
    
    map_db_catalog_items: Dict[str, GTFS_Static_Catalog_Item] = {}
    map_file_file_paths: Dict[str, Dict[str, Path]] = {}
    for gtfs_rt_file_path in gtfs_rt_file_paths:
        keep_file = False
        if gtfs_rt_file_path.name.startswith(f'GTFS_RT-{report_ym}'):
            keep_file = True
        if not keep_file:
            continue
        
        file_matches = re.match(r"GTFS_RT-([0-9]{4}-[0-9]{2}-[0-9]{2})-([0-9]{4})\.", gtfs_rt_file_path.name)
        if file_matches is None:
            continue
        
        file_date_f = file_matches[1]
        file_hhmm = file_matches[2]
        file_dt = datetime.strptime(f'{file_date_f} {file_hhmm}', '%Y-%m-%d %H%M')
        
        gtfs_catalog_item = gtfs_controller.compute_gtfs_db_dt(file_dt)
        gtfs_day = gtfs_catalog_item.gtfs_day
        
        if gtfs_day not in map_file_file_paths:
            map_file_file_paths[gtfs_day] = {}
            
        gtfs_rt_file_key = f'{file_date_f} {file_hhmm}'
            
        map_file_file_paths[gtfs_day][gtfs_rt_file_key] = gtfs_rt_file_path
        map_db_catalog_items[gtfs_day] = gtfs_catalog_item
    # loop files
    
    for gtfs_day, map_gtfs_rt_file_paths in map_file_file_paths.items():
        gtfs_catalog_item = map_db_catalog_items[gtfs_day]
        if gtfs_catalog_item.db_relative_path is None:
            continue
        
        log_message(f'GTFS DB DT {gtfs_day}')
        log_message(f'... START GTFS lookups')
        gtfs_db = gtfs_controller.load_gtfs_db(gtfs_catalog_item)
        log_message(f'... DONE')
        print()
        
        gtfs_rt_files_no = len(map_gtfs_rt_file_paths.keys())
        log_message(f'... {gtfs_rt_files_no} GTFS RT files')        

        file_idx = 0
        for gtfs_rt_file_key, gtfs_rt_file_path in map_gtfs_rt_file_paths.items():
            log_message(f'... PROCESSING {file_idx} / {gtfs_rt_files_no}: {gtfs_rt_file_path.name}')

            gtfs_rt_file_dt = datetime.strptime(f'{gtfs_rt_file_key}', '%Y-%m-%d %H%M')
            gtfs_controller.compare_gtfs_rt_from_file(gtfs_rt_file_dt, gtfs_rt_file_path, gtfs_catalog_item, gtfs_db)
            file_idx += 1
        # loop gtfs_rt files
        print()
            
        log_message('... DONE GTFS DB')
        print()
    # loop GTFS dbs
    
    log_message('DONE LOOP')

if __name__ == "__main__":
    main()
