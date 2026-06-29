import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { DateHelpers } from './helpers/date-helpers';
import { FilenameDateRegexp, ReportHelpers } from './helpers/report-helpers';

import { DataService } from './data.service';

import { AgencyJSON } from './models/gtfs/gtfs';
import { GTFS_RT_Static_Monthly_Report_JSON, GTFS_RT_Static_Report, GTFS_RT_Static_Report_Metadata_JSON } from './types/_all';

interface DetailReportRow {
  agency: AgencyJSON,
  valueNow: number,
  valuePrev: number,
};

type SortColumn = 'name' | 'keyA' | 'keyB' | 'diff';
type SortDirection = 'asc' | 'desc';

interface PageModel {
  reportRows: DetailReportRow[],
  keyA: string,
  prevKeyB: string,
  agencyRows: AgencyJSON[],
  compareKeys: string[],
  sort: {
    column: SortColumn,
    direction: SortDirection,
  },
  reportMetadata: GTFS_RT_Static_Report_Metadata_JSON | null,
};

interface RouteGTFS_Data {
  routeId: string,
  route: RouteJSON,
  agency: AgencyJSON,
};
type MapFeedVersionGTFS_Data = Record<string, RouteGTFS_Data>;

// 2026-03-09-1200
type HrReportKey = string;

interface MapAgencyReportData {
  id: string,
  agencyJSON: AgencyJSON,
  activeItemsTotal: number,
  byRouteShortName: Record<string, number>,
};
type MapDaysData = Record<HrReportKey, Record<string, MapAgencyReportData>>;

@Component({
  selector: 'app-detail-agency',
  templateUrl: './detail-agency.component.html',
  styleUrls: ['./detail-agency.component.scss']
})
export class DetailAgencyComponent implements OnInit {
  private mapGTFS_Agency: Record<string, Record<string, AgencyJSON>>;
  private mapDaysData: MapDaysData;
  public model: PageModel;

  constructor(private route: ActivatedRoute, private dataService: DataService) {
    this.mapGTFS_Agency = {};
    this.mapDaysData = {};
    this.model = {
      reportRows: [],
      keyA: 'n/a',
      prevKeyB: '... loading',
      agencyRows: [],
      compareKeys: ['... loading'],
      sort: {
        column: 'diff',
        direction: 'asc',
      },
      reportMetadata: null,
    };
  }

  async ngOnInit(): Promise<void> {
    this.route.paramMap.subscribe(async (params) => {
      const userReportId = params.get('id');
      this.model.keyA = this.massageReportDate(userReportId);
      await this.fetchData();
    });
  }

  private massageReportDate(s: string | null): string {
    if (s === null) {
      // YYYY-MM-DD HH:MM:SS
      s = DateHelpers.formatDate();
    }

    s = s.replaceAll(':', '');
    s = s.replaceAll(' ', '-');

    // 2026-03-11-1053
    s = s.substring(0, 15);

    return s;
  }

  private updateSelectedReportCell(monthlyReport: GTFS_RT_Static_Monthly_Report_JSON, dayF: string, hrMinF: string) {
    if (!(dayF in monthlyReport.report_days)) {
      console.log('error updateSelectedReportCell - cant find day ' + dayF  + ' in monthlyReport.report_days');
      return;
    }
    if (!(hrMinF in monthlyReport.report_days[dayF])) {
      console.log('error updateSelectedReportCell - cant find hrMinF ' + hrMinF  + ' in monthlyReport.report_days');
      return;
    }

    this.model.reportMetadata = monthlyReport.report_days[dayF][hrMinF];
  }

  private async fetchData() {
    const reportKey = this.model.keyA;

    const timeMatches = reportKey.match(FilenameDateRegexp);
    if (timeMatches === null) {
      return;
    }

    this.mapGTFS_Agency = {};
    this.mapDaysData = {};

    const reportYearF = timeMatches[1];
    const reportMonthF = timeMatches[2];
    const reportDayF = timeMatches[3];
    const reportHrMinF = timeMatches[4];

    const ym = reportYearF + '-' + reportMonthF;
    const monthlyReport = await this.dataService.getMonthlyReport(ym);
    this.updateSelectedReportCell(monthlyReport, reportDayF, reportHrMinF);

    const reportURL = ReportHelpers.computeReportURLForTime(reportKey);
    const reportData = await this.dataService.fetchGTFS_RT_StaticReport(reportURL);
    await this.parseReport(reportData, reportKey);

    const mapCompareReportURLs: Record<string, string> = {};
    const mapDayCompareReports = monthlyReport.compare_days[reportDayF] ?? null;
    if (mapDayCompareReports) {
      const snapshotCompareData = mapDayCompareReports[reportHrMinF] ?? null;
      if (snapshotCompareData) {
        const dayKeys = Object.keys(snapshotCompareData.map_days);
        dayKeys.forEach(dayKey => {
          const compareReportKey = dayKey + '-' + reportHrMinF;
          const compareReportURL = ReportHelpers.computeReportURLForTime(compareReportKey);
          mapCompareReportURLs[compareReportKey] = compareReportURL;
        });
      }
    }

    const compareReportKeys = Object.keys(mapCompareReportURLs);
    for (const compareReportKey of compareReportKeys) {
      const compareDayReportURL = mapCompareReportURLs[compareReportKey];
      const compareReportData = await this.dataService.fetchGTFS_RT_StaticReport(compareDayReportURL);
      await this.parseReport(compareReportData, compareReportKey);
    }

    const mapAgencies: Record<string, AgencyJSON> = {};
    const reportKeys = Object.keys(this.mapDaysData);
    reportKeys.forEach(reportKey => {
      const reportAgencyIds = Object.keys(this.mapDaysData[reportKey]);
      reportAgencyIds.forEach(agencyId => {
        mapAgencies[agencyId] = this.mapDaysData[reportKey][agencyId].agencyJSON;
      });
    });
    this.model.agencyRows = Object.values(mapAgencies);

    this.model.compareKeys = compareReportKeys.slice();
    this.model.prevKeyB = this.model.compareKeys.length > 0 ? this.model.compareKeys[0] : 'n/a';

    this.updatePageModel();
  }

  private computeAgencySnapshotData(agency: AgencyJSON, key: string): number {
    const dataKey = this.mapDaysData[key] ?? null;
    if (dataKey === null) {
      return 0;
    }

    const agencySnapshotData = dataKey[agency.agency_id] ?? null;
    const value = agencySnapshotData === null ? 0 : agencySnapshotData.activeItemsTotal;

    return value;
  }

  private updatePageModel() {
    this.model.reportRows = [];
    this.model.agencyRows.forEach(agencyJSON => {
      const reportRow: DetailReportRow = {
        agency: agencyJSON,
        valueNow: this.computeAgencySnapshotData(agencyJSON, this.model.keyA),
        valuePrev: this.computeAgencySnapshotData(agencyJSON, this.model.prevKeyB),
      };

      this.model.reportRows.push(reportRow);
    });
    this.model.reportRows.sort((a, b) => {
      let expr = (() => {
        if (this.model.sort.column === 'keyA') {
          return a.valueNow - b.valuePrev;
        }
        if (this.model.sort.column === 'keyB') {
          return a.valuePrev - b.valuePrev;
        }
        if (this.model.sort.column === 'name') {
          return a.agency.agency_name.localeCompare(b.agency.agency_name);
        }

        return (a.valueNow - a.valuePrev) - (b.valueNow - b.valuePrev);
      })();
      
      if (this.model.sort.direction === 'desc') {
        expr = -1 * expr;
      }

      return expr;
    });
  }

  private async loadGTFS_DataForGTFS_Day(gtfsDay: string) {
    if (gtfsDay in this.mapGTFS_Agency) {
      return;
    }

    this.mapGTFS_Agency[gtfsDay] = {};
  
    const gtfsAgencyData = await this.dataService.fetchGTFS_Agency(gtfsDay);
    const mapAgency: Record<string, AgencyJSON> = {};
    gtfsAgencyData.rows.forEach(row => {
      mapAgency[row.agency_id] = row;
    });

    this.mapGTFS_Agency[gtfsDay] = mapAgency;
  }

  private async parseReport(reportData: GTFS_RT_Static_Report, reportKey: string) {
    const gtfsDay = reportData.gtfs_trips_active_data.gtfs_day;
    
    await this.loadGTFS_DataForGTFS_Day(gtfsDay);
    const mapGTFS_Agency = this.mapGTFS_Agency[gtfsDay] ?? null;
    if (mapGTFS_Agency === null) {
      throw new Error('No lookups for GTFS day: ' + gtfsDay);
    }

    this.mapDaysData[reportKey] = {};

    const agencyIds = Object.keys(reportData.gtfs_rt_active_by_agency);
    agencyIds.forEach(agencyId => {
      const agencyJSON = mapGTFS_Agency[agencyId] ?? null;
      if (agencyJSON === null) {
        throw new Error('No GTFS agenct for ' + agencyId + ' in GTFS day: ' + gtfsDay);
      }

      const gtfsRT_activeNo = reportData.gtfs_rt_active_by_agency[agencyId];
      this.mapDaysData[reportKey][agencyId] = {
        id: agencyId,
        agencyJSON: agencyJSON,
        activeItemsTotal: gtfsRT_activeNo,
      };
    });
  }

  public onCompareValueChange() {
    this.updatePageModel();
  }

  public onSortClick(column: SortColumn) {
    if (this.model.sort.column === column) {
      this.model.sort.direction = this.model.sort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      const sortAscColumns: SortColumn[] = ['name', 'diff'];
      if (sortAscColumns.includes(column)) {
        this.model.sort.direction = 'asc';
      } else {
        this.model.sort.direction = 'desc';
      }

      this.model.sort.column = column;
    }

    this.updatePageModel();
  }
}
