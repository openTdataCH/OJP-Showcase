import os, sys

import re
import argparse
from datetime import datetime

from pathlib import Path

from typing import List, Dict

from compare_gtfs_rt_static.helpers.config_helpers import load_yaml_config
from compare_gtfs_rt_static.helpers.json_helpers import load_json_from_file, export_json_to_file
from compare_gtfs_rt_static.helpers.log_helpers import log_message

from compare_gtfs_rt_static.models.gtfs_rt_static_report import GTFS_RT_Static_Report, GTFS_RT_Static_Monthly_Report

def main():
    app_path = Path(os.path.realpath(__file__)).parent
    config_path = f'{app_path}/config/config.yml'
    
    app_config = load_yaml_config(config_path, app_path)
    report_template_path: str = app_config['resource_paths']['gtfs_rt_static_report']
    report_root_path = Path(report_template_path.split('[YEAR]/[MONTH]/[DAY]')[0])
    
    report_now = datetime.now()
    report_ym = report_now.strftime('%Y-%m')
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--month', '--month', default=report_ym)
    args = parser.parse_args()
    
    report_ym = args.month
    
    log_message(f'START aggregate reports for {report_ym}')
    
    report_month_parts = report_ym.split('-')
    report_year = report_month_parts[0]
    report_month = report_month_parts[1]
    
    report_month_part = Path(f'{report_root_path}/{report_year}/{report_month}')
    report_file_paths: List[Path] = []
    for gtfs_rt_report_path in report_month_part.rglob('*.json'):
        report_file_paths.append(gtfs_rt_report_path)
    report_file_paths.sort()
    
    map_report_days: Dict[str, Dict[str, GTFS_RT_Static_Report]] = {}
    for gtfs_rt_report_path in report_file_paths:
        gtfs_rt_report_json = load_json_from_file(gtfs_rt_report_path)
        gtfs_rt_report = GTFS_RT_Static_Report.from_json(gtfs_rt_report_json)
        
        file_matches = re.match(r"gtfs_rt_static_report-([0-9]{4})-([0-9]{2})-([0-9]{2})-([0-9]{2})([0-9]{2})", gtfs_rt_report_path.name)
        if file_matches is None:
            print('ERROR - unknown file pattern')
            print(gtfs_rt_report_path)
            sys.exit(1)
            
        report_day = file_matches[3]
        report_hhmm = file_matches[4] + file_matches[5]
        
        if report_day not in map_report_days:
            map_report_days[report_day] = {}
            
        map_report_days[report_day][report_hhmm] = gtfs_rt_report.metadata.as_json()
    # report_file_paths
    
    report_now_f = report_now.strftime('%Y-%m-%d %H:%M:%S')
    report_comments = f'generated {report_now_f} with {Path(__file__).name}'
    
    gtfs_rt_static_monthly_report = GTFS_RT_Static_Monthly_Report(
        comments=report_comments,
        report_days=map_report_days
    )
    
    report_path: str = app_config['resource_paths']['gtfs_rt_static_mo_json']
    report_path = report_path.replace('[YEAR]', report_year)
    report_path = report_path.replace('[MONTH]', report_month)
    
    export_json_to_file(gtfs_rt_static_monthly_report.as_json(), json_path=report_path, pretty_print=True)
    log_message(f'... saved {len(report_file_paths)} reports to {report_path}')
    
    log_message(f'... DONE')

if __name__ == "__main__":
    main()
