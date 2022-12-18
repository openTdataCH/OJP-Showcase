import os, sys
import json
import urllib.request
import time
from pathlib import Path

from .shared.inc.helpers.json_helpers import export_json_to_file, load_json_from_file
from .shared.inc.helpers.log_helpers import log_message

class CKAN_Controller:
    def __init__(self, app_config):
        self.app_config = app_config

    def fetch_latest(self, package_key: str, resource_title):
        package_data = self.app_config['map_packages'][package_key]
        package_id = package_data['package_id']

        log_message(f'CKAN - FETCH PACKAGE {package_key}')
        log_message(f'  PACKAGE_ID      : {package_id}')
        log_message(f'  RESOURCE_TITLE  : {resource_title}')

        ds_resource = self._fetch_package_resource(package_key, resource_title)
        ds_filename = ds_resource['name']['en'].lower()
        ds_folder = ds_filename[0:-4]

        package_data = self.app_config['map_packages'][package_key]
        
        ds_zip_path = Path(package_data['base_path'] + '/' + ds_filename)
        ds_folder_path = Path(package_data['base_path'] + '/' + ds_folder)

        if os.path.isfile(ds_zip_path):
            print('')
            log_message(f'... resource already downloaded at path {ds_zip_path}')
        else:
            ds_url = ds_resource['url']
            download_resource(ds_url, ds_zip_path)

        if os.path.isdir(ds_folder_path):
            print('')
            log_message(f'... resource already unzipped at path {ds_folder_path}')
        else:
            run_unzip(ds_zip_path, ds_folder_path)

        log_message(f'CKAN - DONE')

    def _fetch_package_resource(self, package_key: str, filter_resource_title):
        package_data_json = self._fetch_package_json(package_key)

        if filter_resource_title is None:
            return package_data_json['result']['resources'][0]

        filter_resource_title = filter_resource_title.strip().lower()
        
        for ds_resource in package_data_json['result']['resources']:
            resource_title = ds_resource['title']['en'].strip().lower()

            if resource_title[0:-4] == filter_resource_title[0:-4]:
                return ds_resource

        print(f'ERROR - cant find resource with title {filter_resource_title}')
        print(f'Available resources:')

        for ds_resource in package_data_json['result']['resources']:
            resource_title = ds_resource['title']['en'].strip().lower()
            
            last_modified_day = ds_resource['last_modified'][0:10]
            last_modified_hh_mm = ds_resource['last_modified'][11:16]
            last_modified_s = f'{last_modified_day} {last_modified_hh_mm}'

            print(f'-- {resource_title} - {last_modified_s}')
        sys.exit()

    def _fetch_package_json(self, package_key):
        package_data_json_path = f"{self.app_config['package_cache']['local_path']}"
        package_data_json_path = package_data_json_path.replace('[PACKAGE_KEY]', package_key)

        if os.path.isfile(package_data_json_path):
            package_data_json_ttl = self.app_config['package_cache']['ttl']
            package_data_json_ts = os.path.getmtime(package_data_json_path)
            now_ts = time.time()
            cache_age = now_ts - package_data_json_ts
            if cache_age < package_data_json_ttl:
                log_message(f'... load package JSON from {package_data_json_path}')
                package_data_json = load_json_from_file(package_data_json_path)
                return package_data_json

        package_data = self.app_config['map_packages'][package_key]
        package_id = package_data['package_id']

        ckan_api_url = f"{self.app_config['ckan_data']['package_show_url_template']}"
        ckan_api_url = ckan_api_url.replace('[PACKAGE_ID]', package_id)
            
        ckan_api_authorization = self.app_config['ckan_data']['authorization']

        log_message(f'... fetching package JSON from {ckan_api_url}')

        package_data_json = fetch_latest_ckan_json(ckan_api_url, ckan_api_authorization)
        export_json_to_file(package_data_json, package_data_json_path, pretty_print=True)

        return package_data_json

def fetch_latest_ckan_json(ckan_api_url, ckan_api_authorization):
    request_headers = {
        'Authorization': ckan_api_authorization,
    }

    ckan_api_request = urllib.request.Request(ckan_api_url, headers=request_headers)
    response = urllib.request.urlopen(ckan_api_request).read()
    response_json = json.loads(response.decode('utf-8'))

    api_status = response_json.get('success', False)
    if not api_status:
        print(f'ERROR connecting to CKAN API - {ckan_api_url}')
        sys.exit(1)

    return response_json

def run_unzip(archive_path: Path, folder_path: Path):
    log_message('RUN UNZIP')

    unzip_sh = f'unzip {archive_path} -d {folder_path}'
    print(unzip_sh, flush=True)
    os.system(unzip_sh)

    print(f'... DONE')
    print('')

def download_resource(resource_url: str, resource_path: Path):
    if isinstance(resource_path, str):
        resource_path = Path(resource_path)

    if not os.path.isdir(resource_path.parent):
        os.makedirs(resource_path.parent)

    print(f'DOWNLOAD RESOURCE')
    curl_sh = f'curl {resource_url} -o {resource_path}'
    print(curl_sh, flush=True)
    os.system(curl_sh)
    
    print(f'... DONE')
    print('')
