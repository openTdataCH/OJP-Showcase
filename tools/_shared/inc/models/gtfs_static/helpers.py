from .stop import Stop
from .stop_time import Stop_Time

class Helpers:
    @staticmethod
    def parse_DB_row_stop_times(stop_times_s: str, map_stops, stops_separator: str = ' -- '):
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

        return stop_times

    @staticmethod
    def format_stop_time(s):
        if s is None:
            return ''
        
        return s            

    @staticmethod
    def parse_stop_time_s(s: str):
        if s == '':
            return None

        # Convert 1643 to 16:43
        if len(s) == 4:
            s = s[0:2] + ':' + s[2:4]

        return s