import { ReportValueLookupType } from "../types/_all";

export const MapReportValueLookups: Record<ReportValueLookupType, string> = {
  gtfs_db_age: 'GTFS-DB Age',
  gtfs_rt_age: 'GTFS-RT Age',
  total_rows_no: 'GTFS-RT Total Trips No',
  total_active_rows_no: 'GTFS-RT Total Active Trips No',
  tripOK_routeOK_no: 'Matched Trips',
  tripOK_routeNOK_no: 'Matched Trips / Not-matched Routes',
  tripNOK_routeOK_no: 'Not-matched Trips / Matched Routes',
  tripNOK_routeNOK_no: 'Not-matched Trips / Not-matched Routes',
  tripNOK_NOJP_no: 'Not-matched Trips without ojp: prefix',
};
