# GTFS DB importer

See [CHANGELOG](./CHANGELOG.md) for latest changes

Python tools that imports a GTFS dataset into SQLite DB. The DB schema is specified in [./inc/config/gtfs_schema.yml](./inc/config/gtfs_schema.yml).

## Installation

```
$ bash bootstrap.sh 
```

## Scripts

### gtfs_db_importer_cli.py

CLI tool that ingests GTFS data into a SQLite DB

Usage: `python3 gtfs_db_importer_cli.py [-h] [--gtfs-folder-path GTFS_FOLDER_PATH] [--output-db-path OUTPUT_DB_PATH]`

| Param | Required | Description | Example |
| - | - | - | - |
| `--gtfs-db-path` | `YES` | input path to GTFS folder, relative or absolute|  |
| `--output-db-path` |  | path to output SQLite DB, relative or absolute. If not givem the script will create it under ./data/gtfs-static-dbs folder| `/tmp/foo.db` |

Example

```
$ python3 gtfs_db_importer_cli.py \
    --gtfs-folder-path data/gtfs-static/current/gtfs_fp2021_2021-04-07_09-10
```

The script detects the GTFS date from the GTFS static folder and ingests the content into `gtfs_2021-04-07.sqlite` SQLite file.
