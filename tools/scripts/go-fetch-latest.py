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

    _run_package(script_path, app_config, 'go', 'actual_date_business_organisation')
    _run_package(script_path, app_config, 'go-realtime', 'business_organisation_realtime')
    
    print()
    print('... DONE')
    
def _run_package(script_path: Path, app_config: any, package_key: str, resource_prefix: str):
    _fetch_latest_resource(script_path, package_key)
    resource_path = _check_latest_dataset(app_config, package_key, resource_prefix)
    latest_resource_path = app_config['data_paths'][f'{package_key}_latest']
    
    if os.path.islink(latest_resource_path):
        os.remove(latest_resource_path)
    os.symlink(resource_path, latest_resource_path)
    
    print()
    print(f'=> {latest_resource_path}')
    
def _fetch_latest_resource(script_path, package_key):
    # fetch latest archive
    ckan_fetch_cli_path = f'{script_path.parent}/../ckan-utils/fetch_package_cli.py'
    ckan_fetch_sh = f'{PYTHON_PATH} {ckan_fetch_cli_path} --package_key {package_key}'
    
    print('')
    print(f'STEP {package_key}.1 - FETCH LATEST ARCHIVE')
    print(ckan_fetch_sh, flush=True)
    os.system(ckan_fetch_sh)

def _check_latest_dataset(app_config, package_key, resource_prefix: str):
    # check latest folder
    print('')
    print(f'STEP {package_key}.2 - CHECK LATEST DATASET')
    
    ckan_json_path = app_config['resource_paths'][f'ckan_{package_key}_json']
    ckan_json = load_json_from_file(ckan_json_path)
    ckan_data = CKAN_Data.from_ckan_json(ckan_json)
    
    ckan_resource = None
    for ckan_resource_item in ckan_data.result.resources:
        print(ckan_resource_item.title['en'])
        resource_title: str = ckan_resource_item.title['en']
        if not resource_title.startswith(resource_prefix):
            continue
        
        ckan_resource = ckan_resource_item
        break
    # loop resources
    
    if ckan_resource is None:
        print()
        print(row_delimiter_s)
        print('ERROR - latest resource cant be found')
        print()
        print(ckan_data.result.resources)
        print()
        print(row_delimiter_s)
        sys.exit(1)
    #
    
    ds_mimetype: str = ckan_resource.mimetype
    ds_mimetype = ds_mimetype.lower().strip()
    
    resource_name = ckan_resource.title['en']
    resources_base_folder_path = app_config['data_paths'][f'{package_key}_data']
    
    if 'zip' in ds_mimetype:
        # the actual name is without .zip extension
        resource_name = resource_name[0:-4]
        # same for the folder that contains the resource
        resource_folder_name = resource_name
        
        resource_path = Path(f'{resources_base_folder_path}/{resource_folder_name}/{resource_name}')
    else:
        resource_path = Path(f'{resources_base_folder_path}/{resource_name}')
    # end ds_mimetype == 'zip'
    
    if not os.path.isfile(resource_path):
        print()
        print(row_delimiter_s)
        print('ERROR - latest resource not found at path')
        print(resource_path)
        print(row_delimiter_s)
        sys.exit(1)
        
    print(f'... use following resource: {resource_path}')
        
    return resource_path

if __name__ == "__main__":
    main()
