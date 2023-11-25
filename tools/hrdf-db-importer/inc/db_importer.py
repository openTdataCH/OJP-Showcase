import os
import sys

from pathlib import Path

from .HRDF_Parser.shared.inc.helpers.log_helpers import log_message
from .HRDF_Parser.shared.inc.helpers.config_helpers import load_yaml_config

from .HRDF_Parser.parse_betrieb import import_db_betrieb
from .HRDF_Parser.parse_bitfeld import import_db_bitfeld
from .HRDF_Parser.parse_fplan_stop_times import import_db_stop_times
from .HRDF_Parser.parse_fplan import import_db_fplan
from .HRDF_Parser.parse_gleis import import_db_gleis
from .HRDF_Parser.parse_meta_stops import import_meta_stops
from .HRDF_Parser.parse_stops import import_db_stops
from .HRDF_Parser.parse_line import import_db_line

class HRDF_DB_Importer:
    def __init__(self, app_config, hrdf_path, db_path):
        if isinstance(hrdf_path, str):
            hrdf_path = Path(hrdf_path)
        if isinstance(db_path, str):
            db_path = Path(db_path)

        self.app_config = app_config
        self.hrdf_path = hrdf_path
        self.db_path = db_path

        print('-' * 100)
        log_message('HRDF IMPORT - v.20231125-001')
        print('-' * 100)
        log_message(f'HRDF folder input path    : {hrdf_path}')
        log_message(f'HRDF DB output path       : {db_path}')
        print('-' * 100)

        db_schema_path = app_config['hrdf_db_schema_path']
        self.db_schema_config = load_yaml_config(db_schema_path)

    def parse_all(self):
        print('-' * 100)
        log_message("HRDF IMPORT -- START")

        print('-' * 100)
        import_db_bitfeld(self.hrdf_path, self.db_path, self.db_schema_config)
        print('-' * 100)
        import_db_gleis(self.app_config, self.hrdf_path, self.db_path, self.db_schema_config)
        print('-' * 100)
        import_db_line(self.app_config, self.db_schema_config, self.hrdf_path, self.db_path)
        print('-' * 100)
        import_db_fplan(self.app_config, self.hrdf_path, self.db_path)
        print('-' * 100)
        import_db_stop_times(self.app_config, self.db_path)
        print('-' * 100)
        import_db_betrieb(self.hrdf_path, self.db_path, self.db_schema_config)
        print('-' * 100)
        import_db_stops(self.hrdf_path, self.db_path, self.db_schema_config)
        print('-' * 100)
        import_meta_stops(self.app_config, self.hrdf_path, self.db_path, self.db_schema_config)
        print('-' * 100)

        log_message("HRDF IMPORT -- DONE")
