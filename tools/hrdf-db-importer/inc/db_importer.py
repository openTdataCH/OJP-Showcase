import yaml
import os, sys

from .shared.inc.helpers.log_helpers import log_message

from .HRDF_Parser.parse_betrieb import import_db_betrieb
from .HRDF_Parser.parse_bitfeld import import_db_bitfeld
from .HRDF_Parser.parse_fplan_stop_times import import_db_stop_times
from .HRDF_Parser.parse_fplan import import_db_fplan
from .HRDF_Parser.parse_gleis import import_db_gleis
from .HRDF_Parser.parse_meta_stops import import_meta_stops
from .HRDF_Parser.parse_stops import import_db_stops

class HRDF_DB_Importer:
    def __init__(self, app_config, hrdf_path, db_path):
        self.app_config = app_config
        self.hrdf_path = hrdf_path
        self.db_path = db_path
        self.db_schema_config = self._load_schema_config()

    def parse_all(self):
        log_message("START")
        
        import_db_bitfeld(self.hrdf_path, self.db_path, self.db_schema_config)
        import_db_gleis(self.hrdf_path, self.db_path, self.db_schema_config)
        import_db_fplan(self.hrdf_path, self.db_path, self.db_schema_config)
        import_db_stop_times(self.app_config, self.db_path, self.db_schema_config)
        import_db_betrieb(self.hrdf_path, self.db_path, self.db_schema_config)
        import_db_stops(self.hrdf_path, self.db_path, self.db_schema_config)
        import_meta_stops(self.hrdf_path, self.db_path, self.db_schema_config)

        log_message("DONE")

    # private
    def _load_schema_config(self):
        dir_path = os.path.dirname(os.path.realpath(__file__))
        db_schema_path = os.path.abspath(dir_path + "/hrdf_schema.yml")
        db_schema_config = yaml.safe_load(open(db_schema_path))

        return db_schema_config
