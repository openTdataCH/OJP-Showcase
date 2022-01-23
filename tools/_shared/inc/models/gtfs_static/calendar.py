import sys
import sqlite3
from datetime import datetime, timedelta

class Calendar:
    def __init__(self, service_id, start_date_s, end_date_s, day_bits, monday, tuesday, wednesday, thursday, friday, saturday, sunday):
        self.service_id = service_id
        self.monday = monday
        self.tuesday = tuesday
        self.wednesday = wednesday
        self.thursday = thursday
        self.friday = friday
        self.saturday = saturday
        self.sunday = sunday
        self.start_date = datetime.strptime(start_date_s, "%Y%m%d").date()
        self.end_date = datetime.strptime(end_date_s, "%Y%m%d").date()
        self.day_bits = day_bits

    @staticmethod
    def init_from_db_row(db_row: sqlite3.Row):
        service_id = db_row['service_id']
        start_date_s = db_row['start_date']
        end_date_s = db_row['end_date']
        day_bits = db_row['day_bits']

        monday = db_row.get('monday') or None
        tuesday = db_row.get('tuesday') or None
        wednesday = db_row.get('wednesday') or None
        thursday = db_row.get('thursday') or None
        friday = db_row.get('friday') or None
        saturday = db_row.get('saturday') or None
        sunday = db_row.get('sunday') or None

        entry = Calendar(
            service_id, start_date_s, end_date_s, day_bits,
            monday, tuesday, wednesday, thursday, friday, saturday, sunday
        )

        return entry

    def _compute_week_pattern(self):
        pattern_parts = [
            f'{self.monday or "·"}',
            f'{self.tuesday or "·"}',
            f'{self.wednesday or "·"}',
            f'{self.thursday or "·"}',
            f'{self.friday or "·"}',
            f'{self.saturday or "·"}',
            f'{self.sunday or "·"}',
        ]

        pattern_s = ''.join(pattern_parts)
        return pattern_s

    def compute_month_data_rows(self):
        # First day of Dec
        calendar_day1_s = self.start_date.strftime('%Y-%m-01')
        current_day = datetime.strptime(calendar_day1_s, "%Y-%m-%d").date()

        month_data_rows = []
        empty_day_bit_rows = []
        prev_month_key = None

        map_weekday_f = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

        while current_day <= self.end_date:
            month_key = current_day.strftime('%Y-%m')
            if prev_month_key != month_key:
                # Padding with None to always start from Monday
                empty_day_bit_rows = [None] * current_day.weekday()
                month_data = {
                    'month_key': month_key,
                    'day_bit_rows': empty_day_bit_rows,
                }
                month_data_rows.append(month_data)

                prev_month_key = month_key

            day_bit = None
            if current_day >= self.start_date:
                day_idx = (current_day - self.start_date).days
                day_bit = self.day_bits[day_idx] == '1'
            day_bit_row = {
                'day_f': f'{current_day}',
                'day_w': map_weekday_f[current_day.weekday()],
                'day_bit': day_bit,
            }
            month_data['day_bit_rows'].append(day_bit_row)

            current_day += timedelta(days=1)

        return month_data_rows

    def _debug_days(self):
        month_data_rows = self.compute_month_data_rows()

        header_separator_s = '-' * 60
        print(f'{header_separator_s}')

        week_days_s = 'MTWTFSS ' * 6
        print(f'Month   : {week_days_s}')

        print(f'{header_separator_s}')

        for month_data in month_data_rows:
            month_bits_formatted = []
            for (idx, day_bit_data) in enumerate(month_data['day_bit_rows']):
                day_bit_s = ' '
                if day_bit_data is not None:
                    day_bit = day_bit_data['day_bit']
                    day_bit_s = ' '
                    if day_bit is not None:
                        day_bit_s = '1' if day_bit else '·'
                month_bits_formatted.append(day_bit_s)
                
                # space after weekdays
                if (idx % 7) == 6:
                    month_bits_formatted.append(' ')
            month_key = month_data['month_key']

            month_bits_s = ''.join(month_bits_formatted)
            print(f'{month_key} : {month_bits_s}')

        print(f'{header_separator_s}')

    def pretty_print(self):
        header_separator_s = '-' * 60
        print(f'{header_separator_s}')

        print(f'service_id  : {self.service_id}')

        if self.monday:
            print(f'{header_separator_s}')
            print(f'week pattern: MTWTFSS')
            print(f'week pattern: {self._compute_week_pattern()}')

        self._debug_days()