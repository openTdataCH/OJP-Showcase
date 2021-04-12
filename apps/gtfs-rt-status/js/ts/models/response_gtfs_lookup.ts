export interface Response_GTFS_Lookup {
    lookup_name: string
    data_source: string
    rows_no: number
    rows: GTFS.Agency[] | GTFS.Route[] | GTFS.Stop[]
}