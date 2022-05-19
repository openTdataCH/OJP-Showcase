import sqlite3

from .stop import Stop

class Stop_Time:
    def __init__(self, stop: Stop, stop_sequence: int, arrival_time: str, departure_time: str, trip_id = None, pickup_type = None, drop_off_type = None):
        self.trip_id = trip_id
        self.arrival_time = arrival_time
        self.departure_time = departure_time
        self.stop = stop
        self.stop_sequence = stop_sequence
        self.pickup_type = pickup_type
        self.drop_off_type = drop_off_type

    @staticmethod
    def init_from_db_row(db_row: sqlite3.Row):
        trip_id = db_row['trip_id']
        arrival_time = db_row['arrival_time']
        departure_time = db_row['departure_time']
        stop_id = db_row['stop_id']
        stop_sequence = db_row['stop_sequence']
        pickup_type = db_row['pickup_type']
        drop_off_type = db_row['drop_off_type']

        entry = Stop_Time(stop_id, stop_sequence, arrival_time, departure_time, trip_id, pickup_type, drop_off_type)

        return entry

    def as_json(self):
        stop_time_json = {
            'stop_id': self.stop.stop_id,
            'arrival_time': self.arrival_time,
            'departure_time': self.departure_time,
            'stop_sequence': self.stop_sequence,
        }

        return stop_time_json

