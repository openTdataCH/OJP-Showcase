# CHANGELOG ckan-utils

14.January.2024
- adds `User-Agent` header to `opentransportdata.swiss` API requests
- adds `fetch_metadata_cli.py` script that fetches JSON metadata from the CKAN API

23.September.2024
- use https://opentransportdata.swiss/de/dataset/go-realtime dataset instead of static CSV export
- harmonize parsing of the CKAN datasets (zip, CSV mixed data)

4.Mar 2024
- fix for CKAN API JSON parsing - [PR #39](https://github.com/openTdataCH/OJP-Showcase/pull/39)
