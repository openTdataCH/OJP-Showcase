import sqlite3

class Stop:
    def __init__(self, stop_id: str, stop_name: str, stop_lon, stop_lat, location_type, parent_station):
        self.stop_id = stop_id
        self.stop_name = stop_name
        self.stop_lon = stop_lon
        self.stop_lat = stop_lat
        self.location_type = location_type
        self.parent_station = parent_station

    @staticmethod
    def init_from_db_row(db_row: sqlite3.Row):
        stop_id = db_row['stop_id']
        stop_name = db_row['stop_name']
        stop_lon = db_row['stop_lon']
        stop_lat = db_row['stop_lat']

        location_type = db_row.get('location_type') or None
        parent_station = db_row.get('parent_station') or None

        entry = Stop(stop_id, stop_name, stop_lon, stop_lat, location_type, parent_station)

        return entry
        