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
