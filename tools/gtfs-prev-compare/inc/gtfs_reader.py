import os, sys
import csv

from pathlib import Path

from .shared.inc.helpers.gtfs_helpers import compute_formatted_date_from_gtfs_folder_path
from .shared.inc.helpers.file_helpers import compute_file_rows_no

class GTFS_Reader:
    def compute_gtfs_stats(gtfs_a_path: Path, gtfs_b_path: Path):
        gtfs_table_names = ['agency', 'calendar_dates', 'calendar', 'routes', 'stop_times', 'stops', 'transfers', 'trips']

        gtfs_a_date_f = compute_formatted_date_from_gtfs_folder_path(gtfs_a_path)
        gtfs_b_date_f = compute_formatted_date_from_gtfs_folder_path(gtfs_b_path)

        print(f'--------------------------------------------------------------------------------')
        print(f'| table              | GTFS {gtfs_a_date_f} | GTFS {gtfs_b_date_f} |  DELTA |')
        print(f'--------------------------------------------------------------------------------')

        for table_name in gtfs_table_names:
            gtfs_a_table_lines_no = GTFS_Reader._count_gtfs_file_rows_no(gtfs_a_path, table_name)
            gtfs_b_table_lines_no = GTFS_Reader._count_gtfs_file_rows_no(gtfs_b_path, table_name)
            lines_diff_no = gtfs_b_table_lines_no - gtfs_a_table_lines_no

            gtfs_a_table_lines_no_f = str(gtfs_a_table_lines_no).rjust(15, ' ')
            gtfs_b_table_lines_no_f = str(gtfs_b_table_lines_no).rjust(15, ' ')
            lines_diff_no_f = str(lines_diff_no).rjust(6, ' ')
            print(f'| {table_name.ljust(18, " ")} | {gtfs_a_table_lines_no_f} | {gtfs_b_table_lines_no_f} | {lines_diff_no_f} |')

    def _load_gtfs_file(gtfs_path: str, table_name: str, group_by_field_name: str = None):
        gtfs_file_path = Path(f'{gtfs_path}/{table_name}.txt')

        map_rows = {}
        table_rows = []

        do_check_group_by_field_name = True

        csv_handler = open(gtfs_file_path, encoding='utf-8-sig')
        csv_reader = csv.DictReader(csv_handler)
        for row_db in csv_reader:
            row_item = {}
            for column_name in row_db.keys():
                row_item[column_name] = row_db[column_name]

            if group_by_field_name:
                if do_check_group_by_field_name and group_by_field_name not in row_db:
                    print(f'ERROR - pk {group_by_field_name} not found in DB row')
                    print(row_db)
                    sys.exit(1)
                pk = row_db[group_by_field_name]
                map_rows[pk] = row_item
            else:
                table_rows.append(row_item)

        if group_by_field_name:
            return map_rows
        else:
            return table_rows

    def compare_agency(gtfs_path_a: Path, gtfs_path_b: Path):
        agency_a = GTFS_Reader._load_gtfs_file(gtfs_path_a, 'agency', 'agency_id')
        agency_b = GTFS_Reader._load_gtfs_file(gtfs_path_b, 'agency', 'agency_id')

        agency_a_ids = agency_a.keys()
        agency_b_ids = agency_b.keys()

        added_agency_ids = agency_b_ids - agency_a_ids
        removed_agency_ids = agency_a_ids - agency_b_ids

        print('')
        print('AGENCY:')

        print(f'- added {len(added_agency_ids)} items in {gtfs_path_b.name}')
        for agency_id in added_agency_ids:
            agency_data = agency_b[agency_id]
            agency_name = agency_data['agency_name']
            print(f' -- {agency_id} - {agency_name}')

        print(f'- removed {len(removed_agency_ids)} items from {gtfs_path_a.name}')
        for agency_id in removed_agency_ids:
            agency_data = agency_a[agency_id]
            agency_name = agency_data['agency_name']
            print(f' -- {agency_id} - {agency_name}')

    def compare_routes(gtfs_path_a: str, gtfs_path_b: str):
        routes_a = GTFS_Reader._load_gtfs_file(gtfs_path_a, 'routes', 'route_id')
        routes_b = GTFS_Reader._load_gtfs_file(gtfs_path_b, 'routes', 'route_id')

        added_route_ids = routes_b.keys() - routes_a.keys()
        removed_route_ids = routes_a.keys() - routes_b.keys()

        map_added_routes = {}
        for route_id in added_route_ids:
            route_data = routes_b[route_id]
            agency_id = route_data['agency_id']
            if not agency_id in map_added_routes:
                map_added_routes[agency_id] = {
                    'agency_id': agency_id,
                    'route_ids': [],
                }
            
            map_added_routes[agency_id]['route_ids'].append(route_id)

        map_removed_routes = {}
        for route_id in removed_route_ids:
            route_data = routes_a[route_id]
            agency_id = route_data['agency_id']
            if not agency_id in map_removed_routes:
                map_removed_routes[agency_id] = {
                    'agency_id': agency_id,
                    'route_ids': [],
                }
            
            map_removed_routes[agency_id]['route_ids'].append(route_id)

        added_routes = list(map_added_routes.values())
        removed_routes = list(map_removed_routes.values())

        added_routes.sort(key=lambda agency_data: len(agency_data['route_ids']), reverse=True)
        removed_routes.sort(key=lambda agency_data: len(agency_data['route_ids']), reverse=True)

        print('')
        print('ROUTES:')
        routes_no = GTFS_Reader._compute_routes_no(added_routes)
        print(f'- added {routes_no} items in {gtfs_path_b.name}')
        GTFS_Reader._generate_routes_report(added_routes)

        routes_no = GTFS_Reader._compute_routes_no(removed_routes)
        print(f'- removed {routes_no} items from {gtfs_path_a.name}')
        GTFS_Reader._generate_routes_report(removed_routes)
        
    def _compute_routes_no(routes_data):
        routes_no = 0
        for agency_data in routes_data:
            routes_no += len(agency_data['route_ids'])
        return routes_no

    def _generate_routes_report(routes_data):
        for agency_data in routes_data:
            agency_id = agency_data['agency_id']
            routes_no = len(agency_data['route_ids'])
            print(f'  - {agency_id} - {routes_no} items')
            for route_id in agency_data['route_ids']:
                print(f'    - {route_id}')

    def compare_stops(gtfs_path_a: str, gtfs_path_b: str):
        stops_a = GTFS_Reader._load_and_filter_stops(gtfs_path_a)
        stops_b = GTFS_Reader._load_and_filter_stops(gtfs_path_b)

        added_stop_ids = stops_b.keys() - stops_a.keys()
        removed_stop_ids = stops_a.keys() - stops_b.keys()

        print('')
        print('STOPS:')
        
        stops_no = len(added_stop_ids)
        print(f'- added {stops_no} items in {gtfs_path_b.name}')
        GTFS_Reader._generate_stops_report(added_stop_ids, stops_b)

        stops_no = len(removed_stop_ids)
        print(f'- removed {stops_no} items from {gtfs_path_a.name}')
        GTFS_Reader._generate_stops_report(removed_stop_ids, stops_a)

    def _load_and_filter_stops(gtfs_path):
        map_stops_all = GTFS_Reader._load_gtfs_file(gtfs_path, 'stops', 'stop_id')
        map_stops_filtered = {}
        for stop_id in map_stops_all:
            stop_data = map_stops_all[stop_id]

            location_type = 0
            if stop_data['location_type'] != '':
                location_type = int(stop_data['location_type'])
            
            if location_type == 0:
                map_stops_filtered[stop_id] = stop_data

        return map_stops_filtered

    def _generate_stops_report(stop_ids, map_stops):
        stop_ids = list(stop_ids)
        stop_ids.sort()

        for stop_id in stop_ids:
            stop_data = map_stops[stop_id]
            stop_name = stop_data['stop_name']
            print(f'  - {stop_id} - {stop_name}')

    def compare_transfers(gtfs_path_a: str, gtfs_path_b: str):
        stops_a = GTFS_Reader._load_gtfs_file(gtfs_path_a, 'stops', 'stop_id')
        stops_b = GTFS_Reader._load_gtfs_file(gtfs_path_b, 'stops', 'stop_id')

        transfers_a = GTFS_Reader._load_gtfs_file(gtfs_path_a, 'transfers')
        transfers_b = GTFS_Reader._load_gtfs_file(gtfs_path_b, 'transfers')

        map_transfers_a = GTFS_Reader._compute_map_transfers(transfers_a)
        map_transfers_b = GTFS_Reader._compute_map_transfers(transfers_b)

        added_transfer_keys = map_transfers_b.keys() - map_transfers_a.keys()
        removed_transfer_keys = map_transfers_a.keys() - map_transfers_b.keys()

        print('')
        print('TRANSFERS:')

        transfers_no = len(added_transfer_keys)
        print(f'- added {transfers_no} items in {gtfs_path_b.name}')
        GTFS_Reader._generate_transfers_report(sorted(added_transfer_keys), map_transfers_b, stops_b)

        transfers_no = len(removed_transfer_keys)
        print(f'- removed {transfers_no} items from {gtfs_path_a.name}')
        GTFS_Reader._generate_transfers_report(sorted(removed_transfer_keys), map_transfers_a, stops_a)

    def _compute_map_transfers(gtfs_transfers):
        map_transfers = {}
        for transfer_data in gtfs_transfers:
            transfer_key = transfer_data['from_stop_id'] + '_' + transfer_data['to_stop_id'] + '_' + transfer_data['transfer_type']
            map_transfers[transfer_key] = transfer_data
        return map_transfers

    def _generate_transfers_report(transfer_keys, map_transfers, map_stops):
        for transfer_key in transfer_keys:
            transfer_data = map_transfers[transfer_key]
            from_stop_id = transfer_data['from_stop_id']
            from_stop_data = map_stops[from_stop_id]
            from_stop_name = from_stop_data['stop_name']
            to_stop_id = transfer_data['to_stop_id']
            to_stop_data = map_stops[to_stop_id]
            to_stop_name = to_stop_data['stop_name']

            transfer_key = f'{from_stop_id} -- {to_stop_id}'
            transfer_key_f = transfer_key.ljust(40, ' ')

            print(f'  - {transfer_key_f} :: {from_stop_name} -- {to_stop_name}')

    def _count_gtfs_file_rows_no(gtfs_path: str, table_name: str):
        gtfs_file_path = Path(f'{gtfs_path}/{table_name}.txt')
        file_lines_no = compute_file_rows_no(gtfs_file_path)
        gtfs_files_lines_no = file_lines_no - 1
        return gtfs_files_lines_no

