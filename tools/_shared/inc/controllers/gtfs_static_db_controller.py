import os, sys
import sqlite3
from datetime import datetime, timedelta, date
from pathlib import Path

class GTFS_Static_DB_Controller:

    def __init__(self, gtfs_db_path: Path):
        db = sqlite3.connect(str(gtfs_db_path))
        db.row_factory = sqlite3.Row

        self.db = db

        (from_date, to_date) = self._fetch_calendar_dates()
        self.from_date = from_date
        self.to_date = to_date

    def _fetch_calendar_dates(self):
        sql = 'SELECT start_date, end_date FROM calendar LIMIT 1'
        
        cursor = self.db.cursor()
        cursor.execute(sql)
        db_row = cursor.fetchone()
        cursor.close()

        start_date_s = db_row['start_date']
        end_date_s = db_row['end_date']

        start_date = datetime.strptime(start_date_s, "%Y%m%d").date()
        end_date = datetime.strptime(end_date_s, "%Y%m%d").date()

        return (start_date, end_date)

    def compute_day_idx(self, request_datetime: datetime):
        if isinstance(request_datetime, datetime):
            request_date = request_datetime.date()
        else:
            request_date = request_datetime
        
        day_idx = (request_date-self.from_date).days

        return day_idx
