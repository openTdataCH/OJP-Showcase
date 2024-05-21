import os, sys

from dataclasses import dataclass, asdict
from typing import List, Dict
from datetime import datetime

from .gtfs_rt import Entity

@dataclass
class GTFS_RT_Static_Report_Metadata:
    report_dt: datetime
    gtfs_db_filename: str
    gtfs_db_age: float
    gtfs_rt_filename: str
    gtfs_rt_ts: int
    gtfs_rt_dt: datetime
    gtfs_rt_age: int
    
    total_rows_no: int
    tripOK_routeOK_no: int
    tripOK_routeNOK_no: int
    tripNOK_routeOK_no: int
    tripNOK_routeNOK_no: int
    # Trip NOT matched, TripId DOESNT start with ojp:       - should be 0 items
    tripNOK_NOJP_no: int
    
    @staticmethod
    def from_json(data_json):
        metadata = GTFS_RT_Static_Report_Metadata(**data_json)
        metadata.report_dt = datetime.strptime(metadata.report_dt, '%Y-%m-%d %H:%M:%S')
        metadata.gtfs_rt_dt = datetime.strptime(metadata.gtfs_rt_dt, '%Y-%m-%d %H:%M:%S')
        
        return metadata
    
    def as_json(self):
        data_json = asdict(self)
        for metadata_key in ['report_dt', 'gtfs_rt_dt']:
            metadata_dt: datetime = data_json[metadata_key]
            data_json[metadata_key] = metadata_dt.strftime('%Y-%m-%d %H:%M:%S')
        
        return data_json

@dataclass
class GTFS_RT_Static_Report:
    metadata: GTFS_RT_Static_Report_Metadata
    
    tripOK_routeNOK: List[str]
    tripNOK_routeOK: List[str]
    tripNOK_routeNOK: List[str]
    
    @staticmethod
    def init_with_metadata(metdata: GTFS_RT_Static_Report_Metadata):
        report = GTFS_RT_Static_Report(metdata, [], [], [])
        return report
    
    @staticmethod
    def from_json(report_json):
        report = GTFS_RT_Static_Report(**report_json)
        report.metadata = GTFS_RT_Static_Report_Metadata.from_json(report_json['metadata'])
        
        entity_group_keys = ['tripOK_routeNOK', 'tripNOK_routeOK', 'tripNOK_routeNOK']
        for entity_group_key in entity_group_keys:
            entity_ids = []
            for entity_id in report_json[entity_group_key]:
                entity_ids.append(entity_id)
            
            setattr(report, entity_group_key, entity_ids)
        # entity_group_keys
        
        return report
    
    def as_json(self):
        data_json = asdict(self)
        data_json['metadata'] = self.metadata.as_json()
        
        return data_json
    
@dataclass
class GTFS_RT_Static_Monthly_Report:
    comments: str
    report_days: Dict[str, Dict[str, GTFS_RT_Static_Report_Metadata]]
    
    def as_json(self):
        data_json = asdict(self)
        
        return data_json
