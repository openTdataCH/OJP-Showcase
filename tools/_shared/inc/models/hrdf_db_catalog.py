import os
import sys

from dataclasses import dataclass, asdict
from typing import List, Dict

@dataclass
class HRDF_Catalog_Metadata:
    comment: str
    last_update: str # %Y-%m-%d %H:%M:%S

@dataclass
class HRDF_Catalog_Item:
    hrdf_datetime_s: str # %Y-%m-%d %H:%M
    hrdf_day: str # %Y-%m-%d
    table_stats: Dict[str, int]
    db_relative_path: str
    
    def as_json(self):
        data_json = asdict(self)
        if self.db_relative_path is None:
            data_json['db_relative_path'] = None

        return data_json

@dataclass
class HRDF_Catalog_Report:
    metadata: HRDF_Catalog_Metadata
    items: List[HRDF_Catalog_Item]
    
    @staticmethod
    def from_json(report_json):
        report = HRDF_Catalog_Report(**report_json)
        report.items = []
        for report_item_json in report_json['items']:
            report_item = HRDF_Catalog_Item(**report_item_json)
            report.items.append(report_item)

        return report
    
    def as_json(self):
        data_json = asdict(self)
        
        data_json['items'] = []
        for item in self.items:
            item_json = item.as_json()
            data_json['items'].append(item_json)
        
        return data_json
