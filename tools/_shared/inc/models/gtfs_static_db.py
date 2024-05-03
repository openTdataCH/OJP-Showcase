import os, sys

from dataclasses import dataclass
from typing import List, Optional

@dataclass
class Route:
    route_id: str
    agency_id: str
    route_short_name: str
    route_long_name: str
    route_type: int
    route_desc: Optional[str] = None

@dataclass
class Trip:
    trip_id: str
    route_id: str
    service_id: str
    trip_headsign: Optional[str] = None
    trip_short_name: Optional[str] = None
    direction_id: Optional[str] = None
    departure_day_minutes: Optional[int] = None
    arrival_day_minutes: Optional[int] = None
    departure_time: Optional[str] = None
    arrival_time: Optional[str] = None
    stop_times_s: Optional[str] = None
    shape_id: Optional[str] = None
