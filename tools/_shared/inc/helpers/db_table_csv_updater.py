import sys
from typing import List
from pathlib import Path
import sqlite3
import csv

from .log_helpers import log_message
from .file_helpers import compute_file_rows_no

class DB_Table_CSV_Updater:
    def __init__(self, csv_path: Path, column_names: List[str]):
        self.csv_file = open(csv_path, 'w')
        self.column_names = column_names

        row_csv_s = ','.join(column_names) + "\n"
        self.csv_file.write(row_csv_s)

    def prepare_row(self, row_dict: dict):
        row_values = []
        for column_name in self.column_names:
            attr_value = row_dict.get(column_name, None)
            row_values.append(f'{attr_value}')
        
        row_csv_s = ','.join(row_values) + "\n"
        self.csv_file.write(row_csv_s)

    def update_table(self, db_handle: any, sql_template: str, rows_report_no: int):
        self.csv_file.close()

        db_handle.execute('PRAGMA synchronous = OFF')
        db_handle.execute('PRAGMA journal_mode = OFF')
        db_handle.commit()

        csv_path = Path(self.csv_file.name)
        log_message(f'DB_Table_CSV_Updater: START UPDATE from CSV: {csv_path.name}')
        lines_no = compute_file_rows_no(csv_path) - 1
        log_message(f'... found {lines_no} rows')

        batch_update_rows_no = 10000
        batch_update_values = []

        csv_file = open(self.csv_file.name)
        csv_reader = csv.DictReader(csv_file)

        update_cursor = db_handle.cursor()

        csv_row_id = 1
        for csv_row in csv_reader:
            if csv_row_id % rows_report_no == 0:
                log_message(f'... parsed {csv_row_id}/{lines_no} rows')

            if len(batch_update_values) >= batch_update_rows_no:
                update_cursor.executemany(sql_template, batch_update_values)
                db_handle.commit()
                batch_update_values = []
            
            batch_update_values.append(csv_row)

            csv_row_id += 1

        update_cursor.executemany(sql_template, batch_update_values)
        db_handle.commit()
        update_cursor.close()

        csv_file.close()

        log_message(f'DB_Table_CSV_Updater: ... DONE')
