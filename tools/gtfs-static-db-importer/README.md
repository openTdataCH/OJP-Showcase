### GTFS DB importer

Python tool that imports a GTFS dataset into SQLite DB.
The DB schema is specified in [gtfs-db-importer/inc/config/gtfs_schema.yml](gtfs-db-importer/inc/config/gtfs_schema.yml).

Usage: `gtfs_db_importer_cli.py [-h] [--gtfs-folder-path GTFS_FOLDER_PATH] [--output-db-path OUTPUT_DB_PATH]`

|Param|Description|Example|
|--|--|--|
|--gtfs-folder-path|input path to GTFS folder, relative or absolute|  |
|--output-db-path|path to output SQLite DB, relative or absolute. If not givem the script will create it under ./output/gtfs_db folder|/tmp/foo.db|

`$ python3 gtfs_db_importer_cli.py --gtfs-folder-path data/gtfs-static/current/gtfs_fp2021_2021-04-07_09-10`
The script tries to guess the HRDF date from the path, in the case above will create and fill `./output/gtfs_db/gtfs_2021-04-07.sqlite` DB.
