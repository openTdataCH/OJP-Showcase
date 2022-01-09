import sqlite3

class Agency:
    def __init__(self, agency_id: str, agency_name, agency_url, agency_timezone, agency_lang, agency_phone):
        self.agency_id = agency_id
        self.agency_name = agency_name
        self.agency_url = agency_url
        self.agency_timezone = agency_timezone
        self.agency_lang = agency_lang
        self.agency_phone = agency_phone

    @staticmethod
    def init_from_db_row(db_row: sqlite3.Row):
        agency_id = db_row['agency_id']
        agency_name = db_row['agency_name']
        agency_url = db_row['agency_url']
        agency_timezone = db_row['agency_timezone']
        agency_lang = db_row['agency_lang']
        agency_phone = db_row['agency_phone']

        entry = Agency(agency_id, agency_name, agency_url, agency_timezone, agency_lang, agency_phone)

        return entry