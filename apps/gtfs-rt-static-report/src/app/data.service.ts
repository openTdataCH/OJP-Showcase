import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { GTFS_RT_Static_Monthly_Report_JSON } from './types/_all';
import { Response_GTFS_RT } from './models/gtfs-rt/gtfs-rt-response';
import { GTFS_DB_LookupAgency, GTFS_DB_LookupRoutes } from './models/gtfs/gtfs';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(private http: HttpClient) { }

  async getMonthlyReport(dateYM: string): Promise<GTFS_RT_Static_Monthly_Report_JSON> {
    const dateYMParts = dateYM.split('-');

    const now = new Date();

    let url = 'https://tools.opentransportdata.swiss/gtfs-rt-static-compare-report/[YYYY]/gtfs_rt_static_report-[YYYY-MM].json?ts=' + now.getTime();
    url = url.replace('[YYYY]', dateYMParts[0]);
    url = url.replace('[YYYY-MM]', dateYM);
    
    return await firstValueFrom(this.http.get<GTFS_RT_Static_Monthly_Report_JSON>(url));
  }

  public async fetchGTFS_RT_Snapshot(url: string): Promise<Response_GTFS_RT> {
    const gtfsRT_SnapshotJSON = await firstValueFrom(this.http.get<Response_GTFS_RT>(url));
    return gtfsRT_SnapshotJSON;
  }

  // https://tools.opentransportdata.swiss/gtfs-query/lookup/routes?gtfs_day=2026-03-07
  public async fetchGTFS_Routes(gtfsDay: string): Promise<GTFS_DB_LookupRoutes> {
    const url = 'https://tools.opentransportdata.swiss/gtfs-query/lookup/routes?gtfs_day=' + gtfsDay;
    const response = await firstValueFrom(this.http.get<GTFS_DB_LookupRoutes>(url));
    return response;
  }

  // https://tools.opentransportdata.swiss/gtfs-query/lookup/agency?gtfs_day=2026-03-07
  public async fetchGTFS_Agency(gtfsDay: string): Promise<GTFS_DB_LookupAgency> {
    const url = 'https://tools.opentransportdata.swiss/gtfs-query/lookup/agency?gtfs_day=' + gtfsDay;
    const response = await firstValueFrom(this.http.get<GTFS_DB_LookupAgency>(url));
    return response;
  }
}
