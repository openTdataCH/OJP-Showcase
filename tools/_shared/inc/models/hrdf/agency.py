import sqlite3

class Agency:
    def __init__(self, agency_id, short_name, long_name, full_name_de, full_name_en, full_name_fr, full_name_it, in_fplan):
        self.agency_id = agency_id
        self.short_name = short_name
        self.long_name = long_name
        self.full_name_de = full_name_de
        self.full_name_en = full_name_en
        self.full_name_fr = full_name_fr
        self.full_name_it = full_name_it
        self.in_fplan = in_fplan

    @staticmethod
    def init_from_db_row(db_row: sqlite3.Row):
        agency_id = db_row['agency_id']
        short_name = db_row['short_name']
        long_name = db_row['long_name']
        full_name_de = db_row['full_name_de']
        full_name_en = db_row['full_name_en']
        full_name_fr = db_row['full_name_fr']
        full_name_it = db_row['full_name_it']
        in_fplan = db_row['in_fplan']

        entry = Agency(agency_id, short_name, long_name, full_name_de, full_name_en, full_name_fr, full_name_it, in_fplan)

        return entry