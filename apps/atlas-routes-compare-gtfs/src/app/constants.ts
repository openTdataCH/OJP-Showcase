import { ReportData } from "./types/_all";

export let DEBUG_ROUTE_IDs: string[] | null = null;
// DEBUG_ROUTE_IDs = ['ch:1:slnid:1024377'];

export const DEFAULT_REPORT_DATA: ReportData = {
  reportDay: 'n/a',
  gtfsDay: 'n/a',

  agencyReportRows: [],
  agencyFilterReportRows: [],
  agencySelectRows: [],

  stats: {
    routesNo: 0,
    matchedOK_No: 0,
    matchedFuzzy_No: 0,
    notMatched_No: 0,
  },

  lookups: {
    matchedStatusItems: [
      ['OK_EXT', 'OK', 'OK_FUZZY_SAME_ROUTE', 'OK_FUZZY_OTHER_AGENCY', 'OK_FUZZY_OTHER_ROUTE', 'OK_FUZZY_GTFS_ALL'],
      ['NO_MATCHES_FUZZY_SAME_ROUTE', 'NO_MATCHES_FUZZY_OTHER_AGENCY'], 
      ['NO_MATCHES'],
    ],
    matchedStatusClassNames: {
      'NONE': 'text-bg-secondary',
      
      'OK': 'text-bg-success',
      'OK_EXT': 'text-bg-success',
      'OK_FUZZY_SAME_ROUTE': 'text-bg-success',
      'OK_FUZZY_OTHER_AGENCY': 'text-bg-success',
      'OK_FUZZY_OTHER_ROUTE': 'text-bg-success',
      'OK_FUZZY_GTFS_ALL': 'text-bg-success',

      'NO_MATCHES_FUZZY_SAME_ROUTE': 'text-bg-warning',
      'NO_MATCHES_FUZZY_OTHER_AGENCY': 'text-bg-warning',
      
      'NO_MATCHES': 'text-bg-danger',
    }
  },
};
