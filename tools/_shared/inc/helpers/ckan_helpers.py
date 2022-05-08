import os, sys
import json
from pathlib import Path
import urllib.request

def fetch_latest_archive_url(ckan_api_url, ckan_api_authorization):
    request_headers = {
        'Authorization': ckan_api_authorization,
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
