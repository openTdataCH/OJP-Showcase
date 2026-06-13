import os, sys

from io import TextIOWrapper
from pathlib import Path

from typing import Any, List, Optional

import csv

class CSV_Updater:
    csv_path: Path
    csv_file: TextIOWrapper
    column_names: List[str]
    
    csv_writer: csv.DictWriter

    def __init__(self, csv_path: Path, column_names: List[str]):
        self.csv_path = csv_path
        self.csv_file = open(csv_path, 'w', encoding='utf-8')
        self.column_names = column_names

        self.csv_writer = csv.DictWriter(self.csv_file, column_names, quoting=csv.QUOTE_NONNUMERIC)
        self.csv_writer.writeheader()

    @classmethod
    def init_with_table_config(cls, csv_path: Path, table_config: Any):
        column_names = []
        for column_def in table_config['columns']:
            column_name = column_def.strip().split(' ')[0]
            column_names.append(column_name)

        csv_updater = CSV_Updater(csv_path, column_names)
        return csv_updater

    def prepare_row(self, row_dict: dict):
        map_row_values = {}
        for column_name in self.column_names:
            attr_value = row_dict.get(column_name, None)
            map_row_values[column_name] = attr_value
        
        self.csv_writer.writerow(map_row_values)

    def close(self):
        self.csv_file.close()
