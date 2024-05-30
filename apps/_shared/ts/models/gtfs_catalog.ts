export interface GTFS_Static_DB_Catalog_Item_JSON {
    gtfs_datetime_s: string
    gtfs_day: string
    gtfs_rt_switch_datetime_s: string
    table_stats: Record<string, number>
    db_relative_path: string
}

export interface GTFS_Static_DB_Catalog_JSON {
    metadata: string
    items: GTFS_Static_DB_Catalog_Item_JSON[]
}