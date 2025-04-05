import { Component, OnInit } from '@angular/core';

import Papa from 'papaparse';
import DateHelpers from '../shared/helpers/date-helpers';

import { BusinessOrganisationsController } from '../shared/controllers/business-organisations';
import { GTFS_DB_Catalog_Controller } from '../shared/controllers/gtfs-db-catalog';
import { GTFS_DB_Controller } from '../shared/controllers/gtfs-db-controller';
import { SIRI_ET_Parser } from '../shared/controllers/siri-et/siri-et-parser';
import { VehicleJourney } from '../shared/models/siri-et/vehicle-journey';

import { HTTP_Service } from './services/http.service';
import { DataLoadProgress, ReportCSV_DataRow, ReportData } from './types/_all';
import { ReportController } from './controllers/report-controller';
import { SIRI_ET_Helpers } from '../shared/helpers/siri-et-helpers';

type ProcessingState = 'IDLE' | 'FETCH_DATA' | 'PROCESS_DATA' | 'DONE_PROCESSING';

interface PageModel {
  processingState: ProcessingState,
  dataLoadProgress: DataLoadProgress,
  reportData: ReportData,
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public model: PageModel;

  constructor(private httpService: HTTP_Service) {
    this.model = {
      processingState: 'IDLE',
      dataLoadProgress: {
        percent: 0,
        text: 'idle',
      },
      reportData: {
        reportDay: 'n/a',
        gtfsDay: 'n/a',
        siriET_totalNo: 0,
        siriET_totalIssuesNo: 0,
        stopReportRows: [],
      },
    };
  }

  ngOnInit() {
    if (!(window.location.host.startsWith('localhost'))) {
      this.fetchData();
    }
  }

  public async fetchData() {
    this.model.processingState = 'FETCH_DATA';

    const reportDayF = DateHelpers.formatDateYMDHIS(new Date()).slice(0, 10);
    this.model.reportData.reportDay = reportDayF;
    console.log('using ReportDay: ' + reportDayF);

    this.model.dataLoadProgress.percent = 10;
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
    this.model.dataLoadProgress.text = '... fetching latest BO CSV';

    const boCSVs = await this.httpService.fetchBusinessOrganisationsCSV();
    const boController = new BusinessOrganisationsController();
    await boController.loadFromCSV(boCSVs);
    console.log('.. done BusinessOrganisationsController');
    console.log(boController);
    console.log();

    this.model.dataLoadProgress.percent = 20;
    this.model.dataLoadProgress.text = '... fetching GTFS DB Lookups';

    const gtfsDBLookup = await this.httpService.fetchDBLookups(gtfsDay);
    const gtfsDBController = new GTFS_DB_Controller(gtfsDay);
    gtfsDBController.loadDBLookups(gtfsDBLookup);
    console.log('.. done GTFS_DB_Controller');
    console.log(gtfsDBController);
    console.log();

    this.model.dataLoadProgress.percent = 40;
    this.model.dataLoadProgress.text = '... fetching latest SIRI-ET';

    const siri_ET_JourneysS = await this.httpService.fetchSIRI_ET();

    this.model.dataLoadProgress.percent = 60;
    this.model.dataLoadProgress.text = '... parsing SIRI-ET';

    const siri_ET_Journeys = await this.parseSIRI_ET_Response(siri_ET_JourneysS);
    const mapDayAgencySIRI_ET_Journeys = SIRI_ET_Helpers.processSIRI_ET_Items(siri_ET_Journeys, boController, gtfsDBController);
    const mapAgencySIRI_ET_Journeys = mapDayAgencySIRI_ET_Journeys[reportDayF] ?? {};

    console.log('DONE parsing ET');
    console.log(mapAgencySIRI_ET_Journeys);
    console.log();

    this.model.reportData.siriET_totalNo = siri_ET_Journeys.length;

    this.model.dataLoadProgress.percent = 100;
    this.model.dataLoadProgress.text = '... done fetching data';

    const reportController = new ReportController(mapAgencySIRI_ET_Journeys, boController);
    reportController.processData(this.model.reportData);

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

  private async parseSIRI_ET_Response(responseXML: string): Promise<VehicleJourney[]> {
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

  private computeReportCSV(): string {
    const reportCSV_DataRows: ReportCSV_DataRow[] = [];

    this.model.reportData.stopReportRows.forEach(stopReportRow => {
      const reportCSV_DataRow: ReportCSV_DataRow = {
        stop_name: stopReportRow.stopPointName,
        didok_ref: stopReportRow.didokRef,
        sloid_issues: stopReportRow.sloidIssues.join(','),
        
        affected_messages_no: stopReportRow.totalAffectedMessagesNo,
        
        agency1_name: stopReportRow.organisations[0].agencyTitle,
        agency1_sboid: stopReportRow.organisations[0].sboid,
        agency1_lines: stopReportRow.organisations[0].publishedLineNumbers.join(','),
      
        agency2_name: '',
        agency2_sboid: '',
        agency2_lines: '',
      
        agency3_name: '',
        agency3_sboid: '',
        agency3_lines: '',
      
        agency4_name: '',
        agency4_sboid: '',
        agency4_lines: '',
      };

      if (stopReportRow.organisations.length > 0) {
        const orgData = stopReportRow.organisations[0];
        
        reportCSV_DataRow.agency1_name = orgData.agencyTitle,
        reportCSV_DataRow.agency1_sboid = orgData.sboid;
        reportCSV_DataRow.agency1_lines = orgData.publishedLineNumbers.join(',');
      }

      if (stopReportRow.organisations.length > 1) {
        const orgData = stopReportRow.organisations[1];
        
        reportCSV_DataRow.agency2_name = orgData.agencyTitle,
        reportCSV_DataRow.agency2_sboid = orgData.sboid;
        reportCSV_DataRow.agency2_lines = orgData.publishedLineNumbers.join(',');
      }

      if (stopReportRow.organisations.length > 2) {
        const orgData = stopReportRow.organisations[2];
        
        reportCSV_DataRow.agency3_name = orgData.agencyTitle,
        reportCSV_DataRow.agency3_sboid = orgData.sboid;
        reportCSV_DataRow.agency3_lines = orgData.publishedLineNumbers.join(',');
      }

      if (stopReportRow.organisations.length > 3) {
        const orgData = stopReportRow.organisations[3];
        
        reportCSV_DataRow.agency4_name = orgData.agencyTitle,
        reportCSV_DataRow.agency4_sboid = orgData.sboid;
        reportCSV_DataRow.agency4_lines = orgData.publishedLineNumbers.join(',');
      }

      reportCSV_DataRows.push(reportCSV_DataRow);
    });

    const reportCSV = Papa.unparse(reportCSV_DataRows, {
      quotes: true,
      delimiter: ';',
    });
    
    return reportCSV;
  }

  public downloadReport() {
    const reportCSV = this.computeReportCSV();
    const blob = new Blob([reportCSV], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;

    link.setAttribute('download', 'report-siri-et-check-sloids.csv');
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
