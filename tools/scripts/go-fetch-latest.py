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

    _fetch_latest_resource(script_path, 'business-organisations')
    resource_path = _check_latest_data_folder(app_config)
    
    print('STEP 3 - SYMLINK latest dataset')
    latest_resource_path = app_config['data_paths']['go_latest']
    if os.path.islink(latest_resource_path):
        os.remove(latest_resource_path)
    os.symlink(resource_path, latest_resource_path)
    
    print(f'=> {latest_resource_path}')
    print('... DONE')
    
def _fetch_latest_resource(script_path, package_key):
    # fetch latest archive
    ckan_fetch_cli_path = f'{script_path.parent}/../ckan-utils/fetch_package_cli.py'
    ckan_fetch_sh = f'{PYTHON_PATH} {ckan_fetch_cli_path} --package_key {package_key}'
    
    print('')
    print('STEP 1 - FETCH LATEST ARCHIVE')
    print(ckan_fetch_sh, flush=True)
    os.system(ckan_fetch_sh)

def _check_latest_data_folder(app_config):
    # check latest folder
    print('')
    print('STEP 2 - CHECK LATEST DATASET')
    
    ckan_json_path = app_config['resource_paths']['ckan_go_json']
    ckan_json = load_json_from_file(ckan_json_path)
    ckan_data = CKAN_Data.from_ckan_json(ckan_json)
    
    ckan_resource = None
    for ckan_resource_item in ckan_data.result.resources:
        resource_title: str = ckan_resource_item.title['en']
        if not resource_title.startswith('actual_date_business_organisation_versions'):
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
        
    resources_base_folder_path = app_config['data_paths']['go_data']
    resource_name = ckan_resource.title['en'][0:-4]
    
    # resource name is the same as folder name
    resource_path = Path(f'{resources_base_folder_path}/{resource_name}/{resource_name}')
    
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
