import csv
import json
import os
import re
import sqlite3
import sys

from ..shared.inc.helpers.db_helpers import load_sql_from_file, count_rows_table, table_select_rows
from ..shared.inc.helpers.log_helpers import log_message
from ..shared.inc.helpers.config_helpers import load_yaml_config

class HRDF_Stops_Reporter:
    def __init__(self, db_path):
        self.db_path = db_path
        self.db_handle = sqlite3.connect(db_path)

        dir_path = os.path.dirname(os.path.realpath(__file__))
        config_path = f"{dir_path}/config/config.yml"
        self.config = load_yaml_config(config_path, app_path=dir_path)

    def generate_json(self, json_path: str):
        map_service_type_main_vehicle_type = self._load_map_service_type_main_vehicle_type()

        # Save to a intermediary stop so we can resume from here without waiting for the DB query
        map_stop_data_path = json_path.replace('.json', '_step1.json')
        
        map_stop_data = self._fetch_main_stop_data()        
        stops_json_file = open(map_stop_data_path, 'w')
        stops_json_file.write(json.dumps(map_stop_data, indent=4))
        stops_json_file.close()
        log_message(f"saved DB data in {map_stop_data_path}")

        # stops_json_file = open(map_stop_data_path)
        # map_stop_data = json.loads(stops_json_file.read())
        # stops_json_file.close()

        map_db_stops = table_select_rows(self.db_handle, table_name = "stops", group_by_key = "stop_id")
        self._attach_stops_relations(map_stop_data, map_db_stops)

        stops_report_json = self._compute_stops_report_json(map_stop_data, map_db_stops, map_service_type_main_vehicle_type)
        
        stops_report_file = open(json_path, 'w')
        stops_report_file.write(json.dumps(stops_report_json, indent=4, ensure_ascii=False))
        stops_report_file.close()

        log_message(f"saved to {json_path}")

        return stops_report_json 

    def generate_csv(self, stops_report_json: any, csv_path: str):
        csv_field_names = ["Haltestelle", "Name", "Anzahl TU", "TU", "Anzahl VM-Kategorien", "VM-Kategorien", "Anzahl Aufrüfe als Zwischenhalt", "Anzahl Aufrüfe als Starthalt", "Anzahl Aufrüfe als Endhalt", "Anzahl Linien", "Linien", "Anzahl Angebotskategorien", "Angebotskategorien", "Anzahl Steige", "Steige", "Anzahl METABHF Beziehungen", "METABHF Beziehungen", "Anzahl UMSTEIGL Beziehungen", "UMSTEIGL Beziehungen", "Anzahl UMSTEIGZ Beziehungen", "UMSTEIGZ Beziehungen"]

        csv_file = open(csv_path, "w", encoding="utf-8")
        csv_writer = csv.DictWriter(csv_file, fieldnames=csv_field_names)
        csv_writer.writeheader()

        for stop_data in stops_report_json:
            agency_value_lines = []
            
            stop_service_lines_cno = 0
            stop_service_lines = []
            
            stop_fplan_types_cno = 0
            stop_fplan_type_lines = []

            stop_tracks_cno = 0
            stop_tracks_lines = []
            
            for agency_data in stop_data["agencies"]:
                agency_id = agency_data["agency_id"]
                long_name = agency_data["long_name"]
                
                agency_line = f"{long_name} ({agency_id})"
                agency_value_lines.append(agency_line)
                    
                agency_service_lines_cno = len(agency_data["service_lines"])
                if agency_service_lines_cno:
                    stop_service_lines.append(f"{agency_id}:")
                    stop_service_lines_cno += agency_service_lines_cno
                
                for service_line_data in agency_data["service_lines"]:
                    service_line = service_line_data["line"]
                    fplan_cno = service_line_data["fplan_cno"]
                    stop_service_lines.append(f"  {service_line} ({fplan_cno})")

                agency_fplan_types_cno = len(agency_data["fplan_types"])
                if agency_fplan_types_cno:
                    stop_fplan_type_lines.append(f"{agency_id}:")
                    stop_fplan_types_cno += agency_fplan_types_cno

                for fplan_type_data in agency_data["fplan_types"]:
                    vehicle_type = fplan_type_data["vehicle_type"]
                    fplan_cno = fplan_type_data["fplan_cno"]
                    stop_fplan_type_lines.append(f"  {vehicle_type} ({fplan_cno})")

                agency_tracks_cno = len(agency_data["tracks"])
                if agency_tracks_cno:
                    stop_tracks_lines.append(f"{agency_id}:")
                    stop_tracks_cno += agency_tracks_cno

                for track_data in agency_data["tracks"]:
                    track_no = track_data["track_no"]
                    fplan_cno = track_data["fplan_cno"]
                    stop_tracks_lines.append(f"  {track_no} ({fplan_cno})")

            agency_value_lines.sort()

            metabhf_relations_cno = 0
            metabhf_relations_csv_lines = []
            if "station_groups" in stop_data:
                metabhf_relations_cno = len(stop_data["station_groups"])
                for nearby_station_json in stop_data["station_groups"]:
                    stop_id = nearby_station_json["stop_id"]
                    stop_name = nearby_station_json["stop_name"]
                    walk_minutes = nearby_station_json["walk_minutes"]

                    metabhf_relations_csv_line = f"{stop_id} ({stop_name}) - {walk_minutes} Min."
                    metabhf_relations_csv_lines.append(metabhf_relations_csv_line)

            umsteig_linien_relations_cno = 0
            umsteig_linien_relations_csv_lines = []
            if "map_agency_transfer_lines" in stop_data:
                for agency_group_key in stop_data["map_agency_transfer_lines"]:
                    agency_group_data = stop_data["map_agency_transfer_lines"][agency_group_key]

                    from_agency_id = agency_group_data["from_agency_id"]
                    to_agency_id = agency_group_data["to_agency_id"]

                    umsteig_linien_relations_csv_line = f"{from_agency_id} - {to_agency_id}"
                    umsteig_linien_relations_csv_lines.append(umsteig_linien_relations_csv_line)

                    agency_group_data_cno = len(agency_group_data["transfer_lines"])
                    umsteig_linien_relations_cno += agency_group_data_cno

                    for transfer_line_json in agency_group_data["transfer_lines"]:
                        from_trip_short_name = transfer_line_json["from_trip_short_name"]
                        to_trip_short_name = transfer_line_json["to_trip_short_name"]
                        transfer_time = transfer_line_json["transfer_time"]

                        umsteig_linien_relations_csv_line = f"  {from_trip_short_name.ljust(5)} <=> {to_trip_short_name.ljust(5)} - {transfer_time} Min."
                        umsteig_linien_relations_csv_lines.append(umsteig_linien_relations_csv_line)

            umsteig_trips_relations_cno = 0
            umsteig_trips_relations_csv_lines = []
            if "map_agency_transfer_trips" in stop_data:
                for agency_group_key in stop_data["map_agency_transfer_trips"]:
                    agency_group_data = stop_data["map_agency_transfer_trips"][agency_group_key]

                    from_agency_id = agency_group_data["from_agency_id"]
                    to_agency_id = agency_group_data["to_agency_id"]

                    umsteig_trips_relations_csv_line = f"{from_agency_id} - {to_agency_id}"
                    umsteig_trips_relations_csv_lines.append(umsteig_trips_relations_csv_line)

                    transfer_trips_data_cno = len(agency_group_data["map_transfer_trips"].keys())
                    umsteig_trips_relations_cno += transfer_trips_data_cno

                    for trips_key in agency_group_data["map_transfer_trips"]:
                        transfer_trips_data = agency_group_data["map_transfer_trips"][trips_key]

                        from_trip_short_name = transfer_trips_data["from"]["trip_short_name"]
                        to_trip_short_name = transfer_trips_data["to"]["trip_short_name"]
                        transfer_time = transfer_trips_data["transfer_time"]
                        
                        umsteig_trips_relations_csv_line = f"  {from_trip_short_name.ljust(5)} <=> {to_trip_short_name.ljust(5)} - {transfer_time} Min."
                        umsteig_trips_relations_csv_lines.append(umsteig_trips_relations_csv_line)

                        for transfer_trip_json in transfer_trips_data["transfer_trips"]:
                            from_fplan_trip_id = transfer_trip_json["from_fplan_trip_id"]
                            to_fplan_trip_id = transfer_trip_json["to_fplan_trip_id"]

                            umsteig_trips_relations_csv_line = f"    {from_fplan_trip_id} - {to_fplan_trip_id}"
                            umsteig_trips_relations_csv_lines.append(umsteig_trips_relations_csv_line)

            main_vehicle_types = stop_data['main_vehicle_types']
            main_vehicle_types_cno = len(main_vehicle_types)

            stops_cno_first = 0
            stops_cno_middle = 0
            stops_cno_last = 0
            if 'stop_times_stats' in stop_data:
                stops_cno_first = stop_data['stop_times_stats']['first']
                stops_cno_middle = stop_data['stop_times_stats']['middle']
                stops_cno_last = stop_data['stop_times_stats']['last']

            csv_row_dict = {
                "Haltestelle": stop_data["stop_id"],
                "Name": stop_data["stop_name"],
                "Anzahl TU": len(stop_data["agencies"]),
                "TU": "\n".join(agency_value_lines),
                "Anzahl VM-Kategorien": main_vehicle_types_cno,
                "VM-Kategorien": "\n".join(main_vehicle_types),
                "Anzahl Aufrüfe als Zwischenhalt": stops_cno_first, 
                "Anzahl Aufrüfe als Starthalt": stops_cno_middle,
                "Anzahl Aufrüfe als Endhalt": stops_cno_last,
                "Anzahl Linien": stop_service_lines_cno,
                "Linien": "\n".join(stop_service_lines),
                "Anzahl Angebotskategorien": stop_fplan_types_cno,
                "Angebotskategorien": "\n".join(stop_fplan_type_lines),
                "Anzahl Steige": stop_tracks_cno,
                "Anzahl METABHF Beziehungen": metabhf_relations_cno,
                "METABHF Beziehungen": "\n".join(metabhf_relations_csv_lines),
                "Anzahl UMSTEIGL Beziehungen": umsteig_linien_relations_cno,
                "UMSTEIGL Beziehungen": "\n".join(umsteig_linien_relations_csv_lines),
                "Anzahl UMSTEIGZ Beziehungen": umsteig_trips_relations_cno,
                "UMSTEIGZ Beziehungen": "\n".join(umsteig_trips_relations_csv_lines),
            }
            csv_writer.writerow(csv_row_dict)
        
        csv_file.close()

        log_message(f"saved to {csv_path}")

    def generate_geojson(self, stops_reporter_json_path: str, geojson_path: str):
        log_message("START")

        stops_reporter_json_file = open(stops_reporter_json_path)
        stops_reporter_json = json.loads(stops_reporter_json_file.read())
        stops_reporter_json_file.close()

        map_db_stops = table_select_rows(self.db_handle, table_name = "stops", group_by_key = "stop_id")

        stop_features = []

        for stop_export_data in stops_reporter_json:
            stop_id = stop_export_data['stop_id']
            db_stop = map_db_stops[stop_id]

            stop_coordinates = [db_stop['stop_lon'], db_stop['stop_lat']]

            main_vehicle_types = stop_export_data['main_vehicle_types']

            stop_name = db_stop['stop_name']

            stop_feature = {
                'type': 'Feature',
                'id': stop_id,
                'properties': {
                    'stop_id': stop_id,
                    'stop_name': stop_name,
                    'stop_altitude': db_stop['stop_altitude'],
                    'in_fplan': db_stop['in_fplan'],
                    'main_vehicle_types_s': ",".join(main_vehicle_types),
                },
                'geometry': {
                    'type': 'Point',
                    'coordinates': stop_coordinates,
                }
            }

            stop_features.append(stop_feature)

        stops_geojson = {
            'type': 'FeatureCollection',
            'features': stop_features,
        }

        stops_geojson_file = open(geojson_path, 'w', encoding='utf8')
        stops_geojson_file.write(json.dumps(stops_geojson, indent=4))
        stops_geojson_file.close()

        features_cno = len(stop_features)

        log_message(f"... saved {features_cno} stop features GeoJSON to {geojson_path}")
    
    def _fetch_main_stop_data(self):
        fplan_stop_times_cno = count_rows_table(self.db_handle, "fplan_stop_times")
        log_message(f"QUERY FPLAN, FPLAN_STOP_TIMES: {fplan_stop_times_cno} rows")

        db_row_idx = 1

        map_stop_data = {}

        sql = HRDF_Stops_Reporter._load_sql_named("select_stops_fplan")
        select_cursor = self.db_handle.cursor()
        select_cursor.execute(sql)
        for db_row in select_cursor:
            if db_row_idx % 500000 == 0:
                log_message(f"... parsed {db_row_idx} rows ...")

            agency_id = db_row[0]
            vehicle_type = db_row[1]
            service_line = db_row[2]
            service_id = db_row[3]
            stop_id = db_row[4]
            track_full_text = db_row[5]

            if stop_id not in map_stop_data:
                map_stop_data[stop_id] = {
                    "agencies": {},
                }

            map_stop_agencies = map_stop_data[stop_id]["agencies"]

            if agency_id not in map_stop_agencies:
                map_stop_agencies[agency_id] = {
                    "map_lines": {},
                    "map_vehicle_types": {},
                    "map_tracks": {},
                }

            map_stop_agency = map_stop_agencies[agency_id]

            if vehicle_type not in map_stop_agency["map_vehicle_types"]:
                map_stop_agency["map_vehicle_types"][vehicle_type] = 0
            map_stop_agency["map_vehicle_types"][vehicle_type] += 1

            if service_line:
                service_line_key = f"{vehicle_type}{service_line}" # IC3, SN2, B3, etc
                if service_line_key not in map_stop_agency["map_lines"]:
                    map_stop_agency["map_lines"][service_line_key] = 0
                map_stop_agency["map_lines"][service_line_key] += 1
            
            if track_full_text:
                if track_full_text not in map_stop_agency["map_tracks"]:
                    map_stop_agency["map_tracks"][track_full_text] = 0
                map_stop_agency["map_tracks"][track_full_text] += 1

            db_row_idx += 1
        select_cursor.close()

        map_stop_trips_data = self._fetch_fplan_trips_data()

        for stop_id in map_stop_data:
            stop_trips_data = map_stop_trips_data[stop_id]
            map_stop_data[stop_id]["stop_times_stats"] = stop_trips_data

        return map_stop_data

    def _compute_stops_report_json(self, map_stop_data: any, map_db_stops: any, map_service_type_main_vehicle_type: any):
        # https://stackoverflow.com/a/5967539
        def atoi(text):
            return int(text) if text.isdigit() else text
        def natural_keys(text):
            '''
            alist.sort(key=natural_keys) sorts in human order
            http://nedbatchelder.com/blog/200712/human_sorting.html
            (See Toothy's implementation in the comments)
            '''
            return [ atoi(c) for c in re.split(r'(\d+)', text) ]

        map_agency = table_select_rows(self.db_handle, table_name = "agency", group_by_key = "agency_id")      

        stops_report_json = []
        map_missing_vehicle_types = {}

        for stop_id in map_stop_data:
            if stop_id not in map_db_stops:
                continue # stop_id not in ./BFKOORD_WGS

            stop_data = map_stop_data[stop_id]

            stop_agency_rows = []
            map_main_vehicle_types = {}
            
            map_agency_data = stop_data.get("agencies", False) or {}
            for agency_id in map_agency_data:
                agency_data = map_agency_data[agency_id]

                service_lines_data = []
                for service_line in agency_data["map_lines"]:
                    service_line_data = {
                        "line": service_line,
                        "fplan_cno": agency_data["map_lines"][service_line]
                    }
                    service_lines_data.append(service_line_data)
                service_lines_data.sort(key=lambda k: natural_keys(k['line'])) 

                fplan_types_data = []
                for vehicle_type in agency_data["map_vehicle_types"]:
                    if vehicle_type not in map_service_type_main_vehicle_type:
                        if vehicle_type not in map_missing_vehicle_types:
                            map_missing_vehicle_types[vehicle_type] = 0
                        map_missing_vehicle_types[vehicle_type] += 1
                        main_vehicle_type = "Zug"
                    else:
                        main_vehicle_type = map_service_type_main_vehicle_type[vehicle_type]
                    map_main_vehicle_types[main_vehicle_type] = 1
                    
                    fplan_type_data = {
                        "vehicle_type": vehicle_type,
                        "fplan_cno": agency_data["map_vehicle_types"][vehicle_type]
                    }
                    fplan_types_data.append(fplan_type_data)
                fplan_types_data.sort(key=lambda k: natural_keys(k['vehicle_type'])) 

                tracks_data = []
                for track_no in agency_data["map_tracks"]:
                    track_data = {
                        "track_no": track_no,
                        "fplan_cno": agency_data["map_tracks"][track_no]
                    }
                    tracks_data.append(track_data)
                tracks_data.sort(key=lambda k: natural_keys(k['track_no']))

                db_agency = map_agency[agency_id]

                agency_row_data = {
                    "agency_id": agency_id,
                    "short_name": db_agency["short_name"],
                    "long_name": db_agency["long_name"],
                    "service_lines": service_lines_data,
                    "fplan_types": fplan_types_data,
                    "tracks": tracks_data,
                }
                stop_agency_rows.append(agency_row_data)

            main_vehicle_types = list(map_main_vehicle_types.keys())

            db_stop = map_db_stops[stop_id]
            stop_export_data = {
                "stop_id": stop_id,
                "stop_name": db_stop["stop_name"],
                "main_vehicle_types": main_vehicle_types,
                "agencies": stop_agency_rows,
            }

            for relation_key in ["station_groups", "map_agency_transfer_lines", "map_agency_transfer_trips", "stop_times_stats"]:
                if relation_key in stop_data:
                    stop_export_data[relation_key] = stop_data[relation_key]
            
            stops_report_json.append(stop_export_data)

        has_missing_vehicle_types = len(map_missing_vehicle_types.keys()) > 0
        if has_missing_vehicle_types:
            print("WARNING - following service_types are not present in Mapping_Angebotskategorie_Verkehrsmittelkategorie.csv")
            print(map_missing_vehicle_types)

        return stops_report_json

    def _attach_stops_relations(self, map_stop_data, map_db_stops):
        self._attach_station_groups(map_stop_data, map_db_stops)
        self._attach_transfer_lines(map_stop_data)
        self._attach_transfer_trips(map_stop_data)


    def _attach_station_groups(self, map_stop_data, map_db_stops):
        stop_relations_db_rows = table_select_rows(self.db_handle, table_name = "stop_relations")

        for db_row in stop_relations_db_rows:
            stop_id = db_row["from_stop_id"]

            if stop_id not in map_stop_data:
                map_stop_data[stop_id] = {}
            if "station_groups" not in map_stop_data[stop_id]:
                map_stop_data[stop_id]["station_groups"] = []

            nearby_station_id = db_row["to_stop_id"]
            if nearby_station_id not in map_db_stops:
                continue # stop_id not in ./BFKOORD_WGS
            
            nearby_station_db_row = map_db_stops[nearby_station_id]
            walk_minutes = db_row["walk_minutes"] if db_row["walk_minutes"] else "n/a"

            nearby_station_json = {
                "stop_id": nearby_station_id,
                "stop_name": nearby_station_db_row["stop_name"],
                "walk_minutes": walk_minutes,
            }
            map_stop_data[stop_id]["station_groups"].append(nearby_station_json)

    def _attach_transfer_lines(self, map_stop_data):
        stop_transfer_lines_db_rows = table_select_rows(self.db_handle, table_name = "stop_transfer_lines")
        for db_row in stop_transfer_lines_db_rows:
            stop_id = db_row["stop_id"]
            
            from_agency_id = db_row["from_agency_id"]
            from_vehicle_type = db_row["from_vehicle_type"]
            from_line_id = db_row["from_line_id"]
            
            from_trip_short_name = from_vehicle_type
            if from_line_id is not "*":
                from_trip_short_name += from_line_id
            
            to_agency_id = db_row["to_agency_id"]
            to_vehicle_type = db_row["to_vehicle_type"]
            to_line_id = db_row["to_line_id"]

            to_trip_short_name = to_vehicle_type
            if to_line_id is not "*":
                to_trip_short_name += to_line_id

            transfer_time = db_row["transfer_time"]

            if stop_id not in map_stop_data:
                map_stop_data[stop_id] = {}
            if "map_agency_transfer_lines" not in map_stop_data[stop_id]:
                map_stop_data[stop_id]["map_agency_transfer_lines"] = {}
            
            map_agency_transfer_lines = map_stop_data[stop_id]["map_agency_transfer_lines"]

            agency_group_key = f"{from_agency_id}.{to_agency_id}"
            if agency_group_key not in map_agency_transfer_lines:
                map_agency_transfer_lines[agency_group_key] = {
                    "from_agency_id": from_agency_id,
                    "to_agency_id": to_agency_id,
                    "transfer_lines": [],
                }

            transfer_line_json = {
                "from_trip_short_name": from_trip_short_name,
                "to_trip_short_name": to_trip_short_name,
                "transfer_time": transfer_time,
            }

            map_agency_transfer_lines[agency_group_key]["transfer_lines"].append(transfer_line_json)

    def _attach_transfer_trips(self, map_stop_data):
        sql = HRDF_Stops_Reporter._load_sql_named("select_stop_transfer_trips")
        
        cursor = self.db_handle.cursor()
        cursor.execute(sql)
        for db_row in cursor:
            stop_id = db_row[0]
            from_agency_id = db_row[1]
            from_vehicle_type = db_row[2]
            from_service_line = db_row[3]
            from_fplan_trip_id = db_row[4]
            to_agency_id = db_row[5]
            to_vehicle_type = db_row[6]
            to_service_line = db_row[7]
            to_fplan_trip_id = db_row[8]
            stop_transfer_trips_transfer_time = db_row[9]

            if stop_id not in map_stop_data:
                map_stop_data[stop_id] = {}
            if "map_agency_transfer_trips" not in map_stop_data[stop_id]:
                map_stop_data[stop_id]["map_agency_transfer_trips"] = {}

            map_agency_transfer_trips = map_stop_data[stop_id]["map_agency_transfer_trips"]

            agency_group_key = f"{from_agency_id}.{to_agency_id}"
            if agency_group_key not in map_agency_transfer_trips:
                map_agency_transfer_trips[agency_group_key] = {
                    "from_agency_id": from_agency_id,
                    "to_agency_id": to_agency_id,
                    "map_transfer_trips": {},
                }

            from_key = f"{from_agency_id}.{from_vehicle_type}.{from_service_line}"
            to_key = f"{to_agency_id}.{to_vehicle_type}.{to_service_line}"
            group_key = f"{from_key}-{to_key}"
            if group_key not in map_agency_transfer_trips[agency_group_key]["map_transfer_trips"]:
                from_trip_short_name = from_vehicle_type
                if from_service_line:
                    from_trip_short_name += from_service_line

                to_trip_short_name = to_vehicle_type
                if to_service_line:
                    to_trip_short_name += to_service_line

                map_agency_transfer_trips[agency_group_key]["map_transfer_trips"][group_key] = {
                    "from": {
                        "agency_id": from_agency_id,
                        "trip_short_name": from_trip_short_name,
                        "vehicle_type": from_vehicle_type,
                        "service_line": from_service_line,
                    },
                    "to": {
                        "agency_id": to_agency_id,
                        "trip_short_name": to_trip_short_name,
                        "vehicle_type": to_vehicle_type,
                        "service_line": to_service_line,
                    },
                    "transfer_time": stop_transfer_trips_transfer_time,
                    "transfer_trips": [],
                }

            transfer_trip_json = {
                "from_fplan_trip_id": from_fplan_trip_id,
                "to_fplan_trip_id": to_fplan_trip_id,
            }
            map_agency_transfer_trips[agency_group_key]["map_transfer_trips"][group_key]["transfer_trips"].append(transfer_trip_json)
        cursor.close()


    def _fetch_fplan_trips_data(self):
        fplan_trip_bitfeld_cno = count_rows_table(self.db_handle, "fplan_trip_bitfeld")
        log_message(f"QUERY FPLAN BITFELD AGGREGATE FPLAN_STOP_TIMES: {fplan_trip_bitfeld_cno} rows")

        db_row_idx = 1

        map_stop_trips_data = {}

        sql = HRDF_Stops_Reporter._load_sql_named("select_fplan_stop_times_grouped_by_trips.sql")
        select_cursor = self.db_handle.cursor()
        select_cursor.execute(sql)
        for db_row in select_cursor:
            if db_row_idx % 50000 == 0:
                log_message(f"... parsed {db_row_idx} rows ...")

            stop_ids_s = db_row[5]
            stop_ids = stop_ids_s.split(',')
    
            for idx, stop_id in enumerate(stop_ids):
                is_first = idx == 0
                is_last = idx == len(stop_ids) - 1
                is_middle = not (is_first or is_last)

                if stop_id not in map_stop_trips_data:
                    map_stop_trips_data[stop_id] = {
                        'first': 0,
                        'middle': 0,
                        'last': 0,
                    }

                if is_first:
                    map_stop_trips_data[stop_id]['first'] += 1
                if is_last:
                    map_stop_trips_data[stop_id]['last'] += 1
                if is_middle:
                    map_stop_trips_data[stop_id]['middle'] += 1

            db_row_idx += 1

        return map_stop_trips_data

    def _load_map_service_type_main_vehicle_type(self):
        map_service_type_main_vehicle_type = {}

        csv_path = self.config['map_service_type_main_vehicle_type_path']
        csv_handler = open(csv_path)
        csv_reader = csv.DictReader(csv_handler)
        for row in csv_reader:
            main_vehicle_type = row['Verkehrsmittelkategorie']
            service_type = row['Angebotskategorie']

            map_service_type_main_vehicle_type[service_type] = main_vehicle_type
        
        return map_service_type_main_vehicle_type

    @staticmethod 
    def _load_sql_named(filename: str):
        filename = filename.replace('.sql', '')

        dir_path = os.path.dirname(os.path.realpath(__file__))
        db_path = os.path.abspath(dir_path + f"/sql/{filename}.sql")
        return load_sql_from_file(db_path)