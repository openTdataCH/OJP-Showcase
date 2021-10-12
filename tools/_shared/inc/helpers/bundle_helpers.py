import os, sys
from pathlib import Path

def load_resource_from_bundle(map_resource_paths: dict, resource_key: str):
    if not resource_key in map_resource_paths:
        print(f'ERROR: cant find {resource_key} in map')
        print(map_resource_paths)
        sys.exit(1)

    resource_path = Path(map_resource_paths[resource_key])
    if not os.path.isfile(resource_path):
        print(f"ERROR: cant find path \n{resource_path}")
        sys.exit(1)

    resource_content = resource_path.read_text()

    return resource_content