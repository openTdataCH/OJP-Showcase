import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';

import { Response_GTFS_RT } from '../../shared/types/gtfs-rt/gtfs-rt-response'
import { GTFS_Static_DB_Catalog_JSON } from '../../shared/models/gtfs_catalog';
import { GTFS_DB_LookupJSON, GTFS_DB_Trips_Response } from '../../shared/types/gtfs/gtfs';
import { OTDCH_API_AUTHORIZATION } from '../constants';

@Injectable({
  providedIn: 'root',
})
export class HTTP_Service {
  constructor(private http: HttpClient) {}

  async fetchLatestGTFSCatalog(): Promise<GTFS_Static_DB_Catalog_JSON> {
    const url = 'https://tools.odpch.ch/gtfs-static-dbs/gtfs-static-dbs.json';
    return await firstValueFrom(this.http.get<GTFS_Static_DB_Catalog_JSON>(url));
  }

  fetchSIRI_ET(): Observable<string> {
    const url = 'https://tools.odpch.ch/data/siri-et/siri-et-latest-prod.xml';

    const headers = new HttpHeaders();
    if (!url.startsWith('localhost')) {
        headers.append('Authorization', 'Bearer ' + OTDCH_API_AUTHORIZATION);
    }

    const response = this.http.get(url, { headers: headers, responseType: 'text' });

    return response;
  }

  fetchGTFS_RT(): Observable<Response_GTFS_RT> {
    const url = 'https://tools.odpch.ch/data/gtfs-rt/gtfs-rt-latest.json';

    const headers = new HttpHeaders();
    if (!url.startsWith('http://localhost')) {
        headers.append('Authorization', 'Bearer ' + OTDCH_API_AUTHORIZATION);
    }

    const response = this.http.get<Response_GTFS_RT>(url, { headers: headers});

    return response;
  }

  async fetchBusinessOrganisationsCSV(): Promise<string> {
    const url = 'https://tools.odpch.ch/data/actual_date_business_organisation_versions_LATEST.csv';
    const response = this.http.get(url, { responseType: 'text' });
    return await firstValueFrom(response);
  }

  fetchDBLookups(gtfsDay: string): Observable<GTFS_DB_LookupJSON> {
    const url = 'https://tools.odpch.ch/gtfs-query/db_lookups?gtfs_day=' + gtfsDay;
    const response = this.http.get<GTFS_DB_LookupJSON>(url);

    return response;
  }

  fetchGTFS_AgencyTrips(gtfsDay: string, serviceDay: string, agencyId: string): Observable<GTFS_DB_Trips_Response> {
    let url = 'https://tools.odpch.ch/gtfs-query/trips?gtfs_day=' + gtfsDay + '&service_day=' + serviceDay + '&agency_id=' + agencyId;
    
    const response = this.http.get<GTFS_DB_Trips_Response>(url);
    return response;
  }
}
