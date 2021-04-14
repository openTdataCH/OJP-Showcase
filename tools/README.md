## Tools

- [GTFS-RT Fetcher](tools/gtfs-rt-fetch)
- [GTFS-Static DB Importer](tools/gtfs-static-db-importer)
- [GTFS-Static Assets Exporter](tools/gtfs-static-snapshot-exporter)
- [HRDF DB Importer](tools/hrdf-db-importer)
- [HRDF Stops Reporter](tools/hrdf-stops-reporter)

## Requirements

### Using local Python installation

- Python 3.x
- Dependencies `pip3 install pyyaml`

### Using Docker

- Check [docker](docker) to see how to build the image locally.
- Run any tool below, i.e. 
`$ docker run -v $(PWD):/app --rm opentdata-tools-python python3 hrdf_db_reporter_cli.py -p tmp/hrdf_2021-01-10.sqlite`
