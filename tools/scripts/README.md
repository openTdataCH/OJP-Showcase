# Server Scripts

## Setup

Review the paths in `tools/scripts/inc/config.yml`
Run `$ python3 setup.py` to
- generate project tmp folders in `data/*`

## Scripts

- Fetch / unzip / import latest GTFS dataset

`$ python3 gtfs-compute-latest.py`

- Fetch / unzip / import latest HRDF dataset + generate lookup tables and [HRDF duplicates](../../tools/hrdf-check-duplicates/) report

`$ python3 hrdf-compute-latest.py`
