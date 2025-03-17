import { ServiceCall } from "../../shared/models/siri-et/service-call";
import { VehicleJourney } from "../../shared/models/siri-et/vehicle-journey";
import { BusinessOrganisationRowCSV } from "../../shared/models/business-organisations";

export interface DataLoadProgress {
  percent: number,
  text: string
}

export type MapAgencySIRI_ET_Journeys = Record<string, VehicleJourney[]>;

export interface ServiceCallStop {
  hasSloidIssue: boolean;
  stopPointRef: string;
  didokRef: string;
  stopPointName: string;
  url: string;
}

export interface VehicleJourneyReportRow {
  vehicleJourney: VehicleJourney
  stops: ServiceCallStop[],
  stopsWithIssues: ServiceCallStop[],
}

export interface AgencyReportRow {
  agencyTitle: string
  agencyURL: string | null
  organisation: BusinessOrganisationRowCSV | null
  totalMessagesNo: number

  stopsWithIssues: ServiceCallStop[]
  vehicleJourneyReportRows: VehicleJourneyReportRow[]
}

export interface ReportData {
  reportDay: string,
  gtfsDay: string,
  siriET_totalNo: number,
  siriET_totalIssuesNo: number,
  agencyReportRows: AgencyReportRow[],
}
