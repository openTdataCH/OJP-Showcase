import sqlite3

from ..shared.inc.helpers.log_helpers import log_message
from ..shared.inc.helpers.db_helpers import truncate_and_load_table_records
from ..shared.inc.helpers.hrdf_helpers import normalize_agency_id, parse_kennung_to_dict

def import_db_betrieb(hrdf_path, db_path, db_schema_config):
    log_message(f"IMPORT BETRIEB")

    fplan_agency_ids = fetch_agency_from_fplan(db_path)
    agency_row_items = parse_hrdf_betrieb(hrdf_path, fplan_agency_ids)
    truncate_and_load_table_records(db_path, 'agency', db_schema_config['tables']['agency'], agency_row_items)

def fetch_agency_from_fplan(db_path):
    db_handle = sqlite3.connect(db_path)

    fplan_agency_ids = []

    log_message(f"QUERY agency_id FROM FPLAN ...")

    sql = "SELECT DISTINCT fplan.agency_id FROM fplan"
    select_cursor = db_handle.cursor()
    select_cursor.execute(sql)
    for db_row in select_cursor:
        agency_id = db_row[0]
        fplan_agency_ids.append(agency_id)
    select_cursor.close()

    fplan_agency_ids_cno = len(fplan_agency_ids)
    log_message(f"... found {fplan_agency_ids_cno} items")

    return fplan_agency_ids

def parse_hrdf_betrieb(hrdf_path, fplan_agency_ids):
    map_hrdf_id_agency = {}

    log_message(f"Parse BETRIEB ...")
    for lang in ["DE", "EN", "FR", "IT"]:
        map_hrdf_id_agency[lang] = {}

        betrieb_path = f"{hrdf_path}/BETRIEB_{lang}"
        with open(betrieb_path, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                
                hrdf_id = line[0:5]

                if not hrdf_id in map_hrdf_id_agency[lang]:
                    map_hrdf_id_agency[lang][hrdf_id] = {}

                kennung_s = line[6:]

                kennung_dict = parse_kennung_to_dict(kennung_s)
                for key in kennung_dict:
                    map_hrdf_id_agency[lang][hrdf_id][key] = kennung_dict[key]

    hrdf_agency_ids_cno = len(list(map_hrdf_id_agency.values())[0])
    log_message(f"... found {hrdf_agency_ids_cno} agency in HRDF")

    map_agency_json = {}
    for lang in map_hrdf_id_agency:
        for hrdf_id in map_hrdf_id_agency[lang]:
            kennung_dict = map_hrdf_id_agency[lang][hrdf_id]
            short_name = kennung_dict['K']
            long_name = kennung_dict['L']
            
            agency_id = normalize_agency_id(kennung_dict[':'])
            in_fplan = 1
            if agency_id not in fplan_agency_ids:
                in_fplan = 0

            if not agency_id in map_agency_json:
                map_agency_json[agency_id] = {
                    "agency_id": agency_id,
                    "short_name": short_name,
                    "long_name": long_name,
                    "in_fplan": in_fplan,
                }
            
            lang_key = f"full_name_{lang}".lower()
            map_agency_json[agency_id][lang_key] = kennung_dict['V']

    agency_row_items = list(map_agency_json.values())

    return agency_row_items
