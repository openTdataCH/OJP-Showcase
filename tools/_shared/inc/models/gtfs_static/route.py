import sqlite3

from .agency import Agency

class Route:
    def __init__(self, route_id, agency: Agency, route_short_name, route_long_name, route_desc, route_type):
        self.route_id = route_id
        self.agency = agency
        self.route_short_name = route_short_name
        self.route_long_name = route_long_name
        self.route_desc = route_desc
        self.route_type = route_type

    @staticmethod
    def init_from_db_row(db_row: sqlite3.Row, map_agency):
        route_id = db_row['route_id']
        
        route_short_name = db_row['route_short_name']
        route_long_name = db_row['route_long_name']
        route_desc = db_row['route_desc']
        route_type = db_row['route_type']

        agency_id = db_row['agency_id']
        agency_db_row = map_agency[agency_id]
        gtfs_agency = Agency.init_from_db_row(agency_db_row)

        entry = Route(route_id, gtfs_agency, route_short_name, route_long_name, route_desc, route_type)

        return entry