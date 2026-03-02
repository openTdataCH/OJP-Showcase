# Server Scripts

Python / NodeJS scripts that run for fetching latest data

## Installation

```
$ bash bootstrap.sh 
```
## Setup
- setup Python
    see [install setup](../README.md)
- review tools `data_paths` in [./inc/config.yml](./inc/config.yml)
- generate ./data tmp folders
```
$ python3 setup.py
```

## Scripts

- Fetch / unzip / import latest GTFS dataset

`$ python3 gtfs-compute-latest.py`

- Fetch / unzip / import latest HRDF dataset + generate lookup tables and [HRDF duplicates](../../tools/hrdf-check-duplicates/) report

`$ python3 hrdf-compute-latest.py`
