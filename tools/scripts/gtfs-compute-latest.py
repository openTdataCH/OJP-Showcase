import os, sys

from pathlib import Path

from inc.shared.inc.helpers.config_helpers import load_convenience_config
from inc.shared.inc.helpers.json_helpers import load_json_from_file
from inc.shared.inc.helpers.gtfs_helpers import compute_gtfs_day_from_resource_path, compute_gtfs_db_filename
from inc.shared.inc.models.ckan_data import CKAN_Data

PYTHON_PATH = sys.executable
row_delimiter_s = '='*70

def main():
    script_path = Path(os.path.realpath(__file__))
    app_config = load_convenience_config(script_path)

    _fetch_latest_resource(script_path, 'gtfs_static')
    gtfs_data_path = _check_latest_data_folder(app_config)
    _db_import(app_config, script_path, gtfs_data_path)
    
    _dbs_aggregate(script_path)
    
def _fetch_latest_resource(script_path, package_key):
    # fetch latest archive
    ckan_fetch_cli_path = f'{script_path.parent}/../ckan-utils/fetch_package_cli.py'
    ckan_fetch_sh = f'{PYTHON_PATH} {ckan_fetch_cli_path} --package_key {package_key}'
    
    print('START ./tools/scripts/gtfs-compute-latest.py')
    print()
    print('Resources:')
    print('  - https://opentransportdata.swiss/en/dataset/timetable-54-2024-hrdf')
    print('  - https://tools.odpch.ch/hrdf-dbs/hrdf-dbs.json')
    print('')
    
    print('STEP 1 - FETCH LATEST ARCHIVE')
    print(ckan_fetch_sh, flush=True)
    os.system(ckan_fetch_sh)

def _check_latest_data_folder(app_config):
    # check latest folder
    print('')
    print('STEP 2 - CHECK LATEST GTFS DATASET')
    
    gtfs_ckan_json_path = app_config['resource_paths']['ckan_gtfs_static_json']
    gtfs_ckan_json = load_json_from_file(gtfs_ckan_json_path)
    gtfs_ckan = CKAN_Data.from_ckan_json(gtfs_ckan_json)
    
    ckan_resource = gtfs_ckan.result.resources[0]
    
    resources_base_folder_path = app_config['data_paths']['gtfs-static']
    
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

def _db_import(app_config, script_path, gtfs_data_path):
    gtfs_day = compute_gtfs_day_from_resource_path(gtfs_data_path)
    gtfs_dbs_path = app_config['data_paths']['gtfs-static-dbs']
    gtfs_db_filename = compute_gtfs_db_filename(gtfs_day)
    gtfs_db_path = f'{gtfs_dbs_path}/{gtfs_db_filename}'

    print(f'')
    print(f'STEP 3 - IMPORT GTFS into DB')
    print(f'GTFS DATA PATH  : {gtfs_data_path}')
    print(f'GTFS DB PATH    : {gtfs_db_path}')

    if os.path.isfile(gtfs_db_path):
        print(f'DB already present at path')
        print(f'=> {gtfs_db_path}')
    else:
        import_cli_path = f'{script_path.parent}/../gtfs-static-db-importer/gtfs_db_importer_cli.py'
        import_sh = f'{PYTHON_PATH} {import_cli_path} --gtfs-folder-path {gtfs_data_path}'
        print(import_sh, flush=True)
        os.system(import_sh)

    return gtfs_db_path

def _dbs_aggregate(script_path):
    print(f'')
    print(f'STEP 4 - BUILD GTFS DB catalog')
    
    cli_path = f'{script_path.parent}/../gtfs-static-db-importer/cli_aggregate_dbs.py'
    cli_sh = f'{PYTHON_PATH} {cli_path}'
    print(cli_sh, flush=True)
    os.system(cli_sh)

if __name__ == "__main__":
    main()
