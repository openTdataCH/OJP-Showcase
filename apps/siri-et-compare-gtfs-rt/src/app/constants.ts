import { ReportData } from "./types/report-controller";

export const OTDCH_API_AUTHORIZATION = 'my_token';

export const DEFAULT_REPORT_DATA: ReportData = {
  reportDay: 'n/a',
  gtfsDay: 'n/a',

  siriET_Total_No: 0,
  siriET_Day_No: 0,
  gtfsRT_Total_No: 0,
  
  siriET_NoAgencyItems: [],
  gtfsRT_NoAgencyItems: [],

  siriET_OnlyAgencyData: [],
  siriET_OnlyAgencySelectedItems: [],
  gtfsRT_OnlyAgencyData: [],
  gtfsRT_OnlyAgencySelectedItems: [],

  bothInAgency: {
    agencyData: [],
    siriET_NoGTFS_Items: [],
    gtfsRT_NoGTFS_Items: [],
    resultMatchNoGTFS_RT_Rows: [],
    resultMatchRowsWithGTFS_RT_Rows: [],
  },
};
