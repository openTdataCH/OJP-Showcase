import os, sys
import glob
from pathlib import Path

import time

from inc.shared.inc.helpers.config_helpers import load_convenience_config
from inc.shared.inc.helpers.hrdf_helpers import compute_formatted_date_from_hrdf_folder_path, compute_hrdf_db_filename, compute_formatted_date_from_hrdf_db_path

def main():
    script_path = Path(os.path.realpath(__file__))
    app_config = load_convenience_config(script_path)

    _fetch_latest_resource(script_path, 'hrdf_5_4')
    hrdf_data_path = _check_latest_data_folder(app_config)
    hrdf_db_path = _db_import(app_config, script_path, hrdf_data_path)
    _hrdf_check_duplicates(script_path, hrdf_db_path)
    _hrdf_build_aggregated_duplicates(script_path)
    _hrdf_generate_lookups(script_path, hrdf_db_path)
    
def _fetch_latest_resource(script_path, package_key):
    # fetch latest archive
    ckan_fetch_cli_path = f'{script_path.parent}/../ckan-utils/fetch_package_cli.py'
    ckan_fetch_sh = f'python3 {ckan_fetch_cli_path} --package_key {package_key}'
    
    print('')
    print('STEP 1 - FETCH LATEST ARCHIVE')
    print(ckan_fetch_sh, flush=True)
    os.system(ckan_fetch_sh)

def _check_latest_data_folder(app_config):
    # check latest folder
    print('')
    print('STEP 2 - CHCEK LATEST FOLDER')
    hrdf_data_base_folder_path = app_config['data_paths']['hrdf-opentransportdata.swiss']
    resource_paths = glob.glob(f'{hrdf_data_base_folder_path}/*')
    resource_paths.sort(reverse=True)

    hrdf_data_path = None
    hrdf_day = None
    for resource_path in resource_paths:
        if not os.path.isdir(resource_path):
            continue

        resource_path = Path(resource_path)
        hrdf_day = compute_formatted_date_from_hrdf_folder_path(resource_path.name)
        if hrdf_day is None:
            continue

        hrdf_data_path = resource_path
        break

    if hrdf_data_path is None:
        print(f'ERROR - cant find a new HRDF folder data in {hrdf_data_base_folder_path}')
        sys.exit()

    print(f'=> found {hrdf_data_path}')
    print(f'=> HRDF day {hrdf_day}')
    
    return hrdf_data_path

def _db_import(app_config, script_path, hrdf_data_path):
    hrdf_day = compute_formatted_date_from_hrdf_folder_path(hrdf_data_path)
    hrdf_dbs_path = app_config['data_paths']['hrdf-dbs']
    hrdf_db_filename = compute_hrdf_db_filename(hrdf_day)
    hrdf_db_path = f'{hrdf_dbs_path}/{hrdf_db_filename}'

    print(f'')
    print(f'STEP 3 - IMPORT HRDF into DB')
    print(f'HRDF PATH       : {hrdf_data_path}')
    print(f'HRDF DB PATH    : {hrdf_db_path}')

    if os.path.isfile(hrdf_db_path):
        print(f'DB already present at path')
        print(f'=> {hrdf_db_path}')
    else:
        hrdf_import_cli_path = f'{script_path.parent}/../hrdf-db-importer/hrdf_db_importer_cli.py'
        hrdf_import_sh = f'python3 {hrdf_import_cli_path} --hrdf-folder-path {hrdf_data_path}'
        print(hrdf_import_sh, flush=True)
        os.system(hrdf_import_sh)

    return hrdf_db_path

def _hrdf_check_duplicates(script_path, hrdf_db_path):
    hrdf_day = compute_formatted_date_from_hrdf_db_path(hrdf_db_path)

    hrdf_duplicates_tool_folder_path = f'{script_path.parent}/../hrdf-check-duplicates'
    hrdf_duplicates_config = load_convenience_config(hrdf_duplicates_tool_folder_path)

    hrdf_duplicates_report_path: str = hrdf_duplicates_config['report_paths']['hrdf_duplicates_report_path']
    hrdf_duplicates_report_path = hrdf_duplicates_report_path.replace('[HRDF_YMD]', hrdf_day)

    print(f'')
    print(f'STEP 4 - CHECK HRDF duplicates')
    print(f'HRDF DB PATH            : {hrdf_db_path}')
    print(f'DUPLICATES JSON PATH    : {hrdf_duplicates_report_path}')

    if os.path.isfile(hrdf_duplicates_report_path):
        print(f'Report already present at path')
        print(f'=> {hrdf_duplicates_report_path}')
    else:
        tool_cli_path = f'{hrdf_duplicates_tool_folder_path}/hrdf_check_duplicates_cli.py'
        tool_cli_sh = f"python3 {tool_cli_path} \\\n  --hrdf-db-path {hrdf_db_path}"
        print(tool_cli_sh, flush=True)
        os.system(tool_cli_sh)

def _hrdf_build_aggregated_duplicates(script_path):
    print(f'')
    print(f'STEP 5 - BUILD HRDF CSV duplicates report')

    hrdf_duplicates_tool_folder_path = f'{script_path.parent}/../hrdf-check-duplicates'
    hrdf_duplicates_config = load_convenience_config(hrdf_duplicates_tool_folder_path)

    report_csv_all_path = hrdf_duplicates_config['report_paths']['consolidate_hrdf_duplicates_report_path']
    report_csv_all_path = report_csv_all_path.replace('[AGENCY_ID]', 'ALL')

    run_cli = True
    if os.path.isfile(report_csv_all_path):
        report_csv_all_mtime = os.path.getmtime(report_csv_all_path)
        now_ts = time.time()
        
        # 60 minutes
        if (now_ts - report_csv_all_mtime) < (60 * 60):
            run_cli = False

    if run_cli:
        tool_cli_path = f'{hrdf_duplicates_tool_folder_path}/hrdf_build_consolidated_report_cli.py'
        tool_cli_sh = f"python3 {tool_cli_path}"
        print(tool_cli_sh, flush=True)
        os.system(tool_cli_sh)
    else:
        print(f'Report already present at path and not too old')
        print(f'=> {report_csv_all_path}')

def _hrdf_generate_lookups(script_path, hrdf_db_path):
    tool_cli_folder_path = f'{script_path.parent}/../hrdf-db-importer'

    print(f'')
    print(f'STEP 6 - GENERATE HRDF DB lookups')
    print(f'HRDF DB PATH            : {hrdf_db_path}')

    # No need to do extra checks for the file existance because the generation is fast

    tool_cli_path = f'{tool_cli_folder_path}/hrdf_db_lookups_generator_cli.py'
    tool_cli_sh = f"python3 {tool_cli_path} \\\n  --hrdf-db-path {hrdf_db_path}"
    print(tool_cli_sh, flush=True)
    os.system(tool_cli_sh)

if __name__ == "__main__":
    main()
