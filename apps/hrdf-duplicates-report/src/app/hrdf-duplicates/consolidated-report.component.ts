import { Component, OnInit } from '@angular/core';
import { HttpService } from './services/http-service';

interface ReportRow {
  hrdfDay: string
  hrdfDayF: string
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
  reportRows: ReportRow[],
  agencyIDsMessage: string | null
}

interface DuplicateCSVRow {
  day: string
  agency_id: string
  type: string
  fplan_trip_id: string
  duplicates_no: number
}

@Component({
  selector: 'consolidated-report',
  templateUrl: './consolidated-report.component.html',
  styleUrls: ['./consolidated-report.component.scss'],
})
export class ConsolidatedReportComponent implements OnInit {
  private queryParams: URLSearchParams;
  public renderModel: RenderModel
  
  public filterByAgencyIDs: string[]

  constructor(private httpService: HttpService) {
    this.queryParams = new URLSearchParams(document.location.search);

    this.renderModel = {
      statusMessage: '... loading duplicate reports',
      reportRows: [],
      agencyIDsMessage: '',
    }

    this.filterByAgencyIDs = (() => {
      const agencyIDs_s = this.queryParams.get('agency_ids') ?? '11,72';
      const agencyIDs = agencyIDs_s.trim().split(',');
  
      if (agencyIDs.length === 1 && agencyIDs[0] === '') {
        return [];
      } else {
        return agencyIDs;
      }
    })();

    if (this.filterByAgencyIDs !== null) {
      this.renderModel.agencyIDsMessage = this.filterByAgencyIDs.join(',');
    }
  }
  
  ngOnInit(): void {
    this.fetchDuplicatesConsolidatedReport(duplicateCSVRows => {
      const reportRows: ReportRow[] = [];

      duplicateCSVRows.forEach(duplicateCSVRow => {
        const agencyId = duplicateCSVRow.agency_id;
        if (this.filterByAgencyIDs.length > 0 && this.filterByAgencyIDs.indexOf(agencyId) === -1) {
          return;
        }

        const detailsURL = 'https://tools.odpch.ch/hrdf-check-duplicates/report?day=' + duplicateCSVRow.day + '&agency_id=' + agencyId;

        const reportRow: ReportRow = {
          hrdfDay: duplicateCSVRow.day,
          hrdfDayF: this.formatHRDF_Day(duplicateCSVRow.day),
          agencyId: agencyId,
          agencyCode: 'n/a',
          agencyName: 'n/a',
          fplanType: duplicateCSVRow.type,
          fahrtNummer: duplicateCSVRow.fplan_trip_id,
          duplicatesNo: duplicateCSVRow.duplicates_no,
          detailsURL: detailsURL,
        };

        reportRows.push(reportRow);
      });

      if (reportRows.length > 1000) {
        this.renderModel.statusMessage = 'Displaying top 1,000 rows (from ' + reportRows.length + ' in total)'
        this.renderModel.reportRows = reportRows.slice(0, 1000);
      } else {
        this.renderModel.statusMessage = 'Displaying ' + reportRows.length + ' rows'
        this.renderModel.reportRows = reportRows;
      }

      this.renderModel.reportRows.sort((a, b) => {
        if (a.hrdfDay > b.hrdfDay) return -1;
        if (a.hrdfDay > b.hrdfDay) return 1;
        return 0;
      });
    });
  }

  private fetchDuplicatesConsolidatedReport(completion: (duplicateRows: DuplicateCSVRow[]) => void) {
    this.httpService.gerHRDF_DuplicatesConsolidatedReport().subscribe(data => {

      const csvRows = data.split("\n");
      const duplicateCSVRows: DuplicateCSVRow[] = [];
      let headerRows: string[] = []
      csvRows.forEach((csvRow, idx) => {
        csvRow = csvRow.trim();

        if (idx === 0) {
          headerRows = csvRow.split(',');
        } else {
          const mapRowValues: Record<string, any> = {};
          csvRow.split(',').forEach((val, idx) => {
            mapRowValues[headerRows[idx]] = val;
          });

          mapRowValues['duplicates_no'] = parseInt(mapRowValues['duplicates_no'], 10);
          duplicateCSVRows.push(mapRowValues as DuplicateCSVRow);
        }
      });

      completion(duplicateCSVRows);
    });
  }

  private formatHRDF_Day(hrdfDay: string) {
    const dayParts = hrdfDay.split('-');
    return dayParts[2] + '.' + dayParts[1] + '.' + dayParts[0];
  }
}
