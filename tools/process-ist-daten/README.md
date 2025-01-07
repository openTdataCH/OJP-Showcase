# Process Ist Daten Tool

- CLI tools used to manipulate [Ist-Daten](https://opentransportdata.swiss/de/cookbook/actual-data/) dataset
- see [CHANGELOG](./CHANGELOG.md) for latest changes

## Scripts

### cli_process_ist_daten.py
- fetch lateat archive file from https://opentransportdata.swiss/de/ist-daten-archiv/
- based on the `--year` parameter downloads each year-month archive, i.e. `ist-daten-2024-11.zip`
- unzip archives and loop throught individual CSV files, i.e. `2024-11-01_istdaten.csv` to `2024-11-30_istdaten.csv`
- for each CSV file keep only the rows that satisfy `--operator_ref` condition
- outputs the filtered CSV files in the `YYYY-OPERATOR_REF/ist-daten-YYYY-MM/YYYY-MM-DD_istdaten.csv` folder/file structure
- saves also a consolidated CSV file with all rows, i.e. `YYYY-OPERATOR_REF.csv`

Usage:

```
# Process year 2024 dataset and filters for Verkehrsbetrieb LIECHTENSTEINmobil (85:805)
$ python3 cli_process_ist_daten.py --year 2024 --operator_ref 85:805
```

Script output:

```
[2025-01-07 08:20:00] - ======================================= - MEMORY: use: 31.5 MB - perc: 0.1
[2025-01-07 08:20:00] - START extracting ist-daten - MEMORY: use: 31.5 MB - perc: 0.1
[2025-01-07 08:20:00] - ======================================= - MEMORY: use: 31.5 MB - perc: 0.1
[2025-01-07 08:20:00] - YEAR          : 2024 - MEMORY: use: 31.5 MB - perc: 0.1
[2025-01-07 08:20:00] - Operator Ref  : 85:805 - MEMORY: use: 31.5 MB - perc: 0.1
[2025-01-07 08:20:00] - ======================================= - MEMORY: use: 31.5 MB - perc: 0.1

.....

[2025-01-07 08:38:17] -   2024-10-31_istdaten.csv - MEMORY: use: 30.4 MB - perc: 0.1
[2025-01-07 08:38:17] -     read : 2084034 rows - MEMORY: use: 30.4 MB - perc: 0.1
[2025-01-07 08:38:23] -     wrote: 15700 rows - MEMORY: use: 30.4 MB - perc: 0.1

[2025-01-07 08:38:23] - ... cleaning-up - MEMORY: use: 30.4 MB - perc: 0.1

[2025-01-07 08:38:24] - ARCHIVE: ist-daten-2024-11.zip - MEMORY: use: 30.4 MB - perc: 0.1
[2025-01-07 08:38:24] - ... fetching from : https://opentransportdata.swiss/wp-content/uploads/2025/01/../../ist-daten-archive/ist-daten-2024-11.zip - MEMORY: use: 30.4 MB - perc: 0.1
[2025-01-07 08:40:21] - ... saved to disk - MEMORY: use: 29.8 MB - perc: 0.1

[2025-01-07 08:40:21] - ... unzipping to ./data/ist-daten-archiv/2024/ist-daten-2024-11 - MEMORY: use: 29.9 MB - perc: 0.1
[2025-01-07 08:40:34] - ... DONE - MEMORY: use: 31.4 MB - perc: 0.1

[2025-01-07 08:40:34] -   FILES: 30 files - MEMORY: use: 32.6 MB - perc: 0.1

[2025-01-07 08:40:34] -   2024-11-01_istdaten.csv - MEMORY: use: 32.6 MB - perc: 0.1
[2025-01-07 08:40:35] -     read : 1990565 rows - MEMORY: use: 32.6 MB - perc: 0.1
[2025-01-07 08:40:41] -     wrote: 10395 rows - MEMORY: use: 32.8 MB - perc: 0.1

[2025-01-07 08:40:41] -   2024-11-02_istdaten.csv - MEMORY: use: 32.8 MB - perc: 0.1
[2025-01-07 08:40:41] -     read : 1736694 rows - MEMORY: use: 32.8 MB - perc: 0.1
[2025-01-07 08:40:46] -     wrote: 10395 rows - MEMORY: use: 32.9 MB - perc: 0.1

........................

[2025-01-07 08:49:36] -   2024-12-30_istdaten.csv - MEMORY: use: 30.2 MB - perc: 0.1
[2025-01-07 08:49:37] -     read : 2442750 rows - MEMORY: use: 30.2 MB - perc: 0.1
[2025-01-07 08:49:44] -     wrote: 15646 rows - MEMORY: use: 30.2 MB - perc: 0.1

[2025-01-07 08:49:44] -   2024-12-31_istdaten.csv - MEMORY: use: 30.2 MB - perc: 0.1
[2025-01-07 08:49:45] -     read : 2493863 rows - MEMORY: use: 30.2 MB - perc: 0.1
[2025-01-07 08:49:52] -     wrote: 10717 rows - MEMORY: use: 30.2 MB - perc: 0.1

[2025-01-07 08:49:52] - ... cleaning-up - MEMORY: use: 30.2 MB - perc: 0.1

[2025-01-07 08:49:52] - ... DONE processing - MEMORY: use: 30.2 MB - perc: 0.1
```
