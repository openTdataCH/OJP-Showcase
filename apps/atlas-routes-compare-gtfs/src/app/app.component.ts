import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import DateHelpers from '../shared/helpers/date-helpers';

import { Trip } from '../shared/models/gtfs/trip';
import { MatchController } from './controllers/match-controller';

import { HTTP_Service } from './services/http.service';

import { MatchedStatus, ReportCSV_DataRow, ReportData } from './types/_all';

import { GTFS_DB_Catalog_Controller } from '../shared/controllers/gtfs-db-catalog';
import { GTFS_DB_Controller } from '../shared/controllers/gtfs-db-controller';
import { AtlasLineDataController, AtlasStopGeoJSONFeature  } from '../shared/controllers/atlas-data';
import { BusinessOrganisationsController } from '../shared/controllers/business-organisations';

import { DEFAULT_REPORT_DATA } from './constants';

interface PageModel {
  processingState: 'IDLE' | 'FETCH_DATA' | 'PROCESS_DATA' | 'DONE_PROCESSING'
  reportData: ReportData,

  filter: {
    byMatchedStatus: Record<MatchedStatus, boolean>,
    byAgencName: string,
  },
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public model: PageModel
  public filterAgencyInputControl = new FormControl();

  constructor(private httpService: HTTP_Service) {
    this.model = {
      processingState: 'IDLE',
      reportData: DEFAULT_REPORT_DATA,

      filter: {
        byMatchedStatus: {
          'NONE': false,
          'OK': false,
          
          'OK_FUZZY_SAME_ROUTE': false,
          'OK_FUZZY_OTHER_ROUTE': false,
          'OK_FUZZY_OTHER_AGENCY': false,
          'OK_FUZZY_GTFS_ALL': false,

          'NO_MATCHES_FUZZY_SAME_ROUTE': true,
          'NO_MATCHES_FUZZY_OTHER_AGENCY': true,
          'NO_MATCHES': true,
        },
        byAgencName: '',
      }    
    };
  }

  ngOnInit(): void {
    this.filterAgencyInputControl.valueChanges
    .pipe(
      debounceTime(300),
      distinctUntilChanged()
    )
    .subscribe((value: string) => {
      this.model.filter.byAgencName = value.trim();
      this.updateFilteredItems();
    });
  }

  public async fetchData() {
    this.model.processingState = 'FETCH_DATA';

    const reportDayF = DateHelpers.formatDateYMDHIS(new Date()).slice(0, 10);

    this.model.reportData.reportDay = reportDayF;
    console.log('using ReportDay: ' + reportDayF);

    const boCSVs = await this.httpService.fetchBusinessOrganisationsCSV();
    const boController = new BusinessOrganisationsController();
    await boController.loadFromCSV(boCSVs);

    const gtfsDBCatalogJSON = await this.httpService.fetchLatestGTFSCatalog();
    const gtfsDB_CatalogController = new GTFS_DB_Catalog_Controller(gtfsDBCatalogJSON);
    const gtfsDay = gtfsDB_CatalogController.latestGTFS_Day;
    if (gtfsDay === null) {
      console.error('Cant find GTFS day');
      console.log(gtfsDBCatalogJSON);
      return;
    }

    console.log('using GTFSday: ' + gtfsDay);
    this.model.reportData.gtfsDay = gtfsDay;

    const dbLookups = await this.httpService.fetchDBLookups(gtfsDay);
    const gtfsDBController = new GTFS_DB_Controller(gtfsDay);
    gtfsDBController.loadDBLookups(dbLookups);

    const responseCSVs = await this.httpService.fetchAtlasLinieCSV();
    const atlasLinieController = new AtlasLineDataController();
    await atlasLinieController.loadFromCSV(responseCSVs);
    console.log(atlasLinieController);

    const mapRouteTrips: Record<string, Trip> = {};
    const routeTrips = await this.httpService.fetchRoutesRepresentativeTrip(gtfsDay);
    routeTrips.rows.forEach(dbRow => {
      const trip = Trip.initWithCondensedTrip(dbRow, gtfsDBController.mapRoutes, gtfsDBController.mapStops, {});
      mapRouteTrips[trip.route.route_id] = trip;
    });
    console.log('mapRouteTrips: Record<string, Trip>');
    console.log(mapRouteTrips);

    const atlasStopsGeoJSON = await this.httpService.fetchAtlasStopsGeoJSON();
    const mapAtlasRouteFeatures: Record<string, AtlasStopGeoJSONFeature[]> = {};
    atlasStopsGeoJSON.features.forEach(feature => {
      const routeSLNIDs = feature.properties['atlas.slnids'].split(' | ');
      routeSLNIDs.forEach(slnid => {
        if (!(slnid in mapAtlasRouteFeatures)) {
          mapAtlasRouteFeatures[slnid] = [];
        }

        mapAtlasRouteFeatures[slnid].push(feature);
      });
    });
    console.log('mapAtlasRouteFeatures: Record<string, AtlasStopGeoJSONFeature[]>');
    console.log(mapAtlasRouteFeatures);

    const matchController: MatchController = new MatchController(gtfsDBController, boController, atlasLinieController, mapRouteTrips, mapAtlasRouteFeatures);

    matchController.process(this.model.reportData);
    this.updateFilteredItems();

    console.log(this.model.reportData);

    this.model.processingState = 'DONE_PROCESSING';
  }

  public isBusyProcessing(): boolean {
    if (this.model.processingState === 'FETCH_DATA') {
      return true;
    }
    if (this.model.processingState === 'PROCESS_DATA') {
      return true;
    }

    return false;
  }

  public onAgencyChange(event: Event) {
    const elId = (event.target as HTMLSelectElement).value;
    const el = document.getElementById(elId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  public onMatchedStatusChange(event: Event) {
    this.updateFilteredItems();
  }

  public downloadReport() {
    const reportCSV = this.computeReportCSV();
    const blob = new Blob([reportCSV], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;

    link.setAttribute('download', 'report-compare-atlas-route-gtfs.csv');
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private computeReportCSV(): string {
    const reportCSV_Headers: string[] = [
      'slnid', 'sboid', 'organisation_name', 
      'atlas_agency_id', 'atlas_agency_name', 
      'number', 'description', 
      'gtfs_agency_id', 'gtfs_agency_name', 
      'route_id', 'route_short_name', 'route_trip_stop_times', 
      'matched_status',
    ];

    const reportCSV_Rows: string[] = [
      reportCSV_Headers.join(';'),
    ]

    this.model.reportData.agencyReportRows.forEach(agencyReportRow => {
      agencyReportRow.routeReportRows.forEach(routeReportRow => {
        const reportCSV_DataRow: ReportCSV_DataRow = {
          slnid: routeReportRow.atlasRoute.slnid,
          sboid: agencyReportRow.organisation.sboid,
          organisation_name: agencyReportRow.organisation.descriptionDe,
          
          atlas_agency_id: agencyReportRow.agency?.agency_id ?? null,
          atlas_agency_name: agencyReportRow.agency?.agency_name ?? null,
          
          number: routeReportRow.atlasRoute.number,
          description: routeReportRow.atlasRoute.description,
          
          gtfs_agency_id: routeReportRow.matchedGTFS_Route?.agency.agency_id ?? null,
          gtfs_agency_name: routeReportRow.matchedGTFS_Route?.agency.agency_name ?? null,
          
          route_id: routeReportRow.matchedGTFS_Route?.route_id ?? null,
          route_short_name: routeReportRow.matchedGTFS_Route?.route_short_name ?? null,
          route_trip_stop_times: routeReportRow.matchedGTFS_TripStopsText ?? null,
          
          matched_status: routeReportRow.matchedStatus,
        };

        let reportCSV_DataRowValues: string[] = Object.values(reportCSV_DataRow);
        reportCSV_DataRowValues = reportCSV_DataRowValues.map(el => el && el.replaceAll(';', ','));
        reportCSV_Rows.push(reportCSV_DataRowValues.join(';'));
      });
    });

    const reportCSV = reportCSV_Rows.join('\n');
    
    return reportCSV;
  }

  private updateFilteredItems() {
    console.log('updating results ...');
    console.log(this.model.filter);

    this.model.reportData.agencyFilterReportRows = this.model.reportData.agencyReportRows.filter(agencyReportRow => {
      const keepAgencyByMatchStatus: boolean = (() => {
        for (const routeReportRow of agencyReportRow.routeReportRows) {
          if (this.model.filter.byMatchedStatus[routeReportRow.matchedStatus]) {
            return true;
          }
        }

        return false;
      })();
      

      const keepAgencyByName: boolean = (() => {
        const filterName = this.model.filter.byAgencName.toLowerCase().trim();
        if (filterName === '') {
          return true;
        }

        const gtfsAgency = agencyReportRow.agency;
        if (gtfsAgency !== null) {
          if (gtfsAgency.agency_name.toLowerCase().includes(filterName)) {
            return true;
          }

          if (gtfsAgency.agency_code?.toLowerCase().includes(filterName)) {
            return true;
          }

          if (gtfsAgency.agency_id.toLowerCase().includes(filterName)) {
            return true;
          }
        }

        if (agencyReportRow.organisation.descriptionDe.toLowerCase().includes(filterName)) {
          return true;
        }

        if (agencyReportRow.organisation.sboid.toLowerCase().includes(filterName)) {
          return true;
        }

        if (agencyReportRow.organisation.abbreviationDe.toLowerCase().includes(filterName)) {
          return true;
        }

        return false;
      })();

      return keepAgencyByMatchStatus && keepAgencyByName;
    });

    // Routes with most unmatched routes first
    // this.model.reportData.agencyFilterReportRows.sort((a, b) => (b.stats.routesNo - (b.stats.matchedOK_No + b.stats.matchedFuzzy_No)) - (a.stats.routesNo - (a.stats.matchedOK_No + a.stats.matchedFuzzy_No)));
    // actually lets try alpha
    this.model.reportData.agencyFilterReportRows.sort((a, b) => a.organisation.descriptionDe.localeCompare(b.organisation.descriptionDe));

    // SELECT shows the items alphabetically
    this.model.reportData.agencySelectRows = Array.from(this.model.reportData.agencyFilterReportRows);
    this.model.reportData.agencySelectRows.sort((a, b) => a.organisation.descriptionDe.localeCompare(b.organisation.descriptionDe));
  }
}
