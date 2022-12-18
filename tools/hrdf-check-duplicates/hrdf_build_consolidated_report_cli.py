import argparse, os, sys
from pathlib import Path

from inc.shared.inc.helpers.config_helpers import load_yaml_config
from inc.hrdf_consolidated_duplicates_report import HRDF_Consolidated_Duplicates_Report

def main():
    script_path = Path(os.path.realpath(__file__))
    app_config_path = Path(f'{script_path.parent}/inc/config.yml')
    if not os.path.isfile(app_config_path):
        print(f'ERROR: cant load config from {app_config_path}')
        sys.exit(1)
    app_config = load_yaml_config(app_config_path, script_path.parent)

    report_controller = HRDF_Consolidated_Duplicates_Report(app_config)
    report_controller.compute_consolidated_report()

if __name__ == "__main__":
    main()
