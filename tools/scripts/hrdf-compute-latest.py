import os, sys
import glob
from pathlib import Path

import time

from inc.shared.inc.helpers.config_helpers import load_convenience_config
from inc.shared.inc.helpers.json_helpers import load_json_from_file
from inc.shared.inc.helpers.hrdf_helpers import compute_formatted_date_from_hrdf_folder_path, compute_hrdf_db_filename, compute_formatted_date_from_hrdf_db_path
from inc.shared.inc.models.ckan_data import CKAN_Data

PYTHON_PATH = sys.executable
row_delimiter_s = '='*70

def main():
    script_path = Path(os.path.realpath(__file__))
    app_config = load_convenience_config(script_path)

    _fetch_latest_resource(script_path, 'hrdf_5_4')
    hrdf_data_path = _check_latest_data_folder(app_config)
    hrdf_db_path = _db_import(app_config, script_path, hrdf_data_path)
    _dbs_aggregate(script_path)
    _hrdf_check_duplicates(script_path, hrdf_db_path)
    _hrdf_build_aggregated_duplicates(script_path)
    _hrdf_generate_lookups(script_path, hrdf_db_path)
    
def _fetch_latest_resource(script_path, package_key):
    # fetch latest archive
    ckan_fetch_cli_path = f'{script_path.parent}/../ckan-utils/fetch_package_cli.py'
    ckan_fetch_sh = f'{PYTHON_PATH} {ckan_fetch_cli_path} --package_key {package_key}'
    
    print('START ./tools/scripts/hrdf-compute-latest.py')
    print()
    print('Resources:')
    print('  - https://opentransportdata.swiss/en/dataset/timetable-2024-gtfs2020')
    print('  - https://tools.odpch.ch/gtfs-static-dbs/gtfs-static-dbs.json')
    print('')
    
    print('STEP 1 - FETCH LATEST ARCHIVE')
    print(ckan_fetch_sh, flush=True)
    os.system(ckan_fetch_sh)

def _check_latest_data_folder(app_config):
    # check latest folder
    print('')
    print('STEP 2 - CHECK LATEST FOLDER')
    
    ckan_json_path = app_config['resource_paths']['ckan_hrdf_json']
    ckan_json = load_json_from_file(ckan_json_path)
    hrdf_ckan = CKAN_Data.from_ckan_json(ckan_json)
    
    ckan_resource = hrdf_ckan.result.resources[0]
    
    resources_base_folder_path = app_config['data_paths']['hrdf-opentransportdata.swiss']
    
    resource_folder_name = ckan_resource.title['en']
    # zip resources are unzipped in fetch, use the unzipped folder name
    resource_folder_name = resource_folder_name[0:-4]
    
    resource_path = Path(f'{resources_base_folder_path}/{resource_folder_name}')
    
    if not os.path.isdir(resource_path):
        print()
        print(row_delimiter_s)
        print('ERROR - latest resource not found at path')
        print(resource_path)
        print(row_delimiter_s)
        sys.exit(1)
        
    print(f'... use following resource: {resource_path}')
    
    return resource_path

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
        hrdf_import_sh = f'{PYTHON_PATH} {hrdf_import_cli_path} --hrdf-folder-path {hrdf_data_path}'
        print(hrdf_import_sh, flush=True)
        os.system(hrdf_import_sh)

    return hrdf_db_path

def _dbs_aggregate(script_path):
    print(f'')
    print(f'STEP 4 - BUILD HRDF DB catalog')
    
    cli_path = f'{script_path.parent}/../hrdf-db-importer/cli_aggregate_dbs.py'
    cli_sh = f'{PYTHON_PATH} {cli_path}'
    print(cli_sh, flush=True)
    os.system(cli_sh)

def _hrdf_check_duplicates(script_path, hrdf_db_path):
    hrdf_day = compute_formatted_date_from_hrdf_db_path(hrdf_db_path)

    hrdf_duplicates_tool_folder_path = f'{script_path.parent}/../hrdf-check-duplicates'
    hrdf_duplicates_config = load_convenience_config(hrdf_duplicates_tool_folder_path)

    hrdf_duplicates_report_path: str = hrdf_duplicates_config['report_paths']['hrdf_duplicates_report_path']
    hrdf_duplicates_report_path = hrdf_duplicates_report_path.replace('[HRDF_YMD]', hrdf_day)

    print(f'')
    print(f'STEP 5 - CHECK HRDF duplicates')
    print(f'HRDF DB PATH            : {hrdf_db_path}')
    print(f'DUPLICATES JSON PATH    : {hrdf_duplicates_report_path}')

    if os.path.isfile(hrdf_duplicates_report_path):
        print(f'Report already present at path')
        print(f'=> {hrdf_duplicates_report_path}')
    else:
        tool_cli_path = f'{hrdf_duplicates_tool_folder_path}/hrdf_check_duplicates_cli.py'
        tool_cli_sh = f"{PYTHON_PATH} {tool_cli_path} \\\n  --hrdf-db-path {hrdf_db_path}"
        print(tool_cli_sh, flush=True)
        os.system(tool_cli_sh)

def _hrdf_build_aggregated_duplicates(script_path):
    print(f'')
    print(f'STEP 6 - BUILD HRDF CSV duplicates report')

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
        tool_cli_sh = f"{PYTHON_PATH} {tool_cli_path}"
        print(tool_cli_sh, flush=True)
        os.system(tool_cli_sh)
    else:
        print(f'Report already present at path and not too old')
        print(f'=> {report_csv_all_path}')

def _hrdf_generate_lookups(script_path, hrdf_db_path):
    tool_cli_folder_path = f'{script_path.parent}/../hrdf-db-importer'

    print(f'')
    print(f'STEP 7 - GENERATE HRDF DB lookups')
    print(f'HRDF DB PATH            : {hrdf_db_path}')

    # No need to do extra checks for the file existance because the generation is fast

    tool_cli_path = f'{tool_cli_folder_path}/hrdf_db_lookups_generator_cli.py'
    tool_cli_sh = f"{PYTHON_PATH} {tool_cli_path} \\\n  --hrdf-db-path {hrdf_db_path}"
    print(tool_cli_sh, flush=True)
    os.system(tool_cli_sh)
    
if __name__ == "__main__":
    main()
