# Deprecated Tool

This tool is not anymore used, the [gtfs-rt-status](https://github.com/openTdataCH/OJP-Showcase/tree/develop/apps/gtfs-rt-status) app is using an API to fetch the GTFS static trips. 

----

### GTFS-Static Assets Exporter

Python tool that exports assets needed by the [apps/gtfs-rt-status](https://github.com/openTdataCH/OJP-Showcase/tree/develop/apps/gtfs-rt-status)) webapp.

Usage: `gtfs_static_export_files.py [-h] [--db-path GTFS_DB_PATH]`

|Param|Description|Example|
|--|--|--|
|--db-path|path to GTFS SQLite DB generated via [tools/gtfs-static-db-importer](https://github.com/openTdataCH/OJP-Showcase/tree/develop/tools/gtfs-static-db-importer) tool| data/gtfs_db/gtfs_2021-04-14.sqlite |

`$ python3 gtfs_static_export_files.py --db-path data/gtfs_db/gtfs_2021-04-14.sqlite`