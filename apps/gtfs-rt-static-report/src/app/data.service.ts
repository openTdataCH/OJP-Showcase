import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import * as pako from 'pako';

import { GTFS_RT_Static_Monthly_Report_JSON } from './home.component';
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

    let url = 'https://tools.odpch.ch/gtfs-rt-static-compare-report/[YYYY]/gtfs_rt_static_report-[YYYY-MM].json?ts=' + now.getTime();
    url = url.replace('[YYYY]', dateYMParts[0]);
    url = url.replace('[YYYY-MM]', dateYM);
    
    return await firstValueFrom(this.http.get<GTFS_RT_Static_Monthly_Report_JSON>(url));
  }

  public async fetchGzipJson<T>(url: string): Promise<T> {
    const compressedBuffer = await firstValueFrom(
      this.http.get(url, {
        responseType: 'arraybuffer',
      })
    );

    const jsonText = pako.ungzip(
      new Uint8Array(compressedBuffer),
      { to: 'string' }
    );

    const result = JSON.parse(jsonText) as T;
    return result;
  }

  public async fetchGTFS_RT_Snapshot(url: string): Promise<Response_GTFS_RT> {
    const gtfsRT_SnapshotJSON = await this.fetchGzipJson<Response_GTFS_RT>(url);
    return gtfsRT_SnapshotJSON;
  }

  // https://tools.odpch.ch/gtfs-query/lookup/routes?gtfs_day=2026-03-07
  public async fetchGTFS_Routes(gtfsDay: string): Promise<GTFS_DB_LookupRoutes> {
    const url = 'https://tools.odpch.ch/gtfs-query/lookup/routes?gtfs_day=' + gtfsDay;
    const response = await firstValueFrom(this.http.get<GTFS_DB_LookupRoutes>(url));
    return response;
  }

  // https://tools.odpch.ch/gtfs-query/lookup/agency?gtfs_day=2026-03-07
  public async fetchGTFS_Agency(gtfsDay: string): Promise<GTFS_DB_LookupAgency> {
    const url = 'https://tools.odpch.ch/gtfs-query/lookup/agency?gtfs_day=' + gtfsDay;
    const response = await firstValueFrom(this.http.get<GTFS_DB_LookupAgency>(url));
    return response;
  }
}
