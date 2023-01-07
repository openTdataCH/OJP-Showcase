# OpenTData OJP-Showcase Tools

## Apps

- [GTFS-RT -static Comparsion](apps/gtfs-rt-status)
- [GTFS -static Query API](apps/gtfs-query)
- [HRDF Check Duplicates](apps/hrdf-duplicates-report)
- [HRDF Query API](apps/hrdf-query)

## Tools

- [CKAN Utils](tools/ckan-utils)
- [GTFS-HRDF Compare](tools/gtfs-hrdf-compare)
- [GTFS-Static compare](tools/gtfs-prev-compare)
- [GTFS-RT Fetcher](tools/gtfs-rt-fetch)
- [GTFS-Static DB Importer](tools/gtfs-static-db-importer)
- [HRDF Check Duplicates](tools/hrdf-check-duplicates)
- [HRDF DB Importer](tools/hrdf-db-importer)
- [HRDF Stops Reporter](tools/hrdf-stops-reporter)

# Tools Installation

You can run the tools in two ways

## 1. Using local Python installation

- Python 3.x
- Dependencies `pip3 install pyyaml`

## 2. Using Docker

- Check [docker](tools/docker) to see how to build the image locally.
- Run any tool below, i.e. 
`$ docker run -v $(PWD):/app --rm opentdata-tools-python python3 hrdf_db_reporter_cli.py -p tmp/hrdf_2021-01-10.sqlite`

## 3. Running the scripts on the server

- Check [tools/scripts](tools/scripts)