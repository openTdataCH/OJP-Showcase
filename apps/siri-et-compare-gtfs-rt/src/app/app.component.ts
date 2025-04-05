import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';

import DateHelpers from '../shared/helpers/date-helpers';

import { BusinessOrganisationsController } from '../shared/controllers/business-organisations';

import { GTFS_DB_Catalog_Controller } from '../shared/controllers/gtfs-db-catalog';
import { GTFS_DB_Controller } from '../shared/controllers/gtfs-db-controller';
import { Response_GTFS_RT } from '../shared/types/gtfs-rt/gtfs-rt-response';

import { VehicleJourney } from '../shared/models/siri-et/vehicle-journey';
import { SIRI_ET_Parser } from '../shared/controllers/siri-et/siri-et-parser';

import { ReportController } from './controllers/report-controller';

import { HTTP_Service } from './services/http.service';

import { GTFS_RT_ReportItem, MapAgencyGTFS_RT_Entity, MapAgencySIRI_ET_Journeys, ReportResultItem, ReportData, SIRI_ET_ReportItem, DataLoadProgress } from './types/report-controller';

import { DEFAULT_REPORT_DATA } from './constants';
import { AGENCY_ID_NO_DATA } from "../shared/constants";

type ProcessingState = 'IDLE' | 'FETCH_DATA' | 'PROCESS_DATA' | 'DONE_PROCESSING'

interface PageModel {
  processingState: ProcessingState,
  processingGTFS_State: ProcessingState,
  reportData: ReportData,
  dataLoadProgress: DataLoadProgress,
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public model: PageModel

  public reportController: ReportController | null;

  constructor(private httpService: HTTP_Service) {
    this.model = {
      processingState: 'IDLE',
      processingGTFS_State: 'IDLE',
      reportData: DEFAULT_REPORT_DATA,
      dataLoadProgress: {
        percent: 0,
        text: 'idle',
      },
    };
    this.reportController = null;
  }

  ngOnInit() {
    if (!(window.location.host.startsWith('localhost'))) {
      this.fetchData();
    }
  }

  public async fetchData() {
    this.model.processingState = 'FETCH_DATA';

    this.model.dataLoadProgress.percent = 0;

    const reportDayF = DateHelpers.formatDateYMDHIS(new Date()).slice(0, 10);
    this.model.reportData.reportDay = reportDayF;
    console.log('using ReportDay: ' + reportDayF);

    this.model.dataLoadProgress.text = '... fetching latest GTFS Catalog';

    const gtfsDBCatalogJSON = await this.httpService.fetchLatestGTFSCatalog();
    const gtfsDB_CatalogController = new GTFS_DB_Catalog_Controller(gtfsDBCatalogJSON);
    const gtfsDay = gtfsDB_CatalogController.computeGTFS_DayFor_RT_Switch();
    if (gtfsDay === null) {
      console.error('Cant find GTFS day');
      console.log(gtfsDBCatalogJSON);
      return;
    }

    console.log('using GTFSday: ' + gtfsDay);
    this.model.reportData.gtfsDay = gtfsDay;

    this.model.dataLoadProgress.percent = 10;

    this.model.dataLoadProgress.text = '... fetching latest BusinessOrganisations dataset';

    const boCSV = await this.httpService.fetchBusinessOrganisationsCSV();
    const boController = new BusinessOrganisationsController();
    boController.loadFromCSV(boCSV);

    this.model.dataLoadProgress.percent = 30;
    this.model.dataLoadProgress.text = '... fetching SIRI-ET / GTFS-RT / GTFS-DB lookups';
    
    forkJoin({
      siriET: this.httpService.fetchSIRI_ET(),
      gtfsRT: this.httpService.fetchGTFS_RT(),
      gtfsDBLookup: this.httpService.fetchDBLookups(gtfsDay),
    }).subscribe({
      next: async (results) => {
        this.model.processingState = 'PROCESS_DATA';

        const gtfsDBController = new GTFS_DB_Controller(gtfsDay);
        gtfsDBController.loadDBLookups(results.gtfsDBLookup);
        
        const mapAgencyGTFS_RT_Entity = this.processGTFS_RT(results.gtfsRT, gtfsDBController);
        console.log('DONE parsing GTFS-RT');
        console.log(mapAgencyGTFS_RT_Entity);
        console.log();

        const siri_ET_Journeys = await this.parseSIRI_ET(results.siriET);
        const mapAgencySIRI_ET_Journeys = this.processSIRI_ET_Items(reportDayF, siri_ET_Journeys, boController, gtfsDBController);
        console.log('DONE parsing ET');
        console.log(mapAgencySIRI_ET_Journeys);
        console.log();

        this.model.dataLoadProgress.percent = 100;
        this.model.dataLoadProgress.text = '... done fetching data';
        this.model.processingState = 'DONE_PROCESSING';

        const reportController = new ReportController(reportDayF, this.httpService, gtfsDBController, mapAgencySIRI_ET_Journeys, mapAgencyGTFS_RT_Entity);
        reportController.onFetchData = (dataLoadProgress) => {
          this.model.dataLoadProgress = dataLoadProgress;
          if (dataLoadProgress.percent === 100) {
            this.model.processingGTFS_State = 'DONE_PROCESSING';
          } else {
            this.model.processingGTFS_State = 'FETCH_DATA';
          }
        };
        reportController.computeReportData(siri_ET_Journeys.length);
        
        this.model.reportData = reportController.reportData;
        this.reportController = reportController;
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      },
      complete: () => {
        // console.log('All requests completed');
      },
    });
  }

  private async parseSIRI_ET(responseXML: string): Promise<VehicleJourney[]> {
    const parser = new SIRI_ET_Parser();

    const response = new Promise<VehicleJourney[]>((resolve) => {
      parser.callback = ((response) => {
        if (response.status === 'COUNT_ITEMS_NO') {

        }
  
        if (response.status === 'PARSE.ITEM') {

        }
  
        if (response.status === 'PARSE.DONE') {
          resolve(response.items);
        }
      });
      parser.parseXML(responseXML);
    });

    return response;
  }

  private processGTFS_RT(response: Response_GTFS_RT, gtfsDBController: GTFS_DB_Controller): MapAgencyGTFS_RT_Entity {
    const mapAgencyGTFS_RT_Entity: MapAgencyGTFS_RT_Entity = {};
    mapAgencyGTFS_RT_Entity[AGENCY_ID_NO_DATA] = [];

    response.Entity.forEach(gtfsRT_Entity => {
      const tripId = gtfsRT_Entity.TripUpdate?.Trip?.TripId ?? null;
      if (tripId === null) {
        console.error('processGTFS_RT: null TripId');
        console.log(gtfsRT_Entity);
        debugger;
        return;
      }

      const routeId = gtfsRT_Entity.TripUpdate?.Trip?.RouteId ?? null;
      if (routeId === null) {
        console.error('processGTFS_RT: null RouteId');
        console.log(gtfsRT_Entity);
        debugger;
        return;
      }

      const route = gtfsDBController.mapRoutes[routeId] ?? null;
      let agencyId = AGENCY_ID_NO_DATA;
      if (route !== null) {
        agencyId = route.agency.agency_id;
      }

      if (!(agencyId in mapAgencyGTFS_RT_Entity)) {
        mapAgencyGTFS_RT_Entity[agencyId] = [];
      }

      mapAgencyGTFS_RT_Entity[agencyId].push(gtfsRT_Entity);
    });

    return mapAgencyGTFS_RT_Entity;
  }

  private processSIRI_ET_Items(reportDayF: string, items: VehicleJourney[], boController: BusinessOrganisationsController, gtfsDBController: GTFS_DB_Controller): MapAgencySIRI_ET_Journeys {
    const mapAgencySIRI_ET_Journeys: MapAgencySIRI_ET_Journeys = {};
    
    items.forEach(item => {
      const day = item.vehicleDayRef;
      if (day !== reportDayF) {
        return;
      }

      const operatorRef = item.operatorRef;
      const boData = boController.mapSboid[operatorRef] ?? null;
      
      let agencyId = AGENCY_ID_NO_DATA;
      if (boData === null) {
        // catch ch:1:Organisation:797
        const operatorRefParts = operatorRef.split(':Organisation:');
        if (operatorRefParts.length === 2) {
          const lookupAgencyId = operatorRefParts[1];
          const agency = gtfsDBController.mapAgency[lookupAgencyId] ?? null;

          if (agency !== null) {
            agencyId = agency.agency_id;
          } else {
            // TODO - handle error
            // console.log(operatorRef);
          }
        }
      } else {
        agencyId = boData.organisationNumber;
      }

      if (!(agencyId in mapAgencySIRI_ET_Journeys)) {
        mapAgencySIRI_ET_Journeys[agencyId] = [];
      }

      mapAgencySIRI_ET_Journeys[agencyId].push(item);
    });

    return mapAgencySIRI_ET_Journeys;
  }

  public isBusyProcessing(): boolean {
    if (this.model.processingState === 'FETCH_DATA') {
      return true;
    }
    if (this.model.processingState === 'PROCESS_DATA') {
      return true;
    }
    if (this.model.processingGTFS_State === 'FETCH_DATA') {
      return true;
    }

    return false;
  }

  public onChangeAgenciesInSIRI_ET_OnlySelect(event: Event) {
    const agencyId = (event.target as HTMLSelectElement).value;
    this.reportController?.updateSIRI_ET_AgencySelectedItems(agencyId);
  }

  public onChangeAgenciesInGTFS_RT_OnlySelect(event: Event) {
    const agencyId = (event.target as HTMLSelectElement).value;
    this.reportController?.updateGTFS_RT_AgencySelectedItems(agencyId);
  }

  public onChangeAgenciesInBothSelect(event: Event) {
    // TODO - move this in fetchAndComputeBothInAgencyItems ?
    this.model.reportData.bothInAgency.siriET_NoGTFS_Items = [];
    this.model.reportData.bothInAgency.gtfsRT_NoGTFS_Items = [];
    this.model.reportData.bothInAgency.resultMatchNoGTFS_RT_Rows = [];
    this.model.reportData.bothInAgency.resultMatchRowsWithGTFS_RT_Rows = [];

    const agencyId = (event.target as HTMLSelectElement).value;
    this.reportController?.fetchAndComputeBothInAgencyItems(agencyId);
  }

  // tenmplate helpers to provide intelisense in the ng-template
  // https://stackoverflow.com/questions/55458421/ng-template-typed-variable
  public asSIRI_ET_ReportItems = (item: SIRI_ET_ReportItem[]) => item;
  public asGTFS_RT_ReportItems = (item: GTFS_RT_ReportItem[]) => item;
  public asReportResultItems = (item: ReportResultItem[]) => item;
}
