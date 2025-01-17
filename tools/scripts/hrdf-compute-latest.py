import os, sys
import glob
from pathlib import Path

import time

from inc.shared.inc.helpers.config_helpers import load_convenience_config
from inc.shared.inc.helpers.json_helpers import load_json_from_file
from inc.shared.inc.helpers.hrdf_helpers import compute_formatted_date_from_hrdf_folder_path, compute_hrdf_db_filename, compute_formatted_date_from_hrdf_db_path
from inc.shared.inc.models.ckan_data import CKAN_Data

from inc.common import PYTHON_PATH, fetch_latest_resource, check_latest_data_folder

def main():
    script_path = Path(os.path.realpath(__file__))
    app_config = load_convenience_config(script_path)
    
    package_id = app_config['current_package_ids']['hrdf']
    
    print('START ./tools/scripts/hrdf-compute-latest.py')
    print()
    print('Resources:')
    print(f'    - https://data.opentransportdata.swiss/en/dataset/{package_id}')
    print('  - https://tools.odpch.ch/hrdf-dbs/hrdf-dbs.json')
    print('')

    fetch_latest_resource(script_path, package_id)
    hrdf_data_path = check_latest_data_folder(app_config, package_id)

    hrdf_db_path = _db_import(app_config, script_path, hrdf_data_path)
    _dbs_aggregate(script_path)
    _hrdf_check_duplicates(script_path, hrdf_db_path)
    _hrdf_build_aggregated_duplicates(script_path)
    _hrdf_generate_lookups(script_path, hrdf_db_path)

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
        print()
        print(f'$ {hrdf_import_sh}', flush=True)
        print()
        os.system(hrdf_import_sh)

    return hrdf_db_path

def _dbs_aggregate(script_path):
    print(f'')
    print(f'STEP 4 - BUILD HRDF DB catalog')
    
    cli_path = f'{script_path.parent}/../hrdf-db-importer/cli_aggregate_dbs.py'
    cli_sh = f'{PYTHON_PATH} {cli_path}'
    print()
    print(f'$ {cli_sh}', flush=True)
    print()
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
        print()
        print(f'$ {tool_cli_sh}', flush=True)
        print()
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
        print()
        print(f'$ {tool_cli_sh}', flush=True)
        print()
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
    print()
    print(f'$ {tool_cli_sh}', flush=True)
    print()
    os.system(tool_cli_sh)
    
if __name__ == "__main__":
    main()
