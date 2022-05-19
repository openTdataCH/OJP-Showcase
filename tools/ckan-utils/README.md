### CKAN utils for https://opentransportdata.swiss/

## Fetch CKAN resource

Usage: `fetch_package_cli.py [-h] [--package_key PACKAGE_KEY] [--resource_title RESOURCE_TITLE]`

|Param|Description|Example|
| -- | -- | -- |
| --package_key| Package key defined in `./inc/config.yml` map_packages | `gtfs_static` |
| --resource_title | If present, the script will try to fetch fetch the resource named with this title. If missing, the script will fetch the first resource in the list (last updated) | `OeV_Sammlung_CH_HRDF_5_40_41_2022_20220513_211738.zip` or `None` |
