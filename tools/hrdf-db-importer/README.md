### HRDF DB importer

Issue: https://github.com/openTdataCH/OJP-Showcase/issues/13

Python tool that imports a HRDF v5.40 dataset into SQLite DB.
The DB schema is specified in [hrdf-tools/inc/HRDF/hrdf_schema.yml](inc/HRDF/hrdf_schema.yml).

Usage: `hrdf_db_importer_cli.py [-h] [--hrdf-folder-path HRDF_FOLDER_PATH] [--output-db-path OUTPUT_DB_PATH]`

|Param|Description|Example|
|--|--|--|
|--hrdf-folder-path|input path to HRDF folder, relative or absolute|data/hrdf-src/opentransportdata.swiss-hrdf/current/oev_sammlung_ch_hrdf_5_40_41_2021_20201220_033904|
|--output-db-path|path to output SQLite DB, relative or absolute. If not givem the script will create it under ./output/hrdf_db folder|/tmp/foo.db|

`$ python3 hrdf_db_importer_cli.py -p data/hrdf-src/opentransportdata.swiss-hrdf/current/oev_sammlung_ch_hrdf_5_40_41_2021_20201220_033904`
The script tries to guess the HRDF date from the path, in the case above will create and fill `./output/hrdf_db/hrdf_2020-12-20.sqlite` DB.

### HRDF DB reporter

Issue: https://github.com/openTdataCH/OJP-Showcase/issues/13

Small tool that generates a report about tables and total number of rows in a given database.

Usage: `hrdf_db_reporter_cli.py [-h] [--hrdf-db-path HRDF_DB_PATH]`

|Param|Description|Example|
|--|--|--|
|--hrdf-db-path|input path to HRDF DB, relative or absolute|hrdf-tools/tmp/hrdf_2021-01-10.sqlite|

`$ python3 hrdf_db_reporter_cli.py --hrdf-db-path output/hrdf_db/hrdf_2021-04-03.sqlite`