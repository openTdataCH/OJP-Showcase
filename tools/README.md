# Showcases Tools

- [Atlas Geocode Lines](./atlas-geocode-lines)
- [Atlas Lookup Lines](./atlas-lookup-lines/)
- [CKAN Utils](./ckan-utils)
- [GTFS-HRDF Compare](./gtfs-hrdf-compare)
- [GTFS-Static compare](./gtfs-prev-compare)
- [GTFS-RT <-> GTFS static - compare tool](./gtfs-rt-static-compare)
- [GTFS-Static DB Importer](./gtfs-static-db-importer)
- [HRDF Check Duplicates](./hrdf-check-duplicates)
- [HRDF DB Importer](./hrdf-db-importer)
- [Ist-Daten Filter](./ist-daten-filter)

## Installation

You can run the tools in two ways

### 1. Using local Python installation

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

### 2. Using Docker

- Check [docker](./docker/) to see how to build the image locally.
- Run any tool below, i.e. 
`$ docker run -v $(PWD):/app --rm opentdata-tools-python python3 hrdf_db_reporter_cli.py -p tmp/hrdf_2021-01-10.sqlite`

### 3. Running the scripts on the server

- Check [scripts](./scripts/) folder
