import os, sys
from pathlib import Path
import sqlite3
import csv

from .log_helpers import log_message
from .file_helpers import compute_file_rows_no
from .db_helpers import drop_and_recreate_table, fetch_column_names, add_table_indexes

class DB_Table_CSV_Importer:
    def __init__(self, db_path: Path, table_name: str, table_config: any):
        self.db_path = db_path
        self.db_handle = sqlite3.connect(db_path)
        
        self.db_handle.execute('PRAGMA synchronous = OFF')
        self.db_handle.execute('PRAGMA journal_mode = OFF')
        self.db_handle.commit()

        self.table_name = table_name
        self.table_config = table_config

        self.write_csv_handle = None
        self.write_csv_file = None

    def truncate_table(self):
        drop_and_recreate_table(self.db_handle, self.table_name, self.table_config)

    def load_csv_file(self, csv_path: Path):
        if isinstance(csv_path, str):
            csv_path = Path(csv_path)

        log_message(f'START LOAD CSV: {csv_path.name}')
        lines_no = compute_file_rows_no(csv_path) - 1
        log_message(f'... found {lines_no} rows')

        csv_import_handler = open(csv_path, encoding='utf-8-sig')
        csv_reader = csv.DictReader(csv_import_handler)
        csv_row_id = 1

        rows_report_no = self._compute_rows_report_no(lines_no)

        column_names = fetch_column_names(self.db_handle, self.table_name)
        column_names_s = ', '.join(column_names)
        values_s = ('?, ' * len(column_names))[0:-2]
        template_insert_sql = f'INSERT INTO {self.table_name}({column_names_s}) VALUES({values_s})'

        batch_insert_rows_no = 10000
        batch_insert_values = []

        insert_cursor = self.db_handle.cursor()

        for csv_row in csv_reader:
            if csv_row_id % rows_report_no == 0:
                log_message(f'... parsed {csv_row_id}/{lines_no} rows')

            if len(batch_insert_values) >= batch_insert_rows_no:
                insert_cursor.executemany(template_insert_sql, batch_insert_values)
                self.db_handle.commit()
                batch_insert_values = []

            row_values = []
            for key in column_names:
                field_value = csv_row.get(key, None)
                row_values.append(field_value)
            batch_insert_values.append(row_values)
            
            csv_row_id += 1

        csv_import_handler.close()

        insert_cursor.executemany(template_insert_sql, batch_insert_values)
        self.db_handle.commit()

        log_message(f'... DONE LOAD CSV')

    def _compute_rows_report_no(self, rows_no):
        if rows_no < 1000000:
            return 500000
        
        return 1000000

    def close(self):
        self.db_handle.close()

    def add_table_indexes(self):
        log_message('... adding indexes')
        add_table_indexes(self.db_handle, self.table_name, self.table_config)
        log_message('... DONE adding indexes')

    def create_csv_file(self, csv_path: str):
        column_names = fetch_column_names(self.db_handle, self.table_name)

        self.write_csv_file = open(csv_path, 'w', encoding='utf-8')
        self.write_csv_handle = csv.DictWriter(self.write_csv_file, column_names)
        self.write_csv_handle.writeheader()

        # use self.write_csv_handle.writerow(rowdict) or .writerows([rowdict]) to populate the table

    def close_csv_file(self):
        self.write_csv_file.close()
        self.write_csv_file = None
        self.write_csv_handle = None
