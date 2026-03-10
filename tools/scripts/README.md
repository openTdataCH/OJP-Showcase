# Server Scripts

Python / NodeJS scripts that run for fetching latest data

## Installation

```
$ bash bootstrap.sh 
```

## Scripts

- Fetch / unzip / import latest GTFS dataset

`$ bash cli_otd_process_gtfs.sh`

- Fetch / unzip / import latest HRDF dataset + generate lookup tables and [HRDF duplicates](../../tools/hrdf-check-duplicates/) report

`$ bash cli_otd_process_hrdf.sh`
