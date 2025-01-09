# CHANGELOG gtfs-static-db-importer

09.Jan 2025
- fix `stop_times.stop_id` GROUP_CONCAT queries which might occur in unexpected results

19.Dec 2024
- imports `original_trip_id` from trips.txt - [PR #71](https://github.com/openTdataCH/OJP-Showcase/pull/71)
    - https://opentransportdata.swiss/en/cookbook/gtfs/#tripstxt

03.May 2024
- adds `cli_aggregate_dbs.py` CLI tool to compute a GTFS DB catalog report of the files that are currently in [./data/gtfs-static-dbs]()

30.Mar 2024
- calendar parsing improvements + other optimizations - [PR #40](https://github.com/openTdataCH/OJP-Showcase/pull/40)

15.Oct 2023
- add support for feeds with `shapes.txt` - [PR #32](https://github.com/openTdataCH/OJP-Showcase/pull/32)
- add support for feeds with only `calendar_dates.txt` and no `calendar.txt` - [PR #33](https://github.com/openTdataCH/OJP-Showcase/pull/33)
