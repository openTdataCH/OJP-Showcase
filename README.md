# OpenTData OJP-Showcase Tools

## Apps

- [Atlas-Lines compare GTFS-Routes](apps/atlas-routes-compare-gtfs/)
- [Bitfeld visualizer](apps/bitfeld-viz)
- [GTFS-RT -static Report](apps/gtfs-rt-static-report)
- [GTFS-RT -static Comparsion](apps/gtfs-rt-status)
- [GTFS -static Query API](apps/gtfs-query)
- [HRDF Check Duplicates](apps/hrdf-duplicates-report)
- [HRDF Query API](apps/hrdf-query)

## Tools

- [Atlas Geocode Lines](tools/atlas-geocode-lines)
- [CKAN Utils](tools/ckan-utils)
- [GTFS-HRDF Compare](tools/gtfs-hrdf-compare)
- [GTFS-Static compare](tools/gtfs-prev-compare)
- [GTFS-RT Fetcher](tools/gtfs-rt-fetch)
- [GTFS-RT <-> GTFS static - compare tool](tools/gtfs-rt-static-compare)
- [GTFS-Static DB Importer](tools/gtfs-static-db-importer)
- [HRDF Check Duplicates](tools/hrdf-check-duplicates)
- [HRDF DB Importer](tools/hrdf-db-importer)
- [HRDF Stops Reporter](tools/hrdf-stops-reporter)
- [Ist-Daten Filter](tools/ist-daten-filter)

# Tools Installation

You can run the tools in two ways

## 1. Using local Python installation

- Python 3.x
```
# Activate virtual env
$ python3 -m venv python-venv
$ source python-venv/bin/activate

# install dependencies 
$ python3 -m pip install --upgrade pip
$ python3 -m pip install --requirement requirements.txt
```

- check Python SQLite3 version
```
$ python3 -c "import sqlite3; print(sqlite3.sqlite_version)"
# example: 3.28.0
```

## 2. Using Docker

- Check [docker](tools/docker) to see how to build the image locally.
- Run any tool below, i.e. 
`$ docker run -v $(PWD):/app --rm opentdata-tools-python python3 hrdf_db_reporter_cli.py -p tmp/hrdf_2021-01-10.sqlite`

## 3. Running the scripts on the server

- Check [tools/scripts](tools/scripts)