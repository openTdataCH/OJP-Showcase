import os, sys

from dataclasses import dataclass
from typing import TypedDict, Union

class AgencyDB(TypedDict):
    agency_id: str
    agency_name: str
    agency_url: Union[str, None]

@dataclass
class Agency:
    id: str
    name: str
    url: Union[str, None] = None
    has_gtfs_rt: bool = False

    @classmethod
    def from_db_row(cls, row: AgencyDB) -> Agency:
        agency = Agency(
            id=row['agency_id'],
            name=row['agency_name'],
            url=row['agency_url'],
        )

        return agency
