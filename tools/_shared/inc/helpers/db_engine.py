import os, sys

import sqlite3

from pathlib import Path

class SQLiteDBEngine:
    def __init__(self, db_path: Path, is_read_only = True):
        if isinstance(db_path, str):
            db_path = Path(db_path)
            
        self.db_path = db_path
        
        conn_ds = f'file:{db_path}'
        if is_read_only:
            conn_ds = f'{conn_ds}?mode=ro'

        self._db_handle = sqlite3.connect(conn_ds, uri=True)
        self._db_handle.row_factory = sqlite3.Row
        
    def table_columns_names(self, table_name: str):
        sql = f"PRAGMA table_info({table_name})"
        columns_cursor = self._db_handle.cursor()
        columns_cursor.execute(sql)
        columns_db_rows = columns_cursor.fetchall()
        columns_cursor.close()

        column_names = []
        for pragma_column_row in columns_db_rows:
            column_name = pragma_column_row[1]
            column_names.append(column_name)
            
        return column_names
        
    def query(self, sql: str, map_by_field: str = None):
        row_items = []
        map_row_items = {}

        cursor = self._db_handle.cursor()
        cursor.execute(sql)
        
        column_names = [description[0] for description in cursor.description]
        
        for db_row in cursor:
            db_row_dict = {}
            for column_idx, column_name in enumerate(column_names):
                db_row_dict[column_name] = db_row[column_idx]
            
            if map_by_field:
                map_row_items[db_row_dict[map_by_field]] = db_row_dict
            else:
                row_items.append(db_row_dict)
        cursor.close()
        
        if map_by_field:
            return map_row_items
        else:
            return row_items
