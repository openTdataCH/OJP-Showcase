import sqlite3

from typing import List, Union

from .calendar import Calendar
from .route import Route
from .stop import Stop
from .stop_time import Stop_Time
from .helpers import Helpers

class Trip:
    def __init__(self, trip_id, trip_short_name, departure_day_minutes, arrival_day_minutes, departure_time, arrival_time, stop_times: List[Stop_Time], service: Calendar, route: Route):
        self.trip_id = trip_id
        self.trip_short_name = trip_short_name
        self.departure_day_minutes = departure_day_minutes
        self.arrival_day_minutes = arrival_day_minutes
        self.departure_time = departure_time[0:5]
        self.arrival_time = arrival_time[0:5]
        self.stop_times = stop_times
        self.service = service
        self.route = route

    @staticmethod
    def init_from_db_row(db_row: sqlite3.Row, map_calendar, map_agency, map_routes, map_stops):
        trip_id = db_row['trip_id']
        trip_short_name = db_row['trip_short_name']
        departure_day_minutes = db_row['departure_day_minutes']
        arrival_day_minutes = db_row['arrival_day_minutes']
        departure_time = db_row['departure_time']
        arrival_time = db_row['arrival_time']
        stop_times_s = db_row['stop_times_s']

        service_id = db_row['service_id']
        service_res = map_calendar[service_id]
        if isinstance(service_res, Calendar):
            gtfs_calendar = service_res
        else:
            gtfs_calendar = Calendar.init_from_db_row(service_res)

        if stop_times_s is None:
            raise Exception('ERROR - stop_times_s is not populated')

        route_id = db_row['route_id']
        route_res = map_routes[route_id]
        if isinstance(route_res, Route):
            gtfs_route = route_res
        else:
            gtfs_route = Route.init_from_db_row(route_res, map_agency)

        stop_times = Helpers.parse_DB_row_stop_times(stop_times_s, map_stops)
        
        entry = Trip(trip_id, trip_short_name, departure_day_minutes, arrival_day_minutes, departure_time, arrival_time, stop_times, gtfs_calendar, gtfs_route)

        return entry

    def pretty_print(self):
        header_separator_s = '-' * 60
        print(f'{header_separator_s}')

        print(f'trip_id           : {self.trip_id}')
        print(f'service_id        : {self.service.service_id}')
        print(f'short_name        : {self.trip_short_name}')
        print(f'trip_dep_time     : {self.departure_time}')
        print(f'trip_arr_time     : {self.arrival_time}')

        print(f'route_id          : {self.route.route_id}')
        print(f'route_desc        : {self.route.route_desc}')
        print(f'route_short_name  : {self.route.route_short_name}')
        print(f'route_type        : {self.route.route_type}')

        agency_id_s = self.route.agency.agency_id.ljust(10, ' ')
        print(f'agency            : {agency_id_s} {self.route.agency.agency_name}')
        print(f'{header_separator_s}')

        print(f'Stops: ')
        for stop_time in self.stop_times:
            stop_id_s = stop_time.stop.stop_id.ljust(12, ' ')
            stop_name_s = f'{stop_time.stop.stop_name} '.ljust(49, '·')
            stop_arr_s = Helpers.format_stop_time(stop_time.arrival_time).ljust(5, ' ')
            stop_dep_s = Helpers.format_stop_time(stop_time.departure_time)
            print(f'{stop_id_s} - {stop_name_s} {stop_arr_s} {stop_dep_s}')
        
        print(' ')

    def from_stop_time(self) -> Union[Stop_Time, None]:
        if len(self.stop_times) == 0:
            return None

        return self.stop_times[0]

    def to_stop_time(self) -> Union[Stop_Time, None]:
        if len(self.stop_times) == 0:
            return None

        return self.stop_times[len(self.stop_times) - 1]

def _parse_db_row_stop_times(stop_times_s: str, map_stops, stops_separator: str = ' -- '):
    stop_times = []

    stop_times_data = stop_times_s.split(stops_separator)
    for (idx, stop_time_s) in enumerate(stop_times_data):
        stop_time_parts = stop_time_s.split('|')
        
        stop_id = stop_time_parts[0]

        stop_db_row = map_stops[stop_id]
        gtfs_stop = Stop.init_from_db_row(stop_db_row)

        arrival_time = Helpers.parse_stop_time_s(stop_time_parts[1])
        departure_time = Helpers.parse_stop_time_s(stop_time_parts[2])

        stop_sequence = idx + 1
        
        stop_time = Stop_Time(gtfs_stop, stop_sequence, arrival_time, departure_time)
        
        stop_times.append(stop_time)