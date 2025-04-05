export interface DataLoadProgress {
  percent: number,
  text: string
}

export interface StopReportOrganisationRow {
  sboid: string
  url: string
  agencyTitle: string
  publishedLineNumbers: string[]
}

export interface StopReportRow {
  didokRef: string;
  stopPointName: string;
  url: string;
  sloidIssues: string[];

  organisations: StopReportOrganisationRow[];
  totalAffectedMessagesNo: number;

  debugMap1: any;
}

export interface ReportData {
  reportDay: string,
  gtfsDay: string,
  siriET_totalNo: number,
  siriET_totalIssuesNo: number,
  stopReportRows: StopReportRow[]
}

export interface ReportCSV_DataRow {
  stop_name: string
  didok_ref: string
  sloid_issues: string
  
  affected_messages_no: number
  
  agency1_name: string
  agency1_sboid: string
  agency1_lines: string

  agency2_name: string
  agency2_sboid: string
  agency2_lines: string

  agency3_name: string
  agency3_sboid: string
  agency3_lines: string

  agency4_name: string
  agency4_sboid: string
  agency4_lines: string
}
