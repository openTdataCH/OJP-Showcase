import os
import sys

from pathlib import Path

from dataclasses import dataclass, asdict
from typing import List, Dict, Optional

@dataclass
class CKAN_Resource:
    identifier: str
    mimetype: str
    title: Dict[str, str]
    url: str
    created_s: str
    modified_s: str
    
    filename: str
    extension: str

    def __init__(self, **kwargs):
        # do this way otherwise we get a linter error
        dataclass_fields = getattr(self, '__dataclass_fields__', {})
        
        for field_name, field_metadata in dataclass_fields.items():
            value = kwargs.get(field_name, field_metadata.default)
            self.set_field(field_name, value, kwargs)
        
        res_filename = CKAN_Resource._compute_filename(kwargs['url'])
        self.filename = res_filename
        self.extension = CKAN_Resource._compute_extension(res_filename)
            
    def set_field(self, field_name, value, kwargs):
        if field_name == 'created_s':
            value = kwargs['created']
        if field_name == 'modified_s':
            value = kwargs.get('modified', None)

        setattr(self, field_name, value)
    
    @staticmethod
    def _compute_filename(res_url: str):
        res_filename = res_url.split('/')[-1]
        return res_filename
    
    @staticmethod
    def _compute_extension(res_filename: str):
        res_extension = Path(res_filename).suffix.lower()
        return res_extension
        
        
@dataclass
class CKAN_Result:
    resources: List[CKAN_Resource]

    def __init__(self, **kwargs):
        self.resources = []
        for resource_json in kwargs['resources']:
            ckan_resource = CKAN_Resource(**resource_json)
            self.resources.append(ckan_resource)
        # loop resources

@dataclass
class CKAN_Data:
    result: CKAN_Result

    def __init__(self, **kwargs):
        self.result = CKAN_Result(**kwargs['result'])

    @staticmethod
    def from_ckan_json(ckan_json):
        ckan_data = CKAN_Data(**ckan_json)
        return ckan_data
    