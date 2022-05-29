# API HRDF Query

This application is an API that queries the HRDF DBs created by [hrdf-db-importer](../../tools/hrdf-db-importer/) tool. 

## Active Trips

`GET /hrdf_duplicates_list.json`

This API returns all HRDF datasets that have [HRDF duplicates](../../tools/hrdf-check-duplicates/) output present in the system.

### Sample output:

[hrdf-query/hrdf_duplicates_list.json](https://tools.odpch.ch/hrdf-query/hrdf_duplicates_list.json)

```
{
    "hrdf_duplicates_available_days": [
        "2022-05-25",
        "2022-05-20",
        "2022-05-18",
        "2022-05-13",
        "2022-05-11",
        "2022-05-06",
        "2022-05-04"
    ]
}
```