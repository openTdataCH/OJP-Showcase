import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { GTFS_Static_DB_Catalog_JSON } from '../../shared/models/gtfs_catalog';
import { GTFS_DB_LookupJSON } from '../../shared/types/gtfs/gtfs';

@Injectable({
  providedIn: 'root',
})
export class HTTP_Service {
  constructor(private http: HttpClient) {}

  async fetchLatestGTFSCatalog(): Promise<GTFS_Static_DB_Catalog_JSON> {
    const url = 'https://tools.odpch.ch/gtfs-static-dbs/gtfs-static-dbs.json';

    const params = new HttpParams()
      .set('rand', Date.now().toString());

    return await firstValueFrom(this.http.get<GTFS_Static_DB_Catalog_JSON>(url, { params: params }));
  }

  async fetchSIRI_ET(): Promise<string> {
    let url = 'https://tools.odpch.ch/data/siri-et/siri-et-latest-prod.xml';
    
    const params = new HttpParams()
      .set('rand', Date.now().toString());
    
    const response = this.http.get(url, { responseType: 'text', params: params });
    return await firstValueFrom(response);
  }

  async fetchBusinessOrganisationsCSV(): Promise<string> {
    const url = 'https://tools.odpch.ch/data/actual_date_business_organisation_versions_LATEST.csv';

    const params = new HttpParams()
      .set('rand', Date.now().toString());

    const response = this.http.get(url, { responseType: 'text', params: params });
    return await firstValueFrom(response);
  }

  async fetchDBLookups(gtfsDay: string): Promise<GTFS_DB_LookupJSON> {
    const url = 'https://tools.odpch.ch/gtfs-query/db_lookups';

    const params = new HttpParams()
      .set('gtfs_day', gtfsDay)
      .set('rand', Date.now().toString());

    const response = this.http.get<GTFS_DB_LookupJSON>(url, { params: params });

    return await firstValueFrom(response);
  }
}
