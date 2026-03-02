import os, sys

from pathlib import Path
import re

from typing import Dict, List, Optional, TypedDict

class Table_ConfigJSON(TypedDict):
    columns: List[str]
    indexes: Optional[str]

class DB_ConfigJSON(TypedDict):
    tables: Dict[str, Table_ConfigJSON]

class DB_Config:
    _db_config_json: DB_ConfigJSON
    _map_table_columns: Dict[str, List[str]]
    _map_column_defs: Dict[str, List[str]]
    _map_indexes: Dict[str, List[str]]

    def __init__(self, db_config_json: DB_ConfigJSON):
        self._db_config_json = db_config_json

        self._map_table_columns = {}
        self._map_column_defs = {}
        self._map_indexes = {}
        
        for table_name, table_config_json in db_config_json['tables'].items():
            self._map_column_defs[table_name] = []
            self._map_table_columns[table_name] = []
            self._map_indexes[table_name] = []

            table_columns: List[str] = self._map_table_columns[table_name]
            for column_def in table_config_json['columns']:
                column_def_matches = re.match(r"^(.+?[a-z])[^a-z]*$", column_def, re.IGNORECASE)
                if column_def_matches is None:
                    raise ValueError(f'Cant match {column_def}')
                
                column_def = column_def_matches[1]

                self._map_column_defs[table_name].append(column_def)

                column_name = column_def.split(' ')[0]
                table_columns.append(column_name)

            table_indexes = table_config_json.get('indexes') or []
            for column_name in table_indexes:
                self._map_indexes[table_name].append(column_name)

    def get_tables(self):
        return list(self._map_table_columns.keys())

    def get_column_defs_for_table(self, table_name: str):
        return self._map_column_defs[table_name]
    
    def get_columns_for_table(self, table_name: str):
        return self._map_table_columns[table_name]

    def get_indexes_for_table(self, table_name: str):
        return self._map_indexes[table_name]
