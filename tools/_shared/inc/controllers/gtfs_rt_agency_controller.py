import os, sys
import csv
from pathlib import Path

from ..models.gtfs_rt_agency import GTFS_RT_Agency

class GTFS_RT_Agency_Controller:
    def __init__(self, go_realtime_csv_path: Path):
        self.map_rt_agency = {}
        self.has_rt_data = False
        
        if go_realtime_csv_path:
            self.has_rt_data = True
            self._parse_csv(go_realtime_csv_path)
        
    def _parse_csv(self, csv_path: Path):
        csv_handler = open(csv_path)
        csv_reader = csv.DictReader(csv_handler)
        
        for row in csv_reader:
            rt_agency = GTFS_RT_Agency.init_from_csv_dict(row)
            self.map_rt_agency[rt_agency.agency_short_id] = rt_agency

    def compute_agency_ids(self):
        agency_ids = self.map_rt_agency.keys()
        return agency_ids
    
    def is_rt_enabled(self, agency_id: str):
        if not self.has_rt_data:
            return False

        has_rt = agency_id in self.map_rt_agency

        return has_rt
