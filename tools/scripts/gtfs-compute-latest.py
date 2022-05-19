import os, sys
import glob
from pathlib import Path

from inc.shared.inc.helpers.config_helpers import load_convenience_config
from inc.shared.inc.helpers.gtfs_helpers import compute_formatted_date_from_gtfs_folder_path, compute_gtfs_db_filename

# .hrdf_helpers import compute_formatted_date_from_hrdf_folder_path, compute_hrdf_db_filename, compute_formatted_date_from_hrdf_db_path

def main():
    script_path = Path(os.path.realpath(__file__))
    app_config = load_convenience_config(script_path)

    _fetch_latest_resource(script_path, 'gtfs_static')
    gtfs_data_path = _check_latest_data_folder(app_config)
    _db_import(app_config, script_path, gtfs_data_path)
    
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
    hrdf_data_base_folder_path = app_config['data_paths']['gtfs-static']
    resource_paths = glob.glob(f'{hrdf_data_base_folder_path}/*')
    resource_paths.sort(reverse=True)

    gtfs_data_path = None
    gtfs_day = None
    for resource_path in resource_paths:
        if not os.path.isdir(resource_path):
            continue

        resource_path = Path(resource_path)
        gtfs_day = compute_formatted_date_from_gtfs_folder_path(resource_path.name)
        if gtfs_day is None:
            continue

        gtfs_data_path = resource_path
        break

    if gtfs_data_path is None:
        print(f'ERROR - cant find a new GTFS folder data in {hrdf_data_base_folder_path}')
        sys.exit()

    print(f'=> found {gtfs_data_path}')
    print(f'=> GTFS day {gtfs_day}')
    
    return gtfs_data_path

def _db_import(app_config, script_path, gtfs_data_path):
    gtfs_day = compute_formatted_date_from_gtfs_folder_path(gtfs_data_path)
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
        import_sh = f'python3 {import_cli_path} --gtfs-folder-path {gtfs_data_path}'
        print(import_sh, flush=True)
        os.system(import_sh)

    return gtfs_db_path

if __name__ == "__main__":
    main()
