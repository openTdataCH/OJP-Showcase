import sys
from typing import List
from pathlib import Path
import sqlite3
import csv

from .log_helpers import log_message
from .file_helpers import compute_file_rows_no

class CSV_Updater:
    def __init__(self, csv_path: Path, column_names: List[str]):
        self.csv_file = open(csv_path, 'w', encoding='utf-8')
        self.column_names = column_names

        self.csv_writer = csv.DictWriter(self.csv_file, column_names)
        self.csv_writer.writeheader()

    def prepare_row(self, row_dict: dict):
        map_row_values = {}
        for column_name in self.column_names:
            attr_value = row_dict.get(column_name, None)
            map_row_values[column_name] = attr_value
        
        self.csv_writer.writerow(map_row_values)

    def close(self):
        self.csv_file.close()
        self.csv_writer = None
