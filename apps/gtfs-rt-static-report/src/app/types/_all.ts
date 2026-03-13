export type ReportValueLookupType = 'gtfs_db_age' | 'gtfs_rt_age' 
  | 'total_rows_no' | 'total_active_rows_no' 
  | 'tripOK_routeOK_no' 
  | 'tripOK_routeNOK_no' | 'tripNOK_routeOK_no' | 'tripNOK_routeNOK_no' | 'tripNOK_NOJP_no';

export interface GTFS_RT_Static_Report_Metadata_JSON {
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

interface GTFS_RT_Static_Report_Compare_JSON {
  compare_type: 'h' | 'w' | 'w_p'
  map_days: Record<string, number>
  mean_value: Number
  drop_line: Number
}

export interface GTFS_RT_StaticReportCompareMetadata {
  info: GTFS_RT_Static_Report_Compare_JSON
  reportLines: string[]
  valueF: string
  meanValueF: string
  dropLineF: string
}

export interface GTFS_RT_Static_Monthly_Report_JSON {
  last_update_dt: string
  comments: string
  report_days: Record<string, Record<string, GTFS_RT_Static_Report_Metadata_JSON>>
  compare_days: Record<string, Record<string, GTFS_RT_Static_Report_Compare_JSON>>
};
