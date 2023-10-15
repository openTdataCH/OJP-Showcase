import os, sys
import json

from pathlib import Path

def export_json_to_file(json_obj: any, json_path: Path, pretty_print = False):
    if isinstance(json_path, str):
        json_path = Path(json_path)

    if not os.path.isdir(json_path.parent):
        os.makedirs(json_path.parent)

    json_file = open(json_path, 'w', encoding='utf-8')
    if pretty_print:
        json_file.write(json.dumps(json_obj, indent=4, ensure_ascii=False))
    else:
        json.dump(json_obj, json_file)
    
    json_file.close()

def load_json_from_file(json_path: Path):
    if isinstance(json_path, str):
        json_path = Path(json_path)

    json_file = open(json_path, encoding='utf-8')
    json_obj = json.loads(json_file.read())
    json_file.close()

    return json_obj

