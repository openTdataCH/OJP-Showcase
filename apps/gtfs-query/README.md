# API gtfs-query

This application is an API that queries the GTFS DBs and used by the [gtfs-rt-status](https://opentdatach.github.io/gtfs-rt-status/) web app. 

## Query GTFS Active Trips

`GET /query_active_trips`

This API returns all active trips for a given interval or running at a given time

### Query Params

| Param | Description | Example |
|-|-|-|
| day | Request day, if missing, the current day will be used | `2021-10-27` |
| hhmm | Request time, if missing, the current time will be used | `1400` |
| from_hhmm | Filter trips after given time | `1330` |
| to_hhmm | Filter trips before given time | `1700` |
| filter_agency_ids | Filter trips and routes for the agency_ids, separated by comma `,` | `11,801`, `HAS_GTFS_RT` can be used for the [GO-RT](https://github.com/openTdataCH/showcases/blob/develop/tools/_shared/inc/config/go-realtime.csv) companies |
| parse_type | Trips format output | `FLAT` for a condensed output (stop_times also included) |

### Sample output:

[query_active_trips?day=2021-10-31&hhmm=2240&from_hhmm=2210&to_hhmm=2540&filter_agency_ids=HAS_GTFS_RT&parse_type=FLAT](https://tools.odpch.ch/gtfs-query/query_active_trips?day=2021-10-31&hhmm=2240&from_hhmm=2210&to_hhmm=2540&filter_agency_ids=HAS_GTFS_RT&parse_type=FLAT)

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

## Query Trips

`GET /trips`

### Params Cases

| Required | Optional | Description | Example |
|-|-|-|-|
| `route_short_name`, `line_ref` | `service_day` | Trips by `routes.route_short_name` and line_ref. Additionally `service_day` can be used to restrict the results to a given day | [route_short_name=451&line_ref=85:801:405&service_day=2025-01-03](https://tools.odpch.ch/gtfs-query/trips?route_short_name=451&line_ref=85%3A801%3A405&service_day=2025-01-03) |
| `agency_id`, `service_day` |  | All trips of a  `routes.agency_id` for a given `service_day` | [agency_id=11&service_day=2025-01-01](https://tools.odpch.ch/gtfs-query/trips?agency_id=11&service_day=2025-01-01) |
| `agency_id`, `route_short_name` | `service_day` | All trips of a `routes.agency_id` for a given `routes.route_short_name`. Additionally `service_day` can be used to restrict the results to a given day  | [agency_id=801&route_short_name=451&service_day=2025-01-01](https://tools.odpch.ch/gtfs-query/trips?agency_id=801&route_short_name=451&service_day=2025-01-01) |
| `journey_ref` | `service_day` | All trips of a `journey_ref` in format of [swiss journey id](https://www.oev-info.ch/de/datenmanagement/sid4pt-swiss-id-public-transport/swiss-journey-identification-sjyid), i.e. `ch:1:sjyid:100001:730-001` or different formats, i.e. `85:33:4491:001` . Additionally `service_day` can be used to restrict the results to a given day  | [journey_ref=ch:1:sjyid:100015:15340-001&service_day=2025-01-03](https://tools.odpch.ch/gtfs-query/trips?journey_ref=ch%3A1%3Asjyid%3A100015%3A15340-001&service_day=2025-01-03) |
| `original_trip_id` | `service_day` | All trips of a `trips.original_trip_id` . Additionally `service_day` can be used to restrict the results to a given day  | [original_trip_id=ch:1:sjyid:100001:18430-003&service_day=2025-01-01](https://tools.odpch.ch/gtfs-query/trips?original_trip_id=ch%3A1%3Asjyid%3A100001%3A18430-003&service_day=2025-01-01) |

### Example Response

[trips?original_trip_id=ch:1:sjyid:100001:18430-003](https://tools.odpch.ch/gtfs-query/trips?original_trip_id=ch%3A1%3Asjyid%3A100001%3A18430-003)

```
{
  "metadata": {
    "gtfs_day": "2024-12-23",
    "rows_no": 7
  },
  "rows": [
    {
      "trip_id": "311.TA.91-33-C-j25-1.285.H",
      "trip_short_name": "18430",
      "departure_time": "17:02:00",
      "arrival_time": "18:59:00",
      "departure_day_minutes": 1022,
      "arrival_day_minutes": 1139,
      "trip_headsign": "Gen\u00e8ve-A\u00e9roport",
      "original_trip_id": "ch:1:sjyid:100001:18430-003",
      "route_id": "91-33-C-j25-1",
      "route_type": 106,
      "route_short_name": "RE33",
      "agency_id": "11",
      "agency_name": "Schweizerische Bundesbahnen SBB",
      "stop_times_s": "8501500:0:3||17:02 -- 8501403:0:2|17:13|17:14 -- 8501402:0:2|17:19|17:19 -- 8501400:0:2|17:25|17:26 -- 8501303:0:1|17:33|17:33 -- 8501300:0:1|17:37|17:38 -- 8501200:0:1|17:43|17:43 -- 8501120:0:8|17:58|18:00 -- 8501118:0:2|18:05|18:05 -- 8501037:0:1|18:13|18:13 -- 8501035:0:2|18:20|18:20 -- 8501033:0:2|18:24|18:25 -- 8501031:0:3|18:30|18:30 -- 8501030:0:1|18:34|18:35 -- 8501023:0:2|18:40|18:41 -- 8501008:0:2|18:51|18:52 -- 8501026:0:1|18:59|",
      "day_bits": "0000000000000000000000000000000000000000000000001100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
    },
    {
      "trip_id": "312.TA.91-33-C-j25-1.285.H",
      "trip_short_name": "18430",
      "departure_time": "17:02:00",
      "arrival_time": "18:59:00",
      "departure_day_minutes": 1022,
      "arrival_day_minutes": 1139,
      "trip_headsign": "Gen\u00e8ve-A\u00e9roport",
      "original_trip_id": "ch:1:sjyid:100001:18430-003",
      "route_id": "91-33-C-j25-1",
      "route_type": 106,
      "route_short_name": "RE33",
      "agency_id": "11",
      "agency_name": "Schweizerische Bundesbahnen SBB",
      "stop_times_s": "8501500:0:3||17:02 -- 8501403:0:2|17:13|17:14 -- 8501402:0:2|17:19|17:19 -- 8501400:0:2|17:25|17:26 -- 8501303:0:1|17:33|17:33 -- 8501300:0:1|17:37|17:38 -- 8501200:0:1|17:43|17:43 -- 8501120:0:8|17:58|18:00 -- 8501118:0:2|18:05|18:05 -- 8501037:0:1|18:13|18:13 -- 8501035:0:2|18:20|18:20 -- 8501033:0:2|18:24|18:25 -- 8501031:0:3|18:30|18:30 -- 8501030:0:1|18:34|18:35 -- 8501023:0:2|18:40|18:41 -- 8501008:0:2|18:51|18:53 -- 8501026:0:1|18:59|",
      "day_bits": "0000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
    },
    {
      "trip_id": "314.TA.91-33-C-j25-1.27.H",
      "trip_short_name": "18430",
      "departure_time": "17:02:00",
      "arrival_time": "18:59:00",
      "departure_day_minutes": 1022,
      "arrival_day_minutes": 1139,
      "trip_headsign": "Gen\u00e8ve-A\u00e9roport",
      "original_trip_id": "ch:1:sjyid:100001:18430-003",
      "route_id": "91-33-C-j25-1",
      "route_type": 106,
      "route_short_name": "RE33",
      "agency_id": "11",
      "agency_name": "Schweizerische Bundesbahnen SBB",
      "stop_times_s": "8501500:0:3||17:02 -- 8501403:0:2|17:13|17:14 -- 8501402:0:2|17:19|17:19 -- 8501400:0:2|17:25|17:26 -- 8501303:0:1|17:33|17:33 -- 8501300:0:1|17:37|17:38 -- 8501200:0:1|17:43|17:43 -- 8501120:0:8|17:58|18:00 -- 8501118:0:2|18:05|18:05 -- 8501037:0:1|18:13|18:13 -- 8501035:0:2|18:20|18:20 -- 8501033:0:2|18:24|18:25 -- 8501031:0:3|18:30|18:30 -- 8501030:0:1|18:34|18:35 -- 8501023:0:2|18:40|18:41 -- 8501008:0:2|18:51|18:53 -- 8501026:0:2|18:59|",
      "day_bits": "0000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
    },
    {
      "trip_id": "326.TA.91-33-C-j25-1.457.H",
      "trip_short_name": "18430",
      "departure_time": "17:33:00",
      "arrival_time": "19:18:00",
      "departure_day_minutes": 1053,
      "arrival_day_minutes": 1158,
      "trip_headsign": "Annemasse",
      "original_trip_id": "ch:1:sjyid:100001:18430-003",
      "route_id": "91-33-C-j25-1",
      "route_type": 106,
      "route_short_name": "RE33",
      "agency_id": "11",
      "agency_name": "Schweizerische Bundesbahnen SBB",
      "stop_times_s": "8501303:0:3||17:33 -- 8501300:0:1|17:37|17:38 -- 8501200:0:1|17:43|17:43 -- 8501120:0:7|17:58|18:00 -- 8501118:0:2|18:05|18:05 -- 8501037:0:1|18:13|18:13 -- 8501035:0:2|18:20|18:20 -- 8501033:0:2|18:24|18:25 -- 8501031:0:3|18:30|18:30 -- 8501030:0:1|18:34|18:35 -- 8501023:0:2|18:40|18:41 -- 8501008:0:2|18:51|18:53 -- 8516155:0:1|18:59|19:00 -- 8517142:0:1|19:02|19:02 -- 8516272:0:1|19:06|19:06 -- 8516273:0:1|19:08|19:09 -- 8516274:0:1|19:13|19:13 -- 8774549|19:18|",
      "day_bits": "0000000000000000000000000000000000000000000000000000000000000000000000000000000000011000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
    },
    {
      "trip_id": "401.TA.91-33-C-j25-1.33.H",
      "trip_short_name": "18430",
      "departure_time": "17:02:00",
      "arrival_time": "19:18:00",
      "departure_day_minutes": 1022,
      "arrival_day_minutes": 1158,
      "trip_headsign": "Annemasse",
      "original_trip_id": "ch:1:sjyid:100001:18430-003",
      "route_id": "91-33-C-j25-1",
      "route_type": 106,
      "route_short_name": "RE33",
      "agency_id": "11",
      "agency_name": "Schweizerische Bundesbahnen SBB",
      "stop_times_s": "8501500:0:3||17:02 -- 8501403:0:2|17:13|17:14 -- 8501402:0:2|17:19|17:19 -- 8501400:0:2|17:25|17:26 -- 8501303:0:1|17:33|17:33 -- 8501300:0:1|17:37|17:38 -- 8501200:0:1|17:43|17:43 -- 8501120:0:7|17:58|18:00 -- 8501118:0:2|18:05|18:05 -- 8501037:0:1|18:13|18:13 -- 8501035:0:2|18:20|18:20 -- 8501033:0:2|18:24|18:25 -- 8501031:0:3|18:30|18:30 -- 8501030:0:1|18:34|18:35 -- 8501023:0:2|18:40|18:41 -- 8501008:0:2|18:51|18:53 -- 8516155:0:1|18:59|19:00 -- 8517142:0:1|19:02|19:02 -- 8516272:0:1|19:06|19:06 -- 8516273:0:1|19:08|19:09 -- 8516274:0:1|19:13|19:13 -- 8774549|19:18|",
      "day_bits": "0000000000000000000000000000000000000000000000000000000000000000000000000000110000000000001100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
    },
    {
      "trip_id": "404.TA.91-33-C-j25-1.34.H",
      "trip_short_name": "18430",
      "departure_time": "17:02:00",
      "arrival_time": "19:18:00",
      "departure_day_minutes": 1022,
      "arrival_day_minutes": 1158,
      "trip_headsign": "Annemasse",
      "original_trip_id": "ch:1:sjyid:100001:18430-003",
      "route_id": "91-33-C-j25-1",
      "route_type": 106,
      "route_short_name": "RE33",
      "agency_id": "11",
      "agency_name": "Schweizerische Bundesbahnen SBB",
      "stop_times_s": "8501500:0:3||17:02 -- 8501403:0:2|17:13|17:14 -- 8501402:0:2|17:19|17:19 -- 8501400:0:2|17:25|17:26 -- 8501303:0:1|17:33|17:33 -- 8501300:0:1|17:37|17:38 -- 8501200:0:1|17:43|17:43 -- 8501120:0:8|17:58|18:00 -- 8501118:0:2|18:05|18:05 -- 8501037:0:1|18:13|18:13 -- 8501035:0:2|18:20|18:20 -- 8501033:0:2|18:24|18:25 -- 8501031:0:3|18:30|18:30 -- 8501030:0:1|18:34|18:35 -- 8501023:0:2|18:40|18:41 -- 8501008:0:2|18:51|18:53 -- 8516155:0:1|18:59|19:00 -- 8517142:0:1|19:02|19:02 -- 8516272:0:1|19:06|19:06 -- 8516273:0:1|19:08|19:09 -- 8516274:0:1|19:13|19:13 -- 8774549|19:18|",
      "day_bits": "1000001100110110011011000001100000110000011000000000000000000010000001100000000000000000000000000110000011000001100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
    },
    {
      "trip_id": "405.TA.91-33-C-j25-1.289.H",
      "trip_short_name": "18430",
      "departure_time": "17:02:00",
      "arrival_time": "19:18:00",
      "departure_day_minutes": 1022,
      "arrival_day_minutes": 1158,
      "trip_headsign": "Annemasse",
      "original_trip_id": "ch:1:sjyid:100001:18430-003",
      "route_id": "91-33-C-j25-1",
      "route_type": 106,
      "route_short_name": "RE33",
      "agency_id": "11",
      "agency_name": "Schweizerische Bundesbahnen SBB",
      "stop_times_s": "8501500:0:3||17:02 -- 8501403:0:2|17:13|17:14 -- 8501402:0:2|17:19|17:19 -- 8501400:0:2|17:25|17:26 -- 8501303:0:1|17:33|17:33 -- 8501300:0:1|17:37|17:38 -- 8501200:0:1|17:43|17:43 -- 8501120:0:8|17:58|18:00 -- 8518452:0:1|18:02|18:02 -- 8501118:0:2|18:05|18:05 -- 8501037:0:1|18:13|18:13 -- 8501035:0:2|18:20|18:20 -- 8501033:0:2|18:24|18:25 -- 8501031:0:3|18:30|18:30 -- 8501030:0:1|18:34|18:35 -- 8501023:0:2|18:40|18:41 -- 8501008:0:2|18:51|18:53 -- 8516155:0:1|18:59|19:00 -- 8517142:0:1|19:02|19:02 -- 8516272:0:1|19:06|19:06 -- 8516273:0:1|19:08|19:09 -- 8516274:0:1|19:13|19:13 -- 8774549|19:18|",
      "day_bits": "0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
    }
  ]
}
```

## Query routes representative trip

This API returns the most representative trip for each `routes` row. The ranking is done by aggregating number of `calendar.day_bits` `1` values and the number of stops.

`GET /query_routes_representative_trip`

### Query Params

| Param | Description | Example |
|-|-|-|
| service_day | Optional, if present it will filter only for trips running in the given `service_day` | `2021-10-27` |

The output is similar with `/trips` API

## Query Single Trip

`GET /trip/{trip_id}`

where `trip_id` is the `trips.trip_id` value from the latest GTFS dataset.

### Example Response

[trip/404.TA.91-33-C-j25-1.34.H](https://tools.odpch.ch/gtfs-query/trip/404.TA.91-33-C-j25-1.34.H)

```
{
  "message": [],
  "result": {
    "trip": {
      "trip_id": "404.TA.91-33-C-j25-1.34.H",
      "route_id": "91-33-C-j25-1",
      "service_id": "TA+od210",
      "trip_headsign": "Annemasse",
      "trip_short_name": "18430",
      "direction_id": "0",
      "departure_day_minutes": 1022,
      "arrival_day_minutes": 1158,
      "departure_time": "17:02:00",
      "arrival_time": "19:18:00",
      "stop_times_s": "8501500:0:3||17:02 -- 8501403:0:2|17:13|17:14 -- 8501402:0:2|17:19|17:19 -- 8501400:0:2|17:25|17:26 -- 8501303:0:1|17:33|17:33 -- 8501300:0:1|17:37|17:38 -- 8501200:0:1|17:43|17:43 -- 8501120:0:8|17:58|18:00 -- 8501118:0:2|18:05|18:05 -- 8501037:0:1|18:13|18:13 -- 8501035:0:2|18:20|18:20 -- 8501033:0:2|18:24|18:25 -- 8501031:0:3|18:30|18:30 -- 8501030:0:1|18:34|18:35 -- 8501023:0:2|18:40|18:41 -- 8501008:0:2|18:51|18:53 -- 8516155:0:1|18:59|19:00 -- 8517142:0:1|19:02|19:02 -- 8516272:0:1|19:06|19:06 -- 8516273:0:1|19:08|19:09 -- 8516274:0:1|19:13|19:13 -- 8774549|19:18|",
      "shape_id": "",
      "original_trip_id": "ch:1:sjyid:100001:18430-003"
    },
    "calendar": {
      "service_id": "TA+od210",
      "monday": 0,
      "tuesday": 0,
      "wednesday": 0,
      "thursday": 0,
      "friday": 0,
      "saturday": 1,
      "sunday": 1,
      "start_date": "20241215",
      "end_date": "20251213",
      "day_bits": "1000001100110110011011000001100000110000011000000000000000000010000001100000000000000000000000000110000011000001100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
    }
  }
}
```


## Lookup Tables

`GET /db_lookups`

This API returns entire content of the `agency`, `routes` and `stops` tables.

### Query Params

| Param | Description | Example |
|-|-|-|
| gtfs_day | GTFS feed version to be used | `2026-03-07` |

### Sample output:

[db_lookups?gtfs_day=2026-03-07](https://tools.odpch.ch/gtfs-query/db_lookups?day=2021-10-31&hhmm=2221)

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