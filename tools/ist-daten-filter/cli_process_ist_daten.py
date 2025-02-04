import os
import sys
from pathlib import Path

import argparse
from datetime import datetime

from ist_daten_controller.process_ist_daten_controller import ProcessIstDatenController
from ist_daten_controller.helpers.config_helpers import load_convenience_config

def main():
    now = datetime.now()
    now_year = now.strftime('%Y')
   
    parser = argparse.ArgumentParser()
    parser.add_argument('--year', '--year', default=now_year)
    parser.add_argument('--operator_ref', '--operator_ref')
    args = parser.parse_args()
    
    filter_year = args.year
    filter_operator_ref = args.operator_ref
    
    if filter_operator_ref is None:
        print(f'ERROR: --operator_ref is required')
        sys.exit(1)
        
    script_path = Path(os.path.realpath(__file__))
    app_config = load_convenience_config(script_path)
    
    process_controller = ProcessIstDatenController(app_config, filter_year, filter_operator_ref)
    process_controller.process()

if __name__ == "__main__":
    main()
