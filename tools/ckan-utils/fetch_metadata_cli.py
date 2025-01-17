import os, sys
import argparse
from pathlib import Path

from inc.shared.inc.helpers.config_helpers import load_convenience_config
from inc.ckan_controller import CKAN_Controller

def main():
    script_path = Path(os.path.realpath(__file__))
    app_config = load_convenience_config(script_path)

    usage_help_s = 'fetch_metadata_cli.py [--package_id package_id]'

    parser = argparse.ArgumentParser()
    parser.add_argument('--package_id', '--package_id')
    args = parser.parse_args()

    package_id = args.package_id

    if not package_id:
        print(f'Missing --package_id param')
        print(usage_help_s)

        sys.exit(1)
        
    ckan_controller = CKAN_Controller(app_config)
    ckan_controller.fetch_metadata(package_id)

if __name__ == "__main__":
    main()
