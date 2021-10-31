# API gtfs-query

This application is an API that queries the GTFS DBs and used by the [gtfs-rt-status](https://opentdatach.github.io/gtfs-rt-status/) web app. 

## Active Trips

`GET /query_active_trips`

This API returns all active trips for a given interval or running at a given time

### Query Params

| Param | Description | Example |
|-|-|-|
| day | Request day, if missing, the current day will be used | `2021-10-27` |
| hhmm | Request time, if missing, the current time will be used | `1400` |
| from_hhmm | Filter trips after given time | `1330` |
| to_hhmm | Filter trips before given time | `1700` |
| filter_agency_ids | Filter trips and routes for the agency_ids, separated by comma `,` | `11,801`, `HAS_GTFS_RT` can be used for the [GO-RT](https://github.com/openTdataCH/OJP-Showcase/blob/develop/tools/_shared/inc/config/go-realtime.csv) companies |
| parse_type | Trips format output | `FLAT` for a condensed output (stop_times also included) |

### Sample output:

[query_active_trips?day=2021-10-31&hhmm=2240&from_hhmm=2210&to_hhmm=2540&filter_agency_ids=HAS_GTFS_RT&parse_type=FLAT](https://www.m23.ch/customers/openTdataCH/gtfs-query/query_active_trips?day=2021-10-31&hhmm=2240&from_hhmm=2210&to_hhmm=2540&filter_agency_ids=HAS_GTFS_RT&parse_type=FLAT)

```
{
    "data_source": "cache or DB",
    "rows_no": 9254,
    "rows": [
        {
            "trip_id": "1247.TA.91-10-D-j21-1.698.R",
            "trip_short_name": "25190",
            "route_id": "91-10-D-j21-1",
            "stop_times_s": "8505307:0:4||23:20 -- 8505306:0:2|23:23|23:23 -- 8505305:0:5|23:30|"
        },
        {
            "trip_id": "1250.TA.91-10-D-j21-1.698.R",
            "trip_short_name": "25188",
            "route_id": "91-10-D-j21-1",
            "stop_times_s": "8505307:0:4||22:20 -- 8505306:0:2|22:23|22:23 -- 8505305:0:5|22:30|"
        }
    ]
    ... more rows
}
```

## Lookup Tables

`GET /db_lookups`

This API returns entire content of the `agency`, `routes` and `stops` tables.

### Query Params

| Param | Description | Example |
|-|-|-|
| day | Request day, if missing, the current day will be used | `2021-10-27` |
| hhmm | Request time, if missing, the current time will be used | `1400` |

### Sample output:

[db_lookups?day=2021-10-31&hhmm=2221](https://www.m23.ch/customers/openTdataCH/gtfs-query/db_lookups?day=2021-10-31&hhmm=2221)

```
{
    "agency": {
        "lookup_name": "agency",
        "data_source": "cache: lookup_table_v1_2021-10-27_agency.json",
        "rows_no": 461,
        "rows": [
            {
                "agency_id": "11",
                "agency_name": "Schweizerische Bundesbahnen SBB",
                "agency_url": "http:\/\/www.sbb.ch\/",
                "agency_timezone": "Europe\/Berlin",
                "agency_lang": "DE",
                "agency_phone": "0900 300 300 "
            },
            ... more rows
        ]
    },
    "routes": {
        "lookup_name": "routes",
        "data_source": "cache: lookup_table_v1_2021-10-27_routes.json",
        "rows_no": 4835,
        "rows": [
            {
                "route_id": "91-10-A-j21-1",
                "agency_id": "37",
                "route_short_name": "10",
                "route_long_name": "",
                "route_desc": "T",
                "route_type": 900
            },
            ... more rows
        ]
    },
    "stops": {
        "lookup_name": "stops",
        "data_source": "cache: lookup_table_v1_2021-10-27_stops.json",
        "rows_no": 39001,
        "rows": [
            {
                "stop_id": "1100008",
                "stop_name": "Zell (Wiesental), Wilder Mann",
                "stop_lon": 7.85964788274668,
                "stop_lat": 47.7100842702352,
                "location_type": "",
                "parent_station": ""
            },
            ... more rows
        ]
    }
}
```