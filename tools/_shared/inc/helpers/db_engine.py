import os, sys

import sqlite3

from pathlib import Path

from typing import Any, Optional, Union

class SQLiteDBEngine:
    db_path: Path
    _db_handle: sqlite3.Connection

    def __init__(self, db_path: Path, is_read_only = True):
        if isinstance(db_path, str):
            db_path = Path(db_path)
            
        self.db_path = db_path
        
        conn_ds = f'file:{db_path}'
        if is_read_only:
            conn_ds = f'{conn_ds}?mode=ro'

        self._db_handle = sqlite3.connect(conn_ds, uri=True)
        self._db_handle.row_factory = sqlite3.Row
        
    def fetch_table_names(self):
        table_names = []
        
        sql = "SELECT name FROM sqlite_master WHERE type ='table' AND name NOT LIKE 'sqlite_%';"
        cursor = self._db_handle.cursor()
        cursor.execute(sql)
        for db_row in cursor:
            table_name = db_row[0]
            table_names.append(table_name)
        cursor.close()

        return table_names
    
    def compute_table_stats(self):
        table_stats = {}
        
        table_names = self.fetch_table_names()
        for table_name in table_names:
            table_stats[table_name] = self.count_rows_table(table_name)
            
        return table_stats
        
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
    
    def query_table(self, table_name: str, map_by_field: Optional[str] = None) -> Union[dict[str, Any], list[Any]]:
        sql = f'SELECT * FROM {table_name}'
        query_results = self.query(sql, map_by_field)
        
        return query_results
        
    def query(self, sql: str, map_by_field: Optional[str] = None) -> Union[dict[str, Any], list[Any]]:
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
        
    def count_rows_table(self, table_name: str, where_clause = None):
        sql = f"SELECT COUNT(1) AS cno FROM {table_name} {where_clause}"
        return self._db_handle.cursor().execute(sql).fetchone()[0]
    
    def run_sql(self, sql: str):
        self._db_handle.execute(sql)
        self._db_handle.commit()
    
    def drop_table(self, table_name: str):
        sql = f'DROP TABLE IF EXISTS {table_name}'
        self.run_sql(sql)

    def drop_and_recreate_table(self, table_name: str, table_config: Any):
        self.drop_table(table_name)

        column_defs = []
        for column_def in table_config['columns']:
            column_defs.append(column_def)

        column_defs_s = ",".join(column_defs)
        sql = f"CREATE TABLE IF NOT EXISTS {table_name} ({column_defs_s});"
        self.run_sql(sql)

    def get_cursor(self) -> sqlite3.Cursor: 
        cursor = self._db_handle.cursor()
        return cursor
