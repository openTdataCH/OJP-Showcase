# GTFS-RT - GTFS-static compare

This document describes the processes behind generation of the GTFS-RT - GTFS-static comparison.

**TLDR**: https://tools.odpch.ch/gtfs-rt-static-report/ for current report

## Running processes

There are two continous running processes (implemented as cronjobs)
- twice per week, MON, THU - GTFS-static DB import
- daily, every hour: 
  - [GTFS-RT](https://opentransportdata.swiss/en/cookbook/gtfs-rt/) feed snapshot creation
  - GTFS-RT - comparison against latest GTFS-static DB
  - aggregate current monthly reports

## GTFS-static DB
- the [GTFS-static dataset](https://opentransportdata.swiss/en/dataset/timetable-2024-gtfs2020) is ingested 2x week using [gtfs-static-db-importer](../../gtfs-static-db-importer/) tool. The output is a SQLite DB.
- after ingestion the following GTFS-static DB catalog file is created/updated
https://tools.odpch.ch/gtfs-static-dbs/gtfs-static-dbs.json

```
{
  "metadata": "Created at 2024-05-27 10:22:47",
  "items": [
    {
      "gtfs_datetime_s": "2024-05-27 06:55",
      "gtfs_day": "2024-05-27",
      "gtfs_rt_switch_datetime_s": "2024-05-27 15:05",
      "table_stats": {
        "agency": 451,
        "calendar": 40781,
        "calendar_dates": 5555954,
        "routes": 4833,
        "shapes": 0,
        "stop_times": 16891069,
        "stops": 74344,
        "trips": 1433283
      },
      "db_relative_path": "gtfs_2024-05-27.sqlite"
    },
    {
```

Schema:

| Key | Value |
|-|-|
| gtfs_datetime_s | GTFS-static dataset datetime. This is computed from filename or from the `created` CKAN resource item |
| gtfs_day | `YYYY-MM-DD` format of the day when GTFS-static dataset was published |
| gtfs_rt_switch_datetime_s | Datetime when the [GTFS-RT](https://opentransportdata.swiss/en/cookbook/gtfs-rt/) feed will use the current GTFS-static data |
| table_stats | GTFS tables row stats | 
| db_relative_path | Path of the SQLite DB on the catalog server | 

## GTFS-RT feed hourly snapshot / comparison report

- the script runs every hour and saves current GTFS-RT feed on disk
- the snapshot files are also exposed via HTTP. **Warning**, the files are big, i.e. 5-50Mb
```
Example for 25.May 2024 10:00 
https://tools.odpch.ch/gtfs-rt-snapshot/2024/05/25/GTFS_RT-2024-05-25-1000.json
```
- the GTFS-RT items are compared against latest GTFS-static DB file
- a matching report is generated, example for `10.October 2025 10:00`:  [gtfs_rt_static_report-2025-10-10-1000.json](view-source:https://tools.odpch.ch/gtfs-rt-static-compare-report/2025/10/10/gtfs_rt_static_report-2025-10-10-1000.json)

```
{
  "metadata": {
    "report_dt": "2025-10-10 10:00:00",
    "gtfs_db_filename": "gtfs_2025-10-09.sqlite",
    "gtfs_db_age": 0.74,
    "gtfs_rt_filename": "GTFS_RT-2025-10-10-1000.json.gz",
    "gtfs_rt_ts": 1760083197,
    "gtfs_rt_dt": "2025-10-10 09:59:57",
    "gtfs_rt_age": -3,
    "total_rows_no": 14619,
    "total_active_rows_no": 4468,
    "tripOK_routeOK_no": 13536,
    "tripOK_routeNOK_no": 0,
    "tripNOK_routeOK_no": 543,
    "tripNOK_routeNOK_no": 540,
    "tripNOK_NOJP_no": 0
  },
  "tripOK_routeNOK": [],
  "tripNOK_routeOK": [
    "ojp:91027:H:R:j24:65522.80: ... truncated",

... more rows

    "ojp:92060:C:H:j24:65531._85:151:TL060 ... truncated"
  ],
  "tripNOK_routeNOK": [
    "ojp:9101V:Y:H:j24:65518.81:81_ ... truncated",
    "ojp:9102G:Y:H:j24:65527.85:11_31099_ch ... truncated",

... more rows

    "ojp:920N6:D:H:j24:65531._85:820:95_85: ... truncated"
  ]
}
```

Schema

| Key | Description | Special Notes |
|-|-|-|
| report_dt | Datetime when the report was created |  |
| gtfs_db_filename | GTFS-static DB used |  |
| gtfs_db_age | Difference in days between report and when GTFS-static dataset was published | Values bigger than 4(days) may refer to data-freshness issue of GTFS-static publishing cycle (which is 2x week) |
| gtfs_rt_filename | GTFS-RT snapshot filename |  |
| gtfs_rt_ts | GTFS-RT UNIX timestamp |  |
| gtfs_rt_dt | GTFS-RT datetime |  |
| gtfs_rt_age | Difference in seconds between GTFS-RT `Header.TimestampUpdated` and report datetime | Abs values bigger than 60(seconds) may refer to data-freshness of the feed, i.e. cache-issues |
| total_rows_no | Total number of GTFS-RT `Entity` items | This number varies between 2k to 15k entries during normal hours (day) |
| total_active_rows_no | Total number of active GTFS-RT `Entity` items | Active Item = item that has the `tripUpdate.trip.startDate` + `startTime` before report time |
| tripOK_routeOK_no | Total number of matched trips against GTFS-static | This number should be close to `total_rows_no` |
| tripOK_routeNOK_no | Total number of matched trips against GTFS-static but without a valid route match. | This should be 0, otherwise there are issues in the datatset |
| tripNOK_routeOK_no | Total number of not-matched trips against GTFS-static but with a valid route match | This should be a small number and the `tripNOK_routeOK` list should contain only `ojp:` prefixed entries |
| tripNOK_routeNOK_no | Total number of not-matched trips against GTFS-static and also without with a valid route match | This should be a small number and the `tripNOK_routeOK` list should contain only `ojp:` prefixed entries |
| tripNOK_NOJP_no | Total number of not-matched trips that have TripId different than `ojp:` prefix | This should be 0, otherwise the GTFS-static DB used is the wrong one |

## GTFS-RT - GTFS-static monthly comparison reports
- the hourly reports are consolidated in a monthly report
- i.e. for October 2025 - https://tools.odpch.ch/gtfs-rt-static-compare-report/2025/gtfs_rt_static_report-2025-10.json
- the report is visualised via https://tools.odpch.ch/gtfs-rt-static-report/
- each day/hr can be inspected and the individual reports to be checked
- previous months can be loaded
- by default `total_active_rows_no` (total number of GTFS-RT **active** feed items) is shown in the report cells but other metadata keys can be chosen
- for each cell following error types can be shown

| Error | Description | Possible cause of error |
|-|-|-|
| `Match` | GTFS-RT snapshot is not in sync with the GTFS-static DB | The GTFS-static dataset wasnt published, however GTFS-RT feed is using the new dataset. |
| `DATA` | GTFS-RT snapshot is missing | The GTFS-RT server returns an invalid response |
| `RT age` | GTFS-RT `Header.TimestampUpdated` is considerably older than the report date | The GTFS-RT server returns a cached / outdated response |
| `Drop` | `total_active_rows_no` dropped below mean value of the prev 10 days measurements done at the same hour. Only workdays are checked. | Agencies are publishing a smaller number of GTFS-RT messages |
