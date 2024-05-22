import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(private http: HttpClient) { }

  getMonthlyReport(dateYM: string): Observable<any> {
    const dateYMParts = dateYM.split('-');

    let API_ENDPOINT = 'https://tools.odpch.ch/gtfs-rt-static-compare-report/[YYYY]/gtfs_rt_static_report-[YYYY-MM].json'
    API_ENDPOINT = API_ENDPOINT.replace('[YYYY]', dateYMParts[0]);
    API_ENDPOINT = API_ENDPOINT.replace('[YYYY-MM]', dateYM);
    
    return this.http.get(API_ENDPOINT);
  }
}
