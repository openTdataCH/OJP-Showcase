# GTFS - HRDF Compare tool

Python tool that compares GTFS and HRDF datasets for a given day of operations

Usage:

```
python3 gtfs_hrdf_compare_cli.py \
  [--agency_id agency_id] \
  [--day day] \
  [--hrdf-db-path hrdf-db-path] \
  [--gtfs-db-path gtfs-db-path]
```

| Param | Description | Example |
|--|--|--|
| agency_id | Agency ID | `11` for SBB |
| day | Day of operation in `YYYY-MM-DD` format | `2022-01-12` for 12.Jan 2022 |
| hrdf-db-path | Path to the HRDF DB generated with [hrdf-db-importer](https://github.com/openTdataCH/OJP-Showcase/tree/develop/tools/hrdf-db-importer) tool | `tmp/hrdf-dbs/hrdf_2022-01-07.sqlite` |
| gtfs-db-path | Path to the GTFS DB generated with [gtfs-static-db-importer](https://github.com/openTdataCH/OJP-Showcase/tree/develop/tools/gtfs-static-db-importer) tool | `tmp/gtfs-static-dbs/gtfs_2022-01-12.sqlite` |

Check [tools/gtfs-hrdf-compare/docs/gtfs-hrdf-analyse-v2.md](https://github.com/openTdataCH/OJP-Showcase/blob/develop/tools/gtfs-hrdf-compare/docs/gtfs-hrdf-analyse-v2.md) for detailed analyse and methodology used.

# Sample Output

```
python3 gtfs_hrdf_compare_cli.py \
    --agency_id 11 \
    --day 2022-01-12 \
    --hrdf-db-path tmp/hrdf-dbs/hrdf_2022-01-07.sqlite \
    --gtfs-db-path tmp/gtfs-static-dbs/gtfs_2022-01-12.sqlite
```

Output:

```
=================================
COMPARE GTFS WITH HRDF
=================================
HRDF DB PATH: tmp/hrdf-dbs/hrdf_2022-01-07.sqlite
GTFS DB PATH: tmp/gtfs-static-dbs/gtfs_2022-01-12.sqlite
DAY         : 2022-01-12
AGENCY ID   : 11
=================================

[2022-01-12-11:13:18] - Query ALL HRDF trips ...
[2022-01-12-11:13:20] - ... return 15942 trips
[2022-01-12-11:13:20] - Query given day GTFS trips ...
[2022-01-12-11:13:21] - ... return 5407 trips
[2022-01-12-11:13:21] - Saved report to ./reports/gtfs_trips_with_hrdf-2022-01-12.csv
```