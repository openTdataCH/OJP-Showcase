import argparse, os, sys
from pathlib import Path

from inc.shared.inc.helpers.config_helpers import load_yaml_config
from inc.shared.inc.helpers.hrdf_helpers import compute_formatted_date_from_hrdf_folder_path
from inc.shared.inc.helpers.ckan_helpers import fetch_latest_archive_url, run_unzip

def main(hrdf_base_path: Path):
    script_path = Path(os.path.realpath(__file__))

    app_config_path = Path(f'{script_path.parent}/inc/config.yml')
    if not os.path.isfile(app_config_path):
        print(f'ERROR: cant load config from {app_config_path}')
        sys.exit(1)
    app_config = load_yaml_config(app_config_path, script_path.parent)

    if not os.path.isdir(hrdf_base_path):
        print(f'ERROR, download_base_path is not a folder')
        print(f'{hrdf_base_path}')
        sys.exit(1)

    print('Fetching latest CKAN info ...')
    ckan_api_package_id = app_config['hrdf_5.4']['package_id']
    ckan_api_url: str = app_config['opentransportdata.swiss']['ckan_package_url']
    ckan_api_url = ckan_api_url.replace('[package_id]', ckan_api_package_id)
    ckan_api_authorization = app_config['opentransportdata.swiss']['authorization']
    dataset_url, dataset_filename = fetch_latest_archive_url(ckan_api_url, ckan_api_authorization)

    print(f'Latest filename: {dataset_filename}')

    dataset_extension = dataset_filename[-3:]
    if not dataset_extension == 'zip':
        print(f'ERROR: expected zip, got {dataset_extension} for {dataset_filename}')
        sys.exit(1)

    dataset_folder_name = dataset_filename[0:-4]
    dataset_folder_path = Path(f'{hrdf_base_path}/{dataset_folder_name}')

    formatted_date = compute_formatted_date_from_hrdf_folder_path(f'{dataset_folder_path}')
    if formatted_date is None:
        print(f"CANT read date from HRDF archive: '{dataset_filename}'")
        sys.exit(1)

    hrdf_FPLAN_path = f'{dataset_folder_path}/FPLAN'
    if os.path.isfile(hrdf_FPLAN_path):
        print(f'The {dataset_filename} is already downloaded / extracted at')
        print(f'{dataset_folder_path}')
        sys.exit(0)

    hrdf_zip_path = Path(f'{hrdf_base_path}/{dataset_filename}')
    if os.path.isfile(hrdf_zip_path):
        run_unzip(hrdf_zip_path, dataset_folder_path)
        sys.exit(0)

    print(f'Downloading {dataset_url} to {hrdf_zip_path} ...')
    curl_sh = f'curl {dataset_url} -o {hrdf_zip_path}'
    print(curl_sh, flush=True)
    os.system(curl_sh)
    print('DONE')

    run_unzip(hrdf_zip_path, dataset_folder_path)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--hrdf-base-folder-path', '--hrdf-base-folder-path')
    cli_args = parser.parse_args()

    hrdf_base_folder_path = cli_args.hrdf_base_folder_path
    if hrdf_base_folder_path is None or not os.path.isdir(hrdf_base_folder_path):
        print(f'--hrdf-base-folder-path is not a valid folder')
        print(f'Path: {hrdf_base_folder_path}')
        sys.exit()

    hrdf_base_folder_path = Path(hrdf_base_folder_path)

    main(hrdf_base_folder_path)
