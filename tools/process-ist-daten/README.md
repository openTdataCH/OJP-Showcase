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

Script output: [process_ist_daten.log](https://gist.github.com/vasile/82dc9b1387e603140a422994a294dc96)
