import argparse, os, sys
from pathlib import Path
import json
import urllib.request

from inc.shared.inc.helpers.config_helpers import load_yaml_config
from inc.shared.inc.helpers.gtfs_helpers import compute_formatted_date_from_gtfs_folder_path

def main():
    script_path = Path(os.path.realpath(__file__))

    app_config_path = Path(f'{script_path.parent}/inc/config.yml')
    if not os.path.isfile(app_config_path):
        print(f'ERROR: cant load config from {app_config_path}')
        sys.exit(1)
    app_config = load_yaml_config(app_config_path, script_path.parent)

    print('Fetching latest CKAN info ...')
    dataset_url, dataset_filename = fetch_latest_archive_url(app_config)

    print(f'Latest filename: {dataset_filename}')

    dataset_extension = dataset_filename[-3:]
    if not dataset_extension == 'zip':
        print(f'ERROR: expected zip, got {dataset_extension} for {dataset_filename}')
        sys.exit(1)

    dataset_folder_name = dataset_filename[0:-4]
    dataset_folder_path = Path(app_config['gtfs_static']['download_base_path'] + f'/{dataset_folder_name}')

    formatted_date = compute_formatted_date_from_gtfs_folder_path(dataset_folder_path)
    if formatted_date is None:
        print(f"CANT read date from GTFS archive: '{dataset_filename}'")
        sys.exit(1)

    db_filename = f"gtfs_{formatted_date}.sqlite"
    db_path = Path(app_config['gtfs_static']['gtfs_db_base_path'] + f'/{db_filename}')

    if os.path.isfile(db_path):
        print(f'DB already existing at {db_path}')
        sys.exit(0)

    gtfs_agency_path = f'{dataset_folder_path}/agency.txt'
    if os.path.isfile(gtfs_agency_path):
        print(f'The {dataset_filename} is already downloaded / extracted at')
        print(f'{dataset_folder_path}')
        sys.exit(0)
    
    gtfs_static_zip_path = Path(app_config['gtfs_static']['download_base_path'] + f'/{dataset_filename}')
    if os.path.isfile(gtfs_static_zip_path):
        run_unzip(gtfs_static_zip_path, dataset_folder_path)
        sys.exit(0)

    print(f'Downloading {dataset_url} to {gtfs_static_zip_path} ...')
    curl_sh = f'curl {dataset_url} -o {gtfs_static_zip_path}'
    print(curl_sh, flush=True)
    os.system(curl_sh)
    print('DONE')

    run_unzip(gtfs_static_zip_path, dataset_folder_path)

def fetch_latest_archive_url(app_config: any):
    package_id = app_config['gtfs_static']['package_id']
    
    ckan_api_url: str = app_config['opentransportdata.swiss']['gtfs_static_package_url']
    ckan_api_url = ckan_api_url.replace('[package_id]', package_id)

    api_authorization = app_config['opentransportdata.swiss']['authorization']
    request_headers = {
        'Authorization': api_authorization,
    }

    ckan_api_request = urllib.request.Request(ckan_api_url, headers=request_headers)
    response = urllib.request.urlopen(ckan_api_request)

    response = urllib.request.urlopen(ckan_api_request).read()
    response_json = json.loads(response.decode('utf-8'))

    api_status = response_json.get('success', False)
    if not api_status:
        print(f'ERROR connecting to CKAN API - {ckan_api_url}')
        sys.exit(1)

    dataset_resources = response_json['result']['resources']
    if len(dataset_resources) == 0:
        print(f'No dataset available - {ckan_api_url}')
        sys.exit(1)

    latest_dataset = dataset_resources[0]
    dataset_url = latest_dataset['url']
    dataset_filename:str = latest_dataset['name']['en']
    dataset_filename = dataset_filename.lower()

    return dataset_url, dataset_filename

def run_unzip(archive_path: Path, folder_path: Path):
    print('UNZIP')
    unzip_sh = f'unzip {archive_path} -d {folder_path}'
    print(unzip_sh, flush=True)
    os.system(unzip_sh)
    print(f'... done unzip')

if __name__ == "__main__":
    main()