import os
import sys

from dataclasses import dataclass, asdict
from typing import List, Dict, Optional

@dataclass
class CKAN_Resource:
    identifier: str
    mimetype: str
    title: Dict[str, str]
    url: str
    modified_s: str

    def __init__(self, **kwargs):
        self.identifier = kwargs['identifier']
        self.mimetype = kwargs['mimetype']
        self.title = kwargs['title']
        self.url = kwargs['url']
        self.modified_s = kwargs['modified']
        
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
    