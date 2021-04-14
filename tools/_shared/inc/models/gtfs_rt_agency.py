import csv
import collections

class GTFS_RT_Agency:
    def __init__(self, agency_short_id, agency_name = None, start_interrupt = None, end_interrupt = None, comment = None):
        self.agency_short_id = agency_short_id
        self.agency_name = agency_name
        self.start_interrupt = start_interrupt
        self.end_interrupt = end_interrupt
        self.comment = comment

    @staticmethod
    def init_from_csv_dict(csv_dict: collections.OrderedDict):
        agency_short_id = csv_dict['Company-GO-ID']
        agency_name = csv_dict['Company name']
        start_interrupt = csv_dict['Start Interrupt']
        end_interrupt = csv_dict['End Interrupt']
        comment = csv_dict['Comment']

        rt_agency = GTFS_RT_Agency(agency_short_id, agency_name, start_interrupt, end_interrupt, comment)
        return rt_agency
