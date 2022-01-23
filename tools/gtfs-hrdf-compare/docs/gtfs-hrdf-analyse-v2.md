For the first version check [this gist](https://gist.github.com/vasile/1e75bd12be451b7f621531f2c874e4cd).

# GTFS compare HRDF Analyse

This document is part of [#7 HRDF / gtfs Vergleich](https://github.com/openTdataCH/OJP-Showcase/issues/7) implementation.

## Datasets

For comparison the following datasets were used:
- HRDF: [oev_sammlung_ch_hrdf_5_40_41_2022_20220107_201242](https://opentransportdata.swiss/de/dataset/timetable-54-2022-hrdf)
- GTFS: [gtfs_fp2022_2022-01-12_09-15](https://opentransportdata.swiss/de/dataset/timetable-2022-gtfs2020)

The analyse was performed for 
- `--agency_id` `11` - SBB
- `--day` `2022-01-12` - 12.Jan 2022

## Approach

- select from HRDF ALL trips and build a map of records by:

| Key | Description | Example | Filter |
|-----|-------------|---------|------|
| trip_id | Fahrtnummer from `*Z` row | `832` in `*Z 000832 000011   101` | YES, only trips for `--day` |
| category + service line | Verkehrsmittel from `*G` row + Liniennummer from `*L` row | `IC8` in `*G IC  8506121 8507000` + `*L 8        8506121 8507000  ` | NO filter, all HRDF records are grouped |

- select `--day` GTFS trips and loop for each trip
- check if we have a HRDF trip with `trip_id` as the GTFS `trip.route.short_name`
    - if a trip matches (see below) then we mark the HRDF trip so cant be reused in the next matches
- it could be the case that the `trip_id` runs in another day than `--day` so we check for the combined FPLAN type (category+service line) and try to find a fuzzy match. Keep the first, highest score match (see below for the actual match)

## GTFS - HRDF trip matching approach

Following checks are done:
- check same FPLAN `trip_id` with GTFS `trips.trip_short_name`
- check same FPLAN category + service line (IC3, TGV, etc) with GTFS `routes.route_short_name`
- check calendar (service) and number of days matching
- check for same endpoints (stop ID + departure / arrival times)

| Match Type | Description | FPLAN trip_id | Vehicle Type | Calendar | Endpoints |
|------------|------------|------------|------------|------------|------------|
| MATCH_ALL | Single-result, accurate match | YES | YES | days score | YES |
| MATCH_NO_FPLAN_TYPE | Matched but the FPLAN type doesn't corespond | YES |  | days score | YES |
| MATCH_NO_DATE | Matched but the HRDF service is not active for `--day` param | YES |  | days score | YES |
| NO_MATCH | No match (trip_id or type or endpoints) | NO? |  | days score | NO? |

The days_score is used as a weight the best fuzzy matching (when having multiple results) - see [separate gist](https://gist.github.com/vasile/1e75bd12be451b7f621531f2c874e4cd) to see why we can't rely completly on the calendar running days. 

## Examples

We were using 2 sets of datasets
- example 1 - HRDF 7.Jan + GTFS 12.Jan
- example 2 - HRDF 5.Jan + GTFS 5.Jan

### Example 1 - HRDF 7.Jan + GTFS 12.Jan

```
python3 gtfs_hrdf_compare_cli.py \
    --agency_id 11 \
    --day 2022-01-12 \
    --hrdf-db-path tmp/hrdf-dbs/hrdf_2022-01-07.sqlite \
    --gtfs-db-path tmp/gtfs-static-dbs/gtfs_2022-01-12.sqlite

=================================
COMPARE GTFS WITH HRDF
=================================
HRDF DB PATH: tmp/hrdf-dbs/hrdf_2022-01-07.sqlite
GTFS DB PATH: tmp/gtfs-static-dbs/gtfs_2022-01-12.sqlite
DAY         : 2022-01-12
AGENCY ID   : 11
=================================

[2022-01-12-11:13:18] - Query ALL HRDF trips ...
[2022-01-12-11:13:20] - ... return 15942 trips
[2022-01-12-11:13:20] - Query given day GTFS trips ...
[2022-01-12-11:13:21] - ... return 5407 trips
[2022-01-12-11:13:21] - Saved report to ./reports/gtfs_trips_with_hrdf-2022-01-12.csv
```

The output CSV is available for download
https://drive.google.com/file/d/19QP9a-cz1gClzEIWjWw8JQOcCjoOfxYW/view?usp=sharing

### Match figures HRDF 7.Jan + GTFS 12.Jan

Break down by match type

```
TOTAL GTFS trips        : 5'407

MATCH_ALL               : 5'360  - 99.1%
MATCH_NO_FPLAN_TYPE     :    47
```
All GTFS trips were matched with a unique HRDF trip

### Example 2 - HRDF 5.Jan + GTFS 5.Jan

```
$ python3 gtfs_hrdf_compare_cli.py \
    --agency_id 11 \
    --day 2022-01-10 \
    --hrdf-db-path tmp/hrdf-dbs/hrdf_2022-01-05.sqlite \
    --gtfs-db-path tmp/gtfs-static-dbs/gtfs_2022-01-05.sqlite

=================================
COMPARE GTFS WITH HRDF
=================================
HRDF DB PATH: tmp/hrdf-dbs/hrdf_2022-01-05.sqlite
GTFS DB PATH: tmp/gtfs-static-dbs/gtfs_2022-01-05.sqlite
DAY         : 2022-01-10
AGENCY ID   : 11
=================================

[2022-01-11-15:21:37] - Query ALL HRDF trips ...
[2022-01-11-15:21:39] - ... return 15195 trips
[2022-01-11-15:21:39] - Query given day GTFS trips ...
[2022-01-11-15:21:40] - ... return 5498 trips
[2022-01-11-15:21:40] - Saved report to ./reports/gtfs_trips_with_hrdf-2022-01-10.csv
```

The output CSV is available for download
https://drive.google.com/file/d/100cYJbwFY1xk_bXsAy4XDDOXIcoKpXN3/view?usp=sharing

```
trip_id,route_short_name,short_name,agency_id,route_id,service_id,hrdf_match_type,hrdf_fplan_type,hrdf_service_id_match_score,hrdf_FPLAN_row_idx,hrdf_FPLAN_content,debug_GTFS_calendar,debug_HRDF_calendar
10.TA.91-10-C-j22-1.7.H,S10,25192,11,91-10-C-j22-1,TA+4oq00,MATCH_ALL,S10,15% - 56 days,285675,"*Z 025192 000011   101                                     % -- ... more lines "
```

### Match figures HRDF 5.Jan + GTFS 5.Jan

Break down by match type

```
TOTAL GTFS trips        : 5'498

MATCH_ALL               : 5'421  - 98.6%
MATCH_NO_FPLAN_TYPE     :    47
MATCH_NO_DATE           :    28  

NO_MATCH                :     2
```
A single HRDF trip was found for all trips except 2 trips (match_type `NO_MATCH`)

## Match results examples

### MATCH_ALL

![image](https://user-images.githubusercontent.com/113994/149021904-e951cab3-454f-45a4-a623-1adbb7949e20.png)

GTFS `trips.trip_id` - `126.TA.91-8-D-j22-1.66.H` matches the HRDF trip from line `102121` in `FPLAN` file.

### MATCH_NO_FPLAN_TYPE

See [GTFS trips with different category than HRDF](https://gist.github.com/vasile/d1ea81fcf493f3d51890e7f769b3f9a6) detail document.

![image](https://user-images.githubusercontent.com/113994/149022386-62f51bab-fdfd-490b-b41d-7e1dac046a5c.png)

GTFS `trips.trip_id` - `2.TA.91-91_-L-j22-1.2.H` matches `*Z 019117` in `FPLAN` file but has different FPLAN type+line `S29` in `GTFS` vs `S11` in `HRDF`

### MATCH_NO_DATE

![image](https://user-images.githubusercontent.com/113994/149023101-7d33680a-fd9e-49ee-b225-d59e9f50f3cf.png)

GTFS `trips.trip_id` - `113.TA.91-9-Y-j22-1.7.R` is scheduled to run in the `--day` parameter but actually in `HRDF` is not scheduled.

## Next steps / Questions

- understand the logic of HRDF to GTFS conversion process
- clarify `MATCH_NO_FPLAN_TYPE` and `MATCH_NO_DATE` cases
- to be clarified why there is a large amount of trips in `GTFS` compared with `HRDF`
- why the `BITFELD` and `calendar.txt` are not in sync - see [Diff-Calendar-GTFS-HRDF.md](https://gist.github.com/vasile/d629e9af1871830f6e886b3c3d3a9808) - possible answer (dec 2022): the GTFS trips are more in number than HRDF and are spreading over multiple calendar days. The total amount of days per trip / service can be checked in [FPLAN_Type_Line_HRDF_GTFS.md](https://gist.github.com/vasile/cbccb1ddae852a10d6b245302c6534be)

----

Last update: 12. Jan 2022

Revisions:

- 2022-01-12 - added analyse for HRDF 7.Jan + GTFS 12.Jan
- 2022-01-11 - moved the v1 analyse into a [separate gist](https://gist.github.com/vasile/1e75bd12be451b7f621531f2c874e4cd).
- 2021-12-14 - created the document