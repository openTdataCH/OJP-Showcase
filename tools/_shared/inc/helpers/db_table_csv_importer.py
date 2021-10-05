import os, sys
from pathlib import Path
import sqlite3
import csv

from .log_helpers import log_message
from .file_helpers import compute_file_rows_no
from .db_helpers import drop_and_recreate_table, fetch_column_names, add_table_indexes

class DB_Table_CSV_Importer:
    def __init__(self, db_path: Path, temp_path: Path, table_name: str, table_config: any):
        self.db_path = db_path
        self.db_handle = sqlite3.connect(db_path)
        self.table_name = table_name
        self.table_config = table_config
        
        self.column_names = None

        table_csv_file_path = Path(f'{temp_path}/db-import-{table_name}.csv')
        if os.path.isfile(table_csv_file_path):
            os.remove(table_csv_file_path)
        self.table_csv_file = open(table_csv_file_path, 'w')

    def truncate_table(self):
        drop_and_recreate_table(self.db_handle, self.table_name, self.table_config)
        self.column_names = fetch_column_names(self.db_handle, self.table_name)

    def load_csv_file(self, csv_path):
        log_message(f'START LOAD CSV: {csv_path.name}')
        lines_no = compute_file_rows_no(csv_path) - 1
        log_message(f'... found {lines_no} rows')

        csv_import_handler = open(csv_path, encoding='utf-8-sig')
        csv_reader = csv.DictReader(csv_import_handler)
        csv_row_id = 1

        rows_report_no = self._compute_rows_report_no(lines_no)

        for csv_row in csv_reader:
            if csv_row_id % rows_report_no == 0:
                log_message(f'... parsed {csv_row_id}/{lines_no} rows')

            self._prepare_insert_row(csv_row)
            csv_row_id += 1

        csv_import_handler.close()

        self._load_csv_into_db()
        self._add_table_indexes()

        log_message(f'... DONE  LOAD CSV')

    def _compute_rows_report_no(self, rows_no):
        if rows_no < 1000000:
            return 100000
        
        return 500000

    def _prepare_insert_row(self, row_values_dict: any):
        if not self.column_names:
            self.column_names = fetch_column_names(self.db_handle, self.table_name)

        writer = csv.DictWriter(self.table_csv_file, fieldnames=self.column_names)
        writer.writerow(row_values_dict)

    def _load_csv_into_db(self):
        # the CSV handler needs to be closed before being used by sqlite3
        self.table_csv_file.close()

        csv_file_path = self.table_csv_file.name
        sql_file_path = f'{self.table_csv_file.name}.sql'

        sql_file_rows = [
            ".separator ','",
            f'.import "{csv_file_path}" {self.table_name}',
        ]

        sql_file = open(sql_file_path, 'w')
        sql_file.write("\n".join(sql_file_rows))
        sql_file.close()

        shell_import = f'sqlite3 "{self.db_path}" < "{sql_file_path}"'
        log_message(f'... START import into {self.table_name} table')
        os.system(shell_import)
        log_message('... DONE import')

    def _add_table_indexes(self):
        add_table_indexes(self.db_handle, self.table_name, self.table_config)
