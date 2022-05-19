import os, sys
import argparse
from pathlib import Path

from inc.shared.inc.helpers.config_helpers import load_convenience_config
from inc.ckan_controller import CKAN_Controller

def main():
    script_path = Path(os.path.realpath(__file__))
    app_config = load_convenience_config(script_path)

    usage_help_s = 'fetch_latest_package_cli.py [--package_key PACKAGE_KEY] [--resource_title RESOURCE_TITLE]'

    parser = argparse.ArgumentParser()
    parser.add_argument('--package_key', '--package_key')
    parser.add_argument('--resource_title', '--resource_title')
    args = parser.parse_args()

    package_key = args.package_key

    if not package_key:
        print(f'Missing --package_key param')
        print(usage_help_s)

        print('Available package_key items:')
        for package_key in app_config['map_packages']:
            package_data = app_config['map_packages'][package_key]
            alias_s = ''
            if 'alias' in package_data:
                alias_s = '(alias ' + package_data['alias'] + ')'
            print(f'-- {package_key} {alias_s}')

        package_key = input('Type the package_id: ')

    if package_key not in app_config['map_packages']:
        print(f'package_key {package_key} not found in config.map_packages')
        sys.exit(1)

    resource_title = args.resource_title or None

    ckan_controller = CKAN_Controller(app_config)
    ckan_controller.fetch_latest(package_key, resource_title)

if __name__ == "__main__":
    main()
