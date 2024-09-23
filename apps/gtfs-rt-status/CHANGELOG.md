# CHANGELOG gtfs-rt-status

Demo URL: https://tools.odpch.ch/gtfs-rt-status/

----

23.September.2024
- use https://opentransportdata.swiss/de/dataset/go-realtime dataset instead of static CSV export
- updates `gtfs-rt-status` webapp with details about the datasets
- adds script to fetch `business-organisations`, `go-realtime` datasets
- harmonize parsing of the CKAN datasets (zip, CSV mixed data)

31.May 2024
- use [GTFS DB Catalog](https://tools.odpch.ch/gtfs-static-dbs/gtfs-static-dbs.json) to fetch info about the latest imported DB
- use shared GTFS models
- promote the GTFS-RT not matched TripIds which are not prefixed with `ojp:` or `atv:`
- exclude GTFS-RT not-matched TripIDs that are part of the current day

29.May 2022
- use new demo URL - https://tools.odpch.ch/gtfs-rt-status/

31.Oct 2021
- use an API to fetch GTFS-static trips - see [#17 Container for downloading and visualizing GTFS -static -RT](https://github.com/openTdataCH/OJP-Showcase/issues/17)
- add GTFS static comparison stats - see [#18 Compare GTFS Static / RT](https://github.com/openTdataCH/OJP-Showcase/issues/18)

13.Apr 2021
- version 1.0