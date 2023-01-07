import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { HRDF_DB_LookupsResponse } from '../types/hrdf-db-lookups-response';
import { HRDF_DuplicatesListResponse } from '../types/hrdf-duplicates-list-response';
import { HRDF_DuplicatesReportResponse } from '../types/hrdf-duplicates-report-response';

@Injectable({
  providedIn: 'root',
})
export class HttpService {
  constructor(private http: HttpClient) {}

  getDuplicatesList() {
    const apiURL = 'https://tools.odpch.ch/hrdf-query/hrdf_duplicates_list.json'
    return this.http.get<HRDF_DuplicatesListResponse>(apiURL);
  }

  getHRDF_DBLookup(hrdf_day: string) {
    const apiURL = 'https://tools.odpch.ch/data/hrdf-db-lookups/hrdf_lookups_' + hrdf_day + '.json'
    return this.http.get<HRDF_DB_LookupsResponse>(apiURL);
  }

  getHRDF_DuplicatesReport(hrdf_day: string) {
    const apiURL = 'https://tools.odpch.ch/data/hrdf-duplicates-reports/hrdf_duplicates_report_' + hrdf_day + '.json'
    return this.http.get<HRDF_DuplicatesReportResponse>(apiURL);
  }
}
