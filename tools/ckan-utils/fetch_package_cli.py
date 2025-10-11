import os, sys
import argparse
from pathlib import Path

from inc.shared.inc.helpers.config_helpers import load_convenience_config
from inc.ckan_controller import CKAN_Controller

def main():
    script_path = Path(os.path.realpath(__file__))
    app_config = load_convenience_config(script_path)

    usage_help_s = 'fetch_latest_package_cli.py [--package_id package_id] [--resource_title RESOURCE_TITLE]'

    parser = argparse.ArgumentParser()
    parser.add_argument('--package_id', '--package_id')
    parser.add_argument('--resource_title', '--resource_title')
    parser.add_argument('--partial_match', '--partial_match')
    parser.add_argument('--overwrite', '--overwrite')
    args = parser.parse_args()

    package_id = args.package_id

    if not package_id:
        print('Missing --package_id param')
        print(usage_help_s)

        sys.exit(1)

    resource_title = args.resource_title or None
    has_partial_match = args.partial_match in ['true', 'yes', '1']
    overwrite = args.overwrite in ['true', 'yes', '1']

    ckan_controller = CKAN_Controller(app_config)
    ckan_controller.fetch_latest(package_id, resource_title, has_partial_match, overwrite)

if __name__ == "__main__":
    main()
