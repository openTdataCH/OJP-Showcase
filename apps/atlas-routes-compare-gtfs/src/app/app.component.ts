import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import Papa from 'papaparse';

import DateHelpers from '../shared/helpers/date-helpers';
import { FormatHelpers } from './helpers/format-helpers';

import { Trip } from '../shared/models/gtfs/trip';
import { MatchController } from './controllers/match-controller';

import { HTTP_Service } from './services/http.service';

import { AtlasOEV_RouteReportRow, MatchedStatus, ReportCSV_DataRow, ReportData } from './types/_all';

import { GTFS_DB_Catalog_Controller } from '../shared/controllers/gtfs-db-catalog';
import { GTFS_DB_Controller } from '../shared/controllers/gtfs-db-controller';
import { AtlasLineDataController, AtlasStopGeoJSONFeature  } from '../shared/controllers/atlas-data';
import { BusinessOrganisationsController } from '../shared/controllers/business-organisations';

import { DEFAULT_REPORT_DATA } from './constants';

interface PageModel {
  processingState: 'IDLE' | 'FETCH_DATA' | 'PROCESS_DATA' | 'DONE_PROCESSING'
  reportData: ReportData,
  dataLoadProgress: {
    percent: number,
    text: string
  }

  filter: {
    byMatchedStatus: Record<MatchedStatus, boolean>,
    byText: string,
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
      dataLoadProgress: {
        percent: 0,
        text: 'idle',
      },

      filter: {
        byMatchedStatus: {
          'NONE': false,
          
          'OK_EXT': false,
          'OK': false,
          
          'OK_FUZZY_SAME_ROUTE': false,
          'OK_FUZZY_OTHER_ROUTE': false,
          'OK_FUZZY_OTHER_AGENCY': false,
          'OK_FUZZY_GTFS_ALL': false,

          'NO_MATCHES_FUZZY_SAME_ROUTE': true,
          'NO_MATCHES_FUZZY_OTHER_AGENCY': true,
          'NO_MATCHES': true,
        },
        byText: '',
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
      this.model.filter.byText = value.trim();
      this.updateFilteredItems();
    });
  }

  public async fetchData() {
    this.model.processingState = 'FETCH_DATA';

    const reportDayF = DateHelpers.formatDateYMDHIS(new Date()).slice(0, 10);

    this.model.reportData.reportDay = reportDayF;
    console.log('using ReportDay: ' + reportDayF);

    this.model.dataLoadProgress.percent = 0;
    this.model.dataLoadProgress.text = '... fetching latest BO CSV';
    
    const boCSVs = await this.httpService.fetchBusinessOrganisationsCSV();
    const boController = new BusinessOrganisationsController();
    await boController.loadFromCSV(boCSVs);

    this.model.dataLoadProgress.percent = 10;
    this.model.dataLoadProgress.text = '... fetching latest GTFS catalog';
    
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

    this.model.dataLoadProgress.percent = 30;
    this.model.dataLoadProgress.text = '... fetching GTFS DB Lookups';

    const dbLookups = await this.httpService.fetchDBLookups(gtfsDay);
    const gtfsDBController = new GTFS_DB_Controller(gtfsDay);
    gtfsDBController.loadDBLookups(dbLookups);

    this.model.dataLoadProgress.percent = 40;
    this.model.dataLoadProgress.text = '... fetching latest ATLAS Line CSV';

    const responseCSVs = await this.httpService.fetchAtlasLinieCSV();
    const atlasLinieController = new AtlasLineDataController();
    await atlasLinieController.loadFromCSV(responseCSVs);
    console.log(atlasLinieController);

    this.model.dataLoadProgress.percent = 60;
    this.model.dataLoadProgress.text = '... fetching GTFS representative queries';

    const mapRouteTrips: Record<string, Trip> = {};
    const routeTrips = await this.httpService.fetchRoutesRepresentativeTrip(gtfsDay);
    routeTrips.rows.forEach(dbRow => {
      const trip = Trip.initWithCondensedTrip(dbRow, gtfsDBController.mapRoutes, gtfsDBController.mapStops, {});
      mapRouteTrips[trip.route.route_id] = trip;
    });
    console.log('mapRouteTrips: Record<string, Trip>');
    console.log(mapRouteTrips);

    this.model.dataLoadProgress.percent = 70;
    this.model.dataLoadProgress.text = '... fetching Atlas stops GeoJSON';

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

    this.model.dataLoadProgress.percent = 90;
    this.model.dataLoadProgress.text = '... fetching OEV matching routes';
  
    const atlasOEV_Routes = await this.httpService.fetchAtlasOEV_Routes();
    const mapAtlasOEV_Routes: Record<string, AtlasOEV_RouteReportRow> = {};
    atlasOEV_Routes.rows.forEach(el => {
      mapAtlasOEV_Routes[el.slnid] = el;
    });
    console.log('mapAtlasOEV_Routes: Record<string, AtlasOEV_RouteReportRow[]>');
    console.log(mapAtlasOEV_Routes);

    this.model.dataLoadProgress.percent = 100;
    this.model.dataLoadProgress.text = '... done fetching data';

    const matchController: MatchController = new MatchController(gtfsDBController, boController, atlasLinieController, mapRouteTrips, mapAtlasRouteFeatures, mapAtlasOEV_Routes);

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
    const reportCSV_DataRows: ReportCSV_DataRow[] = [];

    this.model.reportData.agencyReportRows.forEach(agencyReportRow => {
      agencyReportRow.routeReportRows.forEach(routeReportRow => {
        const gtfs_route_trip_stop_times: string | null = (() => {
          if (routeReportRow.matchedGTFS_Trip === null) {
            return null;
          }

          return FormatHelpers.computeTripStopsText(routeReportRow.matchedGTFS_Trip);
        })();
        const gtfs_route_trip_sloids: string | null = (() => {
          if (routeReportRow.matchedGTFS_Trip === null) {
            return null;
          }

          return FormatHelpers.computeTripSloids(routeReportRow.matchedGTFS_Trip);
        })();

        const reportCSV_DataRow: ReportCSV_DataRow = {
          atlas_slnid: routeReportRow.atlasRoute.slnid,
          
          atlas_sboid: agencyReportRow.organisation.sboid,
          atlas_organisation_name: agencyReportRow.organisation.descriptionDe,
          
          atlas_gtfs_agency_id: agencyReportRow.agency?.agency_id ?? null,
          atlas_gtfs_agency_name: agencyReportRow.agency?.agency_name ?? null,
          
          atlas_line_number: routeReportRow.atlasRoute.number,
          atlas_line_description: routeReportRow.atlasRoute.description,
          
          gtfs_agency_id: routeReportRow.matchedGTFS_Route?.agency.agency_id ?? null,
          gtfs_agency_name: routeReportRow.matchedGTFS_Route?.agency.agency_name ?? null,
          
          gtfs_route_id: routeReportRow.matchedGTFS_Route?.route_id ?? null,
          gtfs_route_short_name: routeReportRow.matchedGTFS_Route?.route_short_name ?? null,
          gtfs_route_trip_stop_times: gtfs_route_trip_stop_times,
          gtfs_route_trip_sloids: gtfs_route_trip_sloids,
          
          matched_status: routeReportRow.matchedStatus,

          comments: null,
        };

        reportCSV_DataRows.push(reportCSV_DataRow);
      });
    });

    const reportCSV = Papa.unparse(reportCSV_DataRows, {
      quotes: true,
      delimiter: ';',
    });
    
    return reportCSV;
  }

  private updateFilteredItems() {
    console.log('updating results ...');
    console.log(this.model.filter);

    this.model.reportData.agencyFilterReportRows = this.model.reportData.agencyReportRows.filter(agencyReportRow => {
      const isSLNID = this.model.filter.byText.includes(':slnid:');

      // update showInGUI flag
      agencyReportRow.routeReportRows.forEach(routeReportRow => {
        if (isSLNID) {
          const isSameSLNID = routeReportRow.atlasRoute.slnid === this.model.filter.byText;
          routeReportRow.showInGUI = isSameSLNID;
        } else {
          routeReportRow.showInGUI = this.model.filter.byMatchedStatus[routeReportRow.matchedStatus];
        }
      });

      const routeReportRowsInGUI = agencyReportRow.routeReportRows.find(el => el.showInGUI) ?? null;
      const hasRoutesinGUI = routeReportRowsInGUI !== null;

      const keepAgencyByName: boolean = (() => {
        if (isSLNID) {
          return true;
        }

        const filterName = this.model.filter.byText.toLowerCase().trim();
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

      return hasRoutesinGUI && keepAgencyByName;
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
