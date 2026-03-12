import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import * as pako from 'pako';

import { GTFS_RT_Static_Monthly_Report_JSON } from './home.component';
import { Response_GTFS_RT } from './models/gtfs-rt/gtfs-rt-response';

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
}
