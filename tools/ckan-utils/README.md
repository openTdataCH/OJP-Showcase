# CKAN utils

An `opentransportdata.swiss` API key is needed to run these tools. The key is stored in `OTD_KEY` [.env](../../.env) project file.

- see [./inc/config.yml](./inc/config.yml) for resource paths. 
- `PACKAGE_ID` param comes from https://data.opentransportdata.swiss/en/organization/oevch

## Installation

See main [README tools](../README.md)

## Fetch CKAN package metadata

Usage: `fetch_metadata_cli.py [-h] [--package_id PACKAGE_ID]`

|Param|Description|Example|
| -- | -- | -- |
| --package_id| package_id from https://data.opentransportdata.swiss/en/organization/oevch | `timetable-54-2025-hrdf` |

## Fetch CKAN package resource

Usage: `fetch_package_cli.py [-h] [--package_key PACKAGE_ID] [--resource_title RESOURCE_TITLE]`

|Param|Description|Example|
| -- | -- | -- |
| --package_id| package_id from https://data.opentransportdata.swiss/en/organization/oevch | `timetable-54-2025-hrdf` |
| --resource_title | If present, the script will try to fetch fetch the resource named with this title. If missing, the script will fetch the first resource in the list (last updated) | `OeV_Sammlung_CH_HRDF_5_40_41_2022_20220513_211738.zip` or `None` |
