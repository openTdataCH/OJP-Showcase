import { VehicleJourney } from "../../shared/models/siri-et/vehicle-journey";
import Agency from "../../shared/models/gtfs/agency";
import { Response_GTFS_RT_Entity } from "../../shared/types/gtfs-rt/entity";
import { Trip } from "../../shared/models/gtfs/trip"

export interface DataLoadProgress {
  percent: number,
  text: string
}

export type MapAgencySIRI_ET_Journeys = Record<string, VehicleJourney[]>;
export type MapAgencyGTFS_RT_Entity = Record<string, Response_GTFS_RT_Entity[]>;

export interface SIRI_ET_ReportItem {
  vehicleJourney: VehicleJourney
}

export interface GTFS_RT_ReportItem {
  entityGTFS_RT: Response_GTFS_RT_Entity
}

export interface ReportResultItem {
  serviceLine: string
  siriET_JourneyRef: string
  gtfsDB_matchClassNames: 'bg-success' | 'bg-warning text-dark'
  gtfsDB_matchText: string
  gtfsTripId: string
  gtfsServiceLine: string
  gtfsRT_matchText: string
  gtfsRT_matchTextClassNames: 'bg-success' | 'bg-warning text-dark'
}

export interface AgencyData {
  agency: Agency,
  itemsNo: number,
  text: string,
}

export interface MatchDB_Trip {
  id: string
  trip: Trip
  stopKeys: string[]
  stopsKey: string
  matchScore: number | null
}

export interface ResultMatch {
  vehicleJourney: VehicleJourney
  matchTrip: MatchDB_Trip | null
}

export interface ReportData {
  reportDay: string,
  gtfsDay: string,

  siriET_Total_No: number,
  siriET_Day_No: number,
  gtfsRT_Total_No: number,
    
  siriET_NoAgencyItems: SIRI_ET_ReportItem[],
  siriET_OnlyAgencyData: AgencyData[],
  siriET_OnlyAgencySelectedItems: SIRI_ET_ReportItem[],

  gtfsRT_NoAgencyItems: GTFS_RT_ReportItem[],
  gtfsRT_OnlyAgencyData: AgencyData[],
  gtfsRT_OnlyAgencySelectedItems: GTFS_RT_ReportItem[],

  bothInAgency: {
    agencyData: AgencyData[],
    siriET_NoGTFS_Items: SIRI_ET_ReportItem[],
    gtfsRT_NoGTFS_Items: GTFS_RT_ReportItem[],
    resultMatchNoGTFS_RT_Rows: ReportResultItem[],
    resultMatchRowsWithGTFS_RT_Rows: ReportResultItem[],
  }
}
