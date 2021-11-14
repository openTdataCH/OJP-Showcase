import argparse, os, sys
from pathlib import Path

# from inc.db_importer import GTFS_DB_Importer
# from inc.shared.inc.helpers.gtfs_helpers import compute_formatted_date_from_gtfs_folder_path

from inc.gtfs_reader import GTFS_Reader

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--gtfs-a-path', '--gtfs-a-path')
    parser.add_argument('--gtfs-b-path', '--gtfs-b-path')
    args = parser.parse_args()

    if not args.gtfs_a_path:
        print(f'Missing GTFS A(previous) path')
        print('Use --gtfs-a-path /path/to/gtfs-path --gtfs-b-path /path/to/gtfs-path')
        sys.exit(1)
    if not args.gtfs_b_path:
        print(f'Missing GTFS B(current) path')
        print('Use --gtfs-b-path /path/to/gtfs-path --gtfs-b-path /path/to/gtfs-path')
        sys.exit(1)
    if not os.path.isdir(args.gtfs_a_path):
        print(f'GTFS A(previous) path is invalid')
        print(f'{args.gtfs_a_path}')
        sys.exit(1)
    if not os.path.isdir(args.gtfs_b_path):
        print(f'GTFS B(current) path is invalid')
        print(f'{args.gtfs_b_path}')
        sys.exit(1)

    gtfs_a_path = Path(args.gtfs_a_path)
    gtfs_b_path = Path(args.gtfs_b_path)
    
    print(f'GTFS A: {gtfs_a_path.name}')
    print(f'GTFS B: {gtfs_b_path.name}')
    print(f'')
    
    GTFS_Reader.compute_gtfs_stats(gtfs_a_path, gtfs_b_path)
    GTFS_Reader.compare_agency(gtfs_a_path, gtfs_b_path)
    GTFS_Reader.compare_routes(gtfs_a_path, gtfs_b_path)
    GTFS_Reader.compare_stops(gtfs_a_path, gtfs_b_path)
    GTFS_Reader.compare_transfers(gtfs_a_path, gtfs_b_path)

if __name__ == "__main__":
    main()