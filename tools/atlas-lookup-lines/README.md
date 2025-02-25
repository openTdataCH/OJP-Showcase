# Atlas Lookup Lines tool

This is a Python app that intersects [Atlas-Lines](https://data.opentransportdata.swiss/de/dataset/slnid-line) dataset rows with [oev-info.ch](https://www.oev-info.ch/de/fahrplan-aktuell/fahrplanfelder-abfragen) results.

The result is a JSON file and is used in [Atlas-Lines compare GTFS-Routes](https://tools.odpch.ch/atlas-route-compare-gtfs/) app.

Current JSON report: https://tools.odpch.ch/data/atlas_oev_report.json

## Process

- latest Atlas-Lines CSV datset is read
- for each CSV row, the `swissLineNumber` field is parsed
    - for example, given string `b0.IR62`, `f.2247`, `r.60.611` etc. is split by `.`
    - first part, letter-based, is kept - i.e. `b0`, `f`, `r`, etc
    - only `f`unicular, `n`avigation, `r`oute rows are kept, the other rows are discarded
    - second part. i.e. `IR62`, or `2247`, `60.611` is appended to oev detail pages
    - i.e. https://www.oev-info.ch/de/fahrplan-aktuell/fahrplanfelder/2025-60.611
- detail pages are fetched and stops (Alle Haltestellen dieser Strecke) are extracted
- the stops are matched against GTFS `stops` table 
- the `trips`+`stop_times` row that contains most of these stops is kept as candidate and `routes.route_id` is saved
- a JSON file is generated containing the matching status. 

See also [atlas-compare-gtfs-decision-flow.jpg](./docs/atlas-compare-gtfs-decision-flow.jpg)

### Matching Figures

At the moment (Feb 2025) there are:
- 3'500 Atlas-line rows
- CSV rows grouped by `swissLineNumber` part

| swissLineNumber part | Rows No | Description |
| - | - | - |
| `b` | 332 | Train / National routes |
| `c` | 6 | Autoverlad routes |
| `f` | 604 | Funicular, Cablecar routes |
| `n` | 74 | Water (Navigation) routes |
| `r` | 2486 | Bus routes, regional routes, city routes |

- `f`, `n`, `r` are 3'164 rows
- routes ending with `:K` are also discarded, these are meta rows addresing a group of routes
    - i.e. https://atlas.app.sbb.ch/line-directory/lines/ch:1:slnid:1027326

Result rows grouped by match status

| Status | Items No | Description |
| - | - | - |
| `OK_TRIP` | 2'413 | Rows with [oev-info.ch](https://www.oev-info.ch/de) equivalent + GTFS match |
| `ERROR_NO_GTFS_TRIP` | 12 | Rows with [oev-info.ch](https://www.oev-info.ch/de) equivalent but without GTFS match |
| `ERROR_NO_OEV_FILE` | 1'076 | Non `f`, `n`, `r` rows or rows that don't have an equivalent in [oev-info.ch](https://www.oev-info.ch/de) |

## Report Examples

GTFS trip match
- [ch:1:slnid:1024659](https://atlas.app.sbb.ch/line-directory/lines/ch:1:slnid:1024659) 
- [oev-info.ch/2025-2050](https://www.oev-info.ch/de/fahrplan-aktuell/fahrplanfelder/2025-2050) 
- status `OK_TRIP`
- GTFS route_id `93-VCP-j25-1`

```
{
    "slnid": "ch:1:slnid:1024659",
    "businessOrganisation": "ch:1:sboid:100126",
    "swissLineNumber": "f.2050",
    "number": "2050",
    "description": "Vevey - Chardonne - Mont-Pèlerin",
    "oev_stop_names": "Beau-Site - Chardonne-Jongny - Corseaux - La Baume - Mont-Pèlerin - Vevey (funi)",
    "gtfs_route_id": "93-VCP-j25-1",
    "gtfs_trip_stop_names": "Vevey (funi) - Corseaux - Beau-Site - Chardonne-Jongny - La Baume - Mont-Pèlerin",
    "status": "OK_TRIP"
},
```
No GTFS matches
- [ch:1:slnid:1024842](https://atlas.app.sbb.ch/line-directory/lines/ch:1:slnid:1024842) 
- [oev-info.ch/2025-2310](https://www.oev-info.ch/de/fahrplan-aktuell/fahrplanfelder/2025-2310) 
- status `ERROR_NO_GTFS_TRIP`

```
{
    "slnid": "ch:1:slnid:1024842",
    "businessOrganisation": "ch:1:sboid:100272",
    "swissLineNumber": "f.2310",
    "number": "2310",
    "description": "Saas Grund - Kreuzboden - Hohsaas (2 Sektionen)",
    "oev_stop_names": "Hohsaas - Kreuzboden - Saas-Grund (Hohsaas Talst.) - Trift",
    "gtfs_route_id": null,
    "gtfs_trip_stop_names": null,
    "status": "ERROR_NO_GTFS_TRIP"
},
```

No OEV file
- [ch:1:slnid:1024329](https://atlas.app.sbb.ch/line-directory/lines/ch:1:slnid:1024329) 

```
{
    "slnid": "ch:1:slnid:1024329",
    "businessOrganisation": "ch:1:sboid:100001",
    "swissLineNumber": "b0.IC1",
    "number": "IC1",
    "description": "Genève-Aéroport - Genève - Bern - Zürich HB - St. Gallen",
    "oev_stop_names": null,
    "gtfs_route_id": null,
    "gtfs_trip_stop_names": null,
    "status": "ERROR_NO_OEV_FILE"
},
```

## Development

see main [README.md](../../README.md) for Python installation

```
$ cd tools/atlas-lookup-lines

# execute program
$ python3 cli_run_lookup_lines.py
```

