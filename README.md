# Showcases

Repository structure:

- [apps](./apps/) - (web)applications (Angular)
- [tools](./tools/) - server side tools (Python, NodeJs)

## GTFS Apps & Tools

| App | Repo Path | Demo URL | Description |
|-|-|-|-|
| Atlas-Lines compare GTFS-Routes | [apps/atlas-routes-compare-gtfs](./apps/atlas-routes-compare-gtfs/) | https://tools.odpch.ch/atlas-route-compare-gtfs/ | Visualize and compare Atlas line with GTFS routes.txt dataset |
| GTFS-RT -static Report | [apps/gtfs-rt-static-report](./apps/gtfs-rt-static-report/) | https://tools.odpch.ch/gtfs-rt-static-report/ | Visualize the monthly comparison between GTFS-RT and GTFS static datasets |
| GTFS-RT Status | [apps/gtfs-rt-status](./apps/gtfs-rt-status/) | https://tools.odpch.ch/gtfs-rt-status/ | Visualize the current comparison between GTFS-RT and GTFS static datasets |
| GTFS-static query API | [apps/gtfs-query](./apps/gtfs-query) | https://github.com/openTdataCH/showcases/tree/develop/apps/gtfs-query | GTFS-static query API built on top of current dataset |
| GTFS - HRDF Compare | [tools/gtfs-hrdf-compare/](./tools/gtfs-hrdf-compare/) | https://github.com/openTdataCH/showcases/blob/develop/tools/gtfs-hrdf-compare | CLI tool that compares GTFS and HRDF datasets |
| GTFS Datasets Compare | [tools/gtfs-hrdf-compare/](./tools/gtfs-prev-compare/) | https://github.com/openTdataCH/showcases/blob/develop/tools/gtfs-prev-compare | CLI tool that compares 2 GTFS datasets |
| GTFS-RT - GTFS-static compare | [tools/gtfs-rt-static-compare/](./tools/gtfs-rt-static-compare/) | https://github.com/openTdataCH/showcases/tree/develop/tools/gtfs-rt-static-compare | CLI tool that compares GTFS-static and GTFS-RT datasets |
| GTFS-static DB importer | [tools/gtfs-static-db-importer/](./tools/gtfs-static-db-importer/) | https://github.com/openTdataCH/showcases/tree/develop/tools/gtfs-static-db-importer | Tool that ingests a given GTFS-static dataset into a SQLite DB |

## HRDF Apps & Tools

| App | Repo Path | Demo URL | Description |
|-|-|-|-|
| Bitfeld visualizer | [apps/bitfeld-viz](./apps/bitfeld-viz/) | https://tools.odpch.ch/bitfeld-viz/ | Visualize HRDF [Bitfeld](https://opentransportdata.swiss/de/cookbook/timetable-cookbook/hafas-rohdaten-format-hrdf/#BITFELD) strings |
| HRDF Duplicates Report | [apps/hrdf-duplicates-report](./apps/hrdf-duplicates-report/) | https://tools.odpch.ch/hrdf-check-duplicates/ | Visualize current HRDF dataset duplicates on Fahrtnummer |
| HRDF query API | [apps/hrdf-query](./apps/hrdf-query) | https://github.com/openTdataCH/showcases/tree/develop/apps/hrdf-query | HRDF query API built on top of current dataset |
| GTFS - HRDF Compare | [tools/gtfs-hrdf-compare/](./tools/gtfs-hrdf-compare/) | https://github.com/openTdataCH/showcases/blob/develop/tools/gtfs-hrdf-compare | CLI tool that compares GTFS and HRDF datasets |
| HRDF Check duplicates | [tools/hrdf-check-duplicates/](./tools/hrdf-check-duplicates/) | https://github.com/openTdataCH/showcases/tree/develop/tools/hrdf-check-duplicates | Tool that checks for FPLAN duplicates in a given HRDF dataset |
| HRDF DB importer | [tools/gtfs-static-db-importer/](./tools/hrdf-db-importer/) | https://github.com/openTdataCH/showcases/tree/develop/tools/hrdf-db-importer | Tool that ingests a given HRDF dataset into a SQLite DB |

## SIRI-SX / SIRI-ET Apps

| App | Repo Path | Demo URL | Description |
|-|-|-|-|
| SIRI-ET check SLOIDs | [apps/siri-et-check-sloids](./apps/siri-et-check-sloids/) | https://tools.odpch.ch/siri-et-check-sloids/ | Visualize [SIRI-ET](https://opentransportdata.swiss/en/cookbook/siri-et-pt-with-request-response/) messages for missing [SLOIDs](https://www.oev-info.ch/de/datenmanagement/sid4pt-swiss-id-public-transport/swiss-location-identification-sloid) |
| SIRI-ET compare with GTFS-RT | [apps/siri-et-compare-gtfs-rt](./apps/siri-et-compare-gtfs-rt/) | https://tools.odpch.ch/siri-et-compare-gtfs/ | Visualize [SIRI-ET](https://opentransportdata.swiss/en/cookbook/siri-et-pt-with-request-response/) dataset with [GTFS-RT](https://opentransportdata.swiss/en/cookbook/gtfs-sa/) feed |

## Miscellanous

| App | Repo Path | Demo URL | Description |
|-|-|-|-|
| Atlas Geocode Lines Stops | [tools/atlas-geocode-lines/](./tools/atlas-geocode-lines/) | https://github.com/openTdataCH/showcases/tree/develop/tools/atlas-geocode-lines | Tool that extracts stop names from [Atlas-Lines](https://data.opentransportdata.swiss/de/dataset/slnid-line) dataset and geocodes them against [Location Information OJP Service](https://opentransportdata.swiss/en/cookbook/ojplocationinformationrequest/) |
| Atlas Lookup Lines | [tools/atlas-lookup-lines/](./tools/atlas-lookup-lines/) | https://github.com/openTdataCH/showcases/tree/develop/tools/atlas-lookup-lines | Tool that intersects [Atlas-Lines](https://data.opentransportdata.swiss/de/dataset/slnid-line) dataset rows with [oev-info.ch](https://www.oev-info.ch/de/fahrplan-aktuell/fahrplanfelder-abfragen) results. |
| CKAN utils | [tools/ckan-utils/](./tools/ckan-utils/) | https://github.com/openTdataCH/showcases/tree/develop/tools/ckan-utils | CLI tool that fetches datasets from [opentransportdata.swiss](https://opentransportdata.swiss/) |
| Ist-Daten Filter | [tools/ist-daten-filter/](./tools/ist-daten-filter/) | https://github.com/openTdataCH/showcases/tree/develop/tools/ist-daten-filter | CLI tools that fetch and filter [ist-daten](https://archive.opentransportdata.swiss/actual_data_archive.htm) datasets |
