### Stops Reporter Tool

Issue: https://github.com/openTdataCH/OJP-Showcase/issues/3

Python tool that generates a CSV report for the HRDF stations, the fields are specified in the Github issue.
The CSV file is converted (manual for now) to Excel format and uploaded to[hrdf-tools/export/stops_reporter](hrdf-toolsexport/stops_reporter) --- TODO FIX PATH

Usage: `stops_reporter_cli.py [-h] [--hrdf-db-path HRDF-DB-PATH]`

|Param|Description|Example|
|--|--|--|
|--hrdf-db-path|input path to HRDF DB, relative or absolute|data/hrdf_db/hrdf_2021-04-03.sqlite|

`$ python3 stops_reporter_cli.py --hrdf-db-path data/hrdf_db/hrdf_2021-04-03.sqlite`

### Stops GeoJSON exporter

TBA