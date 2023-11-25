import os
import sys
import re

from .shared.inc.helpers.db_helpers import connect_db
from .shared.inc.helpers.log_helpers import log_message
from .shared.inc.helpers.db_helpers import truncate_and_load_table_records
from .shared.inc.helpers.hrdf_helpers import normalize_agency_id

def import_db_betrieb(hrdf_path, db_path, db_schema_config):
    log_message("IMPORT BETRIEB")

    fplan_agency_ids = fetch_agency_from_fplan(db_path)
    agency_row_items = parse_hrdf_betrieb(hrdf_path, fplan_agency_ids)
    truncate_and_load_table_records(db_path, 'agency', db_schema_config['tables']['agency'], agency_row_items)

def fetch_agency_from_fplan(db_path):
    db_handle = connect_db(db_path)

    fplan_agency_ids = []

    log_message("QUERY agency_id FROM FPLAN ...")

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

    log_message("Parse BETRIEB ...")
    for lang in ["DE", "EN", "FR", "IT"]:
        map_hrdf_id_agency[lang] = {}

        betrieb_path = f"{hrdf_path}/BETRIEB_{lang}"
        with open(betrieb_path, encoding='utf-8') as f:
            for line in f:
                line = line.strip()

                hrdf_id = line[0:5]

                if not hrdf_id in map_hrdf_id_agency[lang]:
                    map_hrdf_id_agency[lang][hrdf_id] = {}

                line_data = line[6:].strip()

                is_agency_id_field = line_data[0] == ':'
                if is_agency_id_field:
                    # 00166 : 06____
                    # TODO - we get also multiple agency_ids, handle this at the data source?
                    # 00167 : 800631 800693 8006C4 8006C5 8006SH
                    agency_ids = line_data[1:].strip().split(' ')
                    agency_ids = [normalize_agency_id(x) for x in agency_ids]

                    map_hrdf_id_agency[lang][hrdf_id]['agency_ids'] = agency_ids
                else:
                    # 00166 K "DB " L "DB Regio" V "DB Regio AG"
                    name_matches = re.findall(r'([A-Z])\s"([^"]+?)"', line_data)
                    if len(name_matches) == 0:
                        print('ERROR - cant find names for agency')
                        print(line_data)
                        sys.exit(1)

                    for name_match in name_matches:
                        property_key = name_match[0].strip()
                        map_hrdf_id_agency[lang][hrdf_id][property_key] = name_match[1].strip()
                # if/else line type
            # file loop line
        # file close
    # lang loop

    hrdf_agency_ids_cno = len(list(map_hrdf_id_agency.values())[0])
    log_message(f"... found {hrdf_agency_ids_cno} agency in HRDF")

    map_agency_json = {}
    for lang, map_lang_data in map_hrdf_id_agency.items():
        for hrdf_id, agency_properties in map_lang_data.items():
            short_name = agency_properties['K']
            long_name = agency_properties['L']
            full_name = agency_properties['V']

            first_agency_id = agency_properties['agency_ids'][0]
            for idx, agency_id in enumerate(agency_properties['agency_ids']):
                is_first = idx == 0
                is_main = 1 if is_first else 0
                parent_agency_id = None if is_first else first_agency_id

                in_fplan = 1
                if agency_id not in fplan_agency_ids:
                    in_fplan = 0

                if not agency_id in map_agency_json:
                    map_agency_json[agency_id] = {
                        "agency_id": agency_id,
                        "short_name": short_name,
                        "long_name": long_name,
                        "in_fplan": in_fplan,
                        "is_main": is_main,
                        "parent_agency_id": parent_agency_id,
                    }

                lang_key = f"full_name_{lang}".lower()
                map_agency_json[agency_id][lang_key] = full_name
            # loop agency_id
        # loop per language
    # loop languages

    agency_row_items = list(map_agency_json.values())

    return agency_row_items
