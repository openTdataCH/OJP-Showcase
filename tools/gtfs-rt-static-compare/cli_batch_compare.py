import os, sys

import re
import argparse

from pathlib import Path
from typing import Dict, List
from datetime import datetime

from compare_gtfs_rt_static.gtfs_controller import GTFS_Controller
from compare_gtfs_rt_static.gtfs_db import GTFS_DB
from compare_gtfs_rt_static.helpers.json_helpers import load_json_from_file
from compare_gtfs_rt_static.models.gtfs_rt import GTFS_RT_Response
from compare_gtfs_rt_static.helpers.log_helpers import format_path, log_message

file_match_regexp = r"GTFS_RT-([0-9]{4}-[0-9]{2}-[0-9]{2})-([0-9]{4})\."

def main():
    app_path = Path(os.path.realpath(__file__)).parent
    
    report_now = datetime.now()
    # default is current day
    report_date_filter = report_now.strftime('%Y-%m-%d')
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--filter', '--filter', default=report_date_filter)
    args = parser.parse_args()
    
    report_date_filter = args.filter

    gtfs_rt_snapshot_files_path = Path(f'{app_path}/data/gtfs-rt-snapshot')
    log_message(f"START batch processing snapshots")
    log_message(f"path                  : {format_path(f'{gtfs_rt_snapshot_files_path}', f'{app_path}')}")
    log_message(f'filter (starts with)  : GTFS_RT-{report_date_filter}')
    print()

    gtfs_rt_file_paths: List[Path] = []
    for gtfs_rt_file_path in gtfs_rt_snapshot_files_path.rglob('*.json*'):
        keep_file = False
        if gtfs_rt_file_path.name.startswith(f'GTFS_RT-{report_date_filter}'):
            keep_file = True
        if not keep_file:
            continue
        
        file_matches = re.match(file_match_regexp, gtfs_rt_file_path.name)
        if file_matches is None:
            continue
        
        gtfs_rt_file_paths.append(gtfs_rt_file_path)
    #
    gtfs_rt_file_paths.sort()

    gtfs_controller = GTFS_Controller(app_path)

    log_message(f'... found {len(gtfs_rt_file_paths)} files')
    print()

    file_idx = 0
    map_gtfs_dbs: Dict[str, GTFS_DB] = {}
    for gtfs_rt_file_path in gtfs_rt_file_paths:
        file_matches = re.match(file_match_regexp, gtfs_rt_file_path.name)
        if file_matches is None:
            continue
        
        file_date_f = file_matches[1]
        file_hhmm = file_matches[2]
        file_dt = datetime.strptime(f'{file_date_f} {file_hhmm}', '%Y-%m-%d %H%M')

        gtfs_rt_json = load_json_from_file(gtfs_rt_file_path)
        gtfs_rt_response = GTFS_RT_Response.from_gtfs_rt_json(gtfs_rt_json)

        feed_version = gtfs_rt_response.header.feedVersion
        gtfs_catalog_item = gtfs_controller.gtfs_dbs_report.lookup_by_feed_verson(feed_version)

        if gtfs_catalog_item is None:
            continue

        gtfs_day = gtfs_catalog_item.gtfs_day
        if gtfs_day not in map_gtfs_dbs:
            log_message(f'... loading GTFS DB for {gtfs_day}')
            gtfs_db = gtfs_controller.load_gtfs_db(gtfs_catalog_item)
            if gtfs_db is None:
                print(gtfs_catalog_item)
                raise ValueError(f'cant load DB {gtfs_day} for known catalog item')
            
            map_gtfs_dbs[gtfs_day] = gtfs_db
        # 
        gtfs_db = map_gtfs_dbs[gtfs_day]

        if file_idx % 10 == 0:
            log_message(f'... PROCESSING {file_idx} / {len(gtfs_rt_file_paths)}: {gtfs_rt_file_path.name}')
        gtfs_controller.compare_gtfs_rt_from_file(file_dt, gtfs_rt_file_path, gtfs_catalog_item, gtfs_db)

        file_idx += 1
    # loop files
    
    log_message('DONE LOOP')

if __name__ == "__main__":
    main()
