import os, sys
import json
import gzip

from pathlib import Path

from typing import Any

def export_json_to_file(json_obj: Any, json_path: Path, pretty_print = False):
    if isinstance(json_path, str):
        json_path = Path(json_path)

    if not os.path.isdir(json_path.parent):
        os.makedirs(json_path.parent)

    json_file = open(json_path, 'w', encoding='utf-8')
    if pretty_print:
        json_file.write(json.dumps(json_obj, indent=2, ensure_ascii=False))
    else:
        json.dump(json_obj, json_file)
    
    json_file.close()

def load_json_from_file(json_path: Path):
    if isinstance(json_path, str):
        json_path = Path(json_path)
    
    json_file = None
    if f'{json_path}'[-3:] == '.gz':
        json_file = gzip.open(json_path)
    else:
        json_file = open(json_path, encoding='utf-8')    
    
    json_obj = json.loads(json_file.read())

    json_file.close()
    
    return json_obj
