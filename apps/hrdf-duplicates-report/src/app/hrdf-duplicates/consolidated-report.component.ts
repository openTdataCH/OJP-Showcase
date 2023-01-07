import { Component, OnInit } from '@angular/core';
import HRDF_DuplicatesFetchController from './controllers/hrdf-duplicates-fetch-controller';
import { HttpService } from './services/http-service';

interface ReportRow {
  hrdfDay: string
  agencyId: string
  agencyCode: string
  agencyName: string
  fplanType: string
  fahrtNummer: string
  duplicatesNo: number
  detailsURL: string
}

interface RenderModel {
  statusMessage: string
  hrdfDays: string[]
  reportRows: ReportRow[]
  displayReportRows: ReportRow[]
}

@Component({
  selector: 'consolidated-report',
  templateUrl: './consolidated-report.component.html',
  styleUrls: ['./consolidated-report.component.scss'],
})
export class ConsolidatedReportComponent implements OnInit {
  private queryParams: URLSearchParams;
  public renderModel: RenderModel
  
  public inputFilterByAgencyIDs: string
  private filterByAgencyIDs: string[] | null

  constructor(private httpService: HttpService) {
    this.queryParams = new URLSearchParams(document.location.search);
    this.renderModel = {
      statusMessage: 'loading duplicate reports',
      hrdfDays: [],
      reportRows: [],
      displayReportRows: [],
    }

    this.inputFilterByAgencyIDs = this.queryParams.get('agency_ids') ?? '11,72';
    this.filterByAgencyIDs = null;
    this.parseFilterAgencyIDs();
  }
  
  ngOnInit(): void {
    this.fetchDuplicateDays()
  }
  
  private fetchDuplicateDays() {
    this.httpService.getDuplicatesList().subscribe((data) => {
      const reportDays = data.hrdf_duplicates_available_days;
      this.renderModel.statusMessage = '... found ' + reportDays.length + ' reports';
      this.renderModel.hrdfDays = reportDays;

      this.renderModel.reportRows = [];
      this.renderModel.displayReportRows = [];

      this.fetchReportDay(0);
    });
  }

  private fetchReportDay(idx: number) {
    const reportDaysNo = this.renderModel.hrdfDays.length;
    const isCompleted = (reportDaysNo === 0) || (idx > (reportDaysNo - 1));

    if (isCompleted) {
      return;
    }

    const hrdfDay = this.renderModel.hrdfDays[idx];
    const hrdfDayF = this.formatHRDF_Day(hrdfDay);
    this.renderModel.statusMessage = '... fetching ' + (idx + 1) + '/' + this.renderModel.hrdfDays.length + ' days: ' + hrdfDayF;

    const fetchController = new HRDF_DuplicatesFetchController(
      this.httpService
    );
    fetchController.fetchDay(hrdfDay, (duplicatesReport) => {
      duplicatesReport.agenciesData.forEach(agencyData => {
        const agencyId = agencyData.agency.agency_id;
        const keepRow = this.shouldKeepRow(agencyId);
        const detailsURL = './report?day=' + hrdfDay + '&agency_id=' + agencyId;

        agencyData.tripsData.forEach(groupData => {
          const firstTrip = groupData.hrdfTrips[0];

          const reportRow: ReportRow = {
            hrdfDay: hrdfDayF,
            agencyId: agencyId,
            agencyCode: agencyData.agency.agency_code ?? agencyData.agency.agency_name,
            agencyName: agencyData.agency.agency_name + ' (' + agencyData.agency.agency_code + ')',
            fplanType: firstTrip.vehicleType,
            fahrtNummer: firstTrip.fplan_trip_id,
            duplicatesNo: groupData.hrdfTrips.length,
            detailsURL: detailsURL,
          }

          this.renderModel.reportRows.push(reportRow);
          if (keepRow) {
            this.renderModel.displayReportRows.push(reportRow);
          }
        });
      });

      this.fetchReportDay(idx + 1);
    });
  }

  private parseFilterAgencyIDs() {
    const agencyIDs_s = this.inputFilterByAgencyIDs ?? '';
    const agencyIDs = agencyIDs_s.trim().split(',');

    if (agencyIDs.length === 1 && agencyIDs[0] === '') {
      this.filterByAgencyIDs = null;
    } else {
      this.filterByAgencyIDs = agencyIDs;
    }
  }

  private shouldKeepRow(agencyId: string): boolean {
    if (this.filterByAgencyIDs === null) {
      return true;
    }

    return this.filterByAgencyIDs.indexOf(agencyId) > -1;
  }

  private formatHRDF_Day(hrdfDay: string) {
    const dayParts = hrdfDay.split('-');
    return dayParts[2] + '.' + dayParts[1] + '.' + dayParts[0];
  }
}
