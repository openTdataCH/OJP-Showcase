import os, sys

from pathlib import Path

from typing import List

import argparse

from inc.shared.inc.helpers.config_helpers import load_convenience_config
from inc.shared.inc.helpers.json_helpers import load_json_from_file
from inc.shared.inc.helpers.gtfs_helpers import compute_gtfs_day_from_resource_path, compute_gtfs_db_filename
from inc.shared.inc.models.ckan_data import CKAN_Data

from inc.common import PYTHON_PATH, ROW_DELIMITER_S, compute_ckan_resource_by_prefix, compute_ckan_data

def main():
    script_path = Path(os.path.realpath(__file__))
    app_config = load_convenience_config(script_path)
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--package_id', '--package_id')
    args = parser.parse_args()
    
    package_id = args.package_id
    if package_id is None:
        print('--package_id is required')
        
        package_ids = list(app_config['csv_latest_data'].keys())
        print(f"possible: values: {', '.join(package_ids)}" )
        sys.exit(1)
        
    if package_id not in app_config['csv_latest_data']:
        print(f'unknown --package_id value: {package_id}')
        
        package_ids = list(app_config['csv_latest_data'].keys())
        print(f"possible: values: {', '.join(package_ids)}" )
        sys.exit(1)
        
    package_config = app_config['csv_latest_data'][package_id]
    package_info_url = package_config['info_url']
    
    print('START ./tools/scripts/cli_opentransportdata_csv_fetch_latest.py')
    print()
    print(f'Package_id: {package_id}')
    print('Resources:')
    print(f'  - {package_info_url}')
    print()
    
    _run_package(script_path, app_config, package_id)
    
    print()
    print('... DONE')
    
def _run_package(script_path: Path, app_config: any, package_id: str):
    _fetch_metadata(script_path, package_id)
    _fetch_resource(script_path, app_config, package_id)
    _symlink_latest_resource(app_config, package_id)
    
def _fetch_metadata(script_path, package_id: str):
    ckan_fetch_cli_path = f'{script_path.parent}/../ckan-utils/fetch_metadata_cli.py'
    ckan_fetch_sh = f'{PYTHON_PATH} {ckan_fetch_cli_path} --package_id {package_id}'
    
    print('')
    print(f'STEP {package_id}.1 - FETCH METADATA')
    print(ckan_fetch_sh, flush=True)
    os.system(ckan_fetch_sh)
    
    print()
    
def _fetch_resource(script_path: Path, app_config, package_id: str):
    file_prefix_config = app_config['csv_latest_data'][package_id].get('file_prefix', None)
    if file_prefix_config is None:
        _fetch_latest_resource(script_path, package_id)
    else:
        file_prefixes = file_prefix_config if isinstance(file_prefix_config, list) else [file_prefix_config]
        _fetch_resource_by_prefix(app_config, script_path, package_id, file_prefixes)
    #

def _fetch_latest_resource(script_path: Path, package_id: str):
    # fetch latest archive
    ckan_fetch_cli_path = f'{script_path.parent}/../ckan-utils/fetch_package_cli.py'
    ckan_fetch_sh = f'{PYTHON_PATH} {ckan_fetch_cli_path} --package_id {package_id}'
    
    print(f'STEP {package_id}.2 - FETCH LATEST RESOURCE')
    print(ckan_fetch_sh, flush=True)
    os.system(ckan_fetch_sh)
    
def _fetch_resource_by_prefix(app_config: any, script_path: Path, package_id: str, resource_prefixes: List[str]):
    for resource_prefix in resource_prefixes:
        ckan_resource = compute_ckan_resource_by_prefix(app_config, package_id, resource_prefix)
    
        # fetch latest archive
        ckan_fetch_cli_path = f'{script_path.parent}/../ckan-utils/fetch_package_cli.py'
        ckan_fetch_sh = f'{PYTHON_PATH} {ckan_fetch_cli_path} --package_id {package_id} --resource_title {ckan_resource.identifier}'
    
        print(f'STEP {package_id}.2 - FETCH RESOURCE by PREFIX {ckan_resource.identifier}')
        print(ckan_fetch_sh, flush=True)
        os.system(ckan_fetch_sh)
    #

    print()

def _symlink_latest_resource(app_config, package_id: str):
    has_no_symlink = app_config['csv_latest_data'][package_id].get('symlink_latest_path', None) is None
    if has_no_symlink:
        return
    
    print(f'STEP {package_id}.3 - SYMLINK LATEST DATASET')
    
    package_base_path: str = app_config['data_paths']['opentransportdata']['package_base_path']
    package_base_path = package_base_path.replace('[PACKAGE_ID]', package_id)
    
    file_prefix_config = app_config['csv_latest_data'][package_id]['file_prefix'] or None
    if file_prefix_config is None:
        return
    
    file_prefixes = file_prefix_config if isinstance(file_prefix_config, list) else [file_prefix_config]
    for file_prefix in file_prefixes:
        ds_resource = compute_ckan_resource_by_prefix(app_config, package_id, file_prefix)
        
        ds_res_filename = ds_resource.url.split('/')[-1]
        ds_res_extension = Path(ds_res_filename.lower()).suffix
        
        ds_res_path = Path(f'{package_base_path}/{ds_res_filename}')
        if ds_res_extension == '.zip':
            ds_res_zip_folder = ds_res_filename[0:-4]
            ds_res_path = Path(f'{package_base_path}/{ds_res_zip_folder}/{ds_res_zip_folder}')
        #
        
        symlink_latest_path_s = app_config['csv_latest_data'][package_id]['symlink_latest_path']
        symlink_latest_path_s = symlink_latest_path_s.replace('[PACKAGE_ID]', package_id)
        symlink_latest_path_s = symlink_latest_path_s.replace('[PREFIX]', file_prefix)
        
        symlink_latest_path = Path(symlink_latest_path_s)
        
        if os.path.islink(symlink_latest_path):
            os.remove(symlink_latest_path)
        os.symlink(ds_res_path, symlink_latest_path)

        print()
        print(f'=> {symlink_latest_path}')
    # loop prefix
    
    print()
# _symlink_latest_resource

if __name__ == "__main__":
    main()
