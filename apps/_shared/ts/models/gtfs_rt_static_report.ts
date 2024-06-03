export interface GTFS_RT_Static_Report_Metadata {
    report_dt: string
    gtfs_db_filename: string
    gtfs_db_age: number
    gtfs_rt_filename: string
    gtfs_rt_ts: number
    gtfs_rt_dt: string
    gtfs_rt_age: number
    
    total_rows_no: number
    tripOK_routeOK_no: number
    
    tripOK_routeNOK_no: number
    tripNOK_routeOK_no: number
    tripNOK_routeNOK_no: number
    tripNOK_NOJP_no: number
}

export interface GTFS_RT_Static_Report {
    metadata: GTFS_RT_Static_Report_Metadata
    tripOK_routeNOK: string[]
    tripNOK_routeOK: string[]
    tripNOK_routeNOK: string[]
}
