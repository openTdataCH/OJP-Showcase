import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(private http: HttpClient) { }

  getMonthlyReport(monthF: string): Observable<any> {
    let API_ENDPOINT = 'https://tools.odpch.ch/gtfs-rt-static-compare-report/2024/gtfs_rt_static_report-[YYYY-MM].json'
    API_ENDPOINT = API_ENDPOINT.replace('[YYYY-MM]', monthF);
    return this.http.get(API_ENDPOINT);
  }
}
