import Agency from "../../shared/models/gtfs/agency";
import { Trip } from "../../shared/models/gtfs/trip";
import Route from "../../shared/models/gtfs/route";

import { BusinessOrganisationRowCSV } from "../../shared/models/business-organisations";
import { AtlasRouteCSVRow, AtlasStopGeoJSONFeature } from "../../shared/controllers/atlas-data";

export interface GTFS_RouteReportRow {
  route: Route
  routeText: string
}

export type MatchedStatus = 'NONE' 
  | 'OK' | 'OK_FUZZY_SAME_ROUTE' | 'OK_FUZZY_OTHER_AGENCY' | 'OK_FUZZY_OTHER_ROUTE' | 'OK_FUZZY_GTFS_ALL'
  | 'NO_MATCHES_FUZZY_SAME_ROUTE' | 'NO_MATCHES_FUZZY_OTHER_AGENCY'
  | 'NO_MATCHES';

export interface AgencyRouteReportRow {
  atlasRoute: AtlasRouteCSVRow
  gtfsReportRoutes: GTFS_RouteReportRow[]
  geocoderStopFeatures: AtlasStopGeoJSONFeature[]
  matchedStatus: MatchedStatus
  matchedStatusClassNames: string
  matchedGTFS_Route: Route | null
  matchedGTFS_Trip: Trip | null
  matchedGTFS_TripStopsText: string | null
  matchNote: string,
}

interface ReportStats {
  routesNo: number,
  matchedOK_No: number,
  matchedFuzzy_No: number,
  notMatched_No: number,
}

export interface AgencyReportRow {
  organisation: BusinessOrganisationRowCSV,
  agency: Agency | null,
  stats: ReportStats,

  routeReportRows: AgencyRouteReportRow[],
}

export interface ReportData {
  reportDay: string,
  gtfsDay: string,

  agencyReportRows: AgencyReportRow[],
  agencyFilterReportRows: AgencyReportRow[],
  agencySelectRows: AgencyReportRow[],

  stats: ReportStats,

  lookups: {
    matchedStatusItems: MatchedStatus[][],
    matchedStatusClassNames: Record<MatchedStatus, string>,
  },
}

export interface ReportCSV_DataRow {
  slnid: string
  sboid: string
  organisation_name: string
  
  atlas_agency_id: string | null
  atlas_agency_name: string | null
  
  number: string
  description: string
  
  gtfs_agency_id: string | null
  gtfs_agency_name: string | null
  
  route_id: string | null
  route_short_name: string | null
  route_trip_stop_times: string | null
  
  matched_status: MatchedStatus
}
