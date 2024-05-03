import os, sys

from pathlib import Path

from compare_gtfs_rt_static.gtfs_controller import GTFS_Controller

def main():
    app_path = Path(os.path.realpath(__file__)).parent
    gtfs_controller = GTFS_Controller(app_path)
    gtfs_controller.compare_latest_gtfs_rt_static()

if __name__ == "__main__":
    main()
