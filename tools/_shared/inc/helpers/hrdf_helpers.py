import re

# from_idx is for 1 start-based index columns to match the HRDF PDF doc.
def extract_hrdf_content(hrdf_line: str, from_idx: int, to_idx: int, default_value = None):
    hrdf_line = hrdf_line.strip()
    hrdf_content = hrdf_line[from_idx - 1 : to_idx]
    hrdf_content = hrdf_content.strip()
    if hrdf_content == "":
        hrdf_content = default_value
    return hrdf_content

def parse_kennung_to_dict(kennung_s: str):
    kennung_dict = {}

    # Match ==A "CONTENT"== blocks
    kennung_matches = re.findall("([:A-Z])\s\"([^\"]+?)\"", kennung_s)
    for kennung_match in kennung_matches:
        key = kennung_match[0]
        value = kennung_match[1]
        kennung_dict[key] = value
        
        kennung_s = kennung_s.replace(f"{key} \"{value}\"", "")

    # Match ==A 'CONTENT'== blocks
    kennung_matches = re.findall("([:A-Z])\s'([^']+?)'", kennung_s)
    for kennung_match in kennung_matches:
        key = kennung_match[0]
        value = kennung_match[1]
        kennung_dict[key] = value
        
        kennung_s = kennung_s.replace(f"{key} '{value}'", "")
    
    # Match remainings as 'A CONTENT' blocks
    kennung_s = kennung_s.strip()
    kennung_matches = re.findall("([:A-Z])\s([^\s]*)", kennung_s)
    for kennung_match in kennung_matches:
        key = kennung_match[0]
        value = kennung_match[1]
        kennung_dict[key] = value

    return kennung_dict

def normalize_agency_id(hrdf_s: str):
    hrdf_s = hrdf_s.lstrip("0")
    return hrdf_s

def normalize_fplan_trip_id(hrdf_s: str):
    hrdf_s = hrdf_s.lstrip("0")
    return hrdf_s

def compute_file_rows_no(file_path: str):
    # https://stackoverflow.com/questions/845058/how-to-get-line-count-of-a-large-file-cheaply-in-python
    rows_no = sum(1 for line in open(file_path))
    return rows_no

def compute_formatted_date_from_hrdf_folder_path(folder_path: str):
    # oev_sammlung_ch_hrdf_5_40_41_2021_20201220_033904
    opentransport_matches = re.match("^.+?_([0-9]{4})_([0-9]{4})([0-9]{2})([0-9]{2})_.*$", folder_path)
    if opentransport_matches:
        matched_year = opentransport_matches[2]
        matched_month = opentransport_matches[3]
        matched_day = opentransport_matches[4]
        formatted_date = f"{matched_year}-{matched_month}-{matched_day}"
        return formatted_date

    return None

def compute_formatted_date_from_hrdf_db_path(db_path: str):
    date_matches = re.match("^.+?([0-9]{4}-[0-9]{2}-[0-9]{2}).*$", db_path)
    if date_matches:
        return date_matches[1]

    return None
