import os, sys

from dataclasses import dataclass
from typing import TypedDict, Union

from .agency import Agency

class RouteDB(TypedDict):
    route_id: str
    agency_id: str
    route_short_name: str
    route_desc: Union[str, None]
    route_type: int
    day_bits: str

@dataclass
class Route:
    id: str
    agency: Agency
    route_short_name: str
    route_type: int
    route_desc: Union[str, None] = None

    @classmethod
    def from_db_row(cls, row: RouteDB, map_agency: dict[str, Agency]) -> Route:
        agency_id = row['agency_id']
        if agency_id not in map_agency:
            raise ValueError(f'cant find {agency_id} in map_agency')
        agency = map_agency[agency_id]

        route = Route(
            id=row['route_id'],
            agency=agency,
            route_short_name=row['route_short_name'],
            route_type=row['route_type'],
            route_desc=row['route_desc'],
        )

        return route