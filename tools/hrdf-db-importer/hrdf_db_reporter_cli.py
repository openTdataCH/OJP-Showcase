import os
import sys
import argparse

from inc.shared.inc.helpers.db_helpers import compute_db_tables_report

parser = argparse.ArgumentParser(description = 'Generate DB report')
parser.add_argument('--hrdf-db-path', '--hrdf-db-path')

args = parser.parse_args()
db_path = args.hrdf_db_path

if db_path is None:
    print("ERROR, use with --hrdf-db-path")
    sys.exit(1)

compute_db_tables_report(db_path=db_path)
