import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { DateHelpers } from './helpers/date-helpers';
import { FilenameDateRegexp, ReportHelpers } from './helpers/report-helpers';

import { DataService } from './data.service';

import { AgencyJSON, RouteJSON } from './models/gtfs/gtfs';
import { Response_GTFS_RT } from './models/gtfs-rt/gtfs-rt-response';
import { GTFS_RT_Static_Monthly_Report_JSON, GTFS_RT_Static_Report_Metadata_JSON } from './types/_all';

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
  private mapGTFS_RouteAgency: Record<string, MapFeedVersionGTFS_Data>;
  private mapDaysData: MapDaysData;
  public model: PageModel;

  constructor(private route: ActivatedRoute, private dataService: DataService) {
   this.mapGTFS_RouteAgency = {};
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

    this.mapGTFS_RouteAgency = {};
    this.mapDaysData = {};

    const reportYearF = timeMatches[1];
    const reportMonthF = timeMatches[2];
    const reportDayF = timeMatches[3];
    const reportHrMinF = timeMatches[4];

    const ym = reportYearF + '-' + reportMonthF;
    const monthlyReport = await this.dataService.getMonthlyReport(ym);
    this.updateSelectedReportCell(monthlyReport, reportDayF, reportHrMinF);

    const gtfsRT_SnapshotURL = ReportHelpers.computeGTFS_RT_URL(reportKey);
    const gtfsRT = await this.dataService.fetchGTFS_RT_Snapshot(gtfsRT_SnapshotURL);

    await this.loadGTFS_Data(gtfsRT.header.feedVersion);
    this.parseGTFS_RT(gtfsRT, reportKey);

    const mapCompareSnapshotURLs: Record<string, string> = {};
    const mapDayCompareReports = monthlyReport.compare_days[reportDayF] ?? null;

    if (mapDayCompareReports) {
      const snapshotCompareData = mapDayCompareReports[reportHrMinF] ?? null;
      if (snapshotCompareData) {
        const dayKeys = Object.keys(snapshotCompareData.map_days);
        dayKeys.forEach(dayKey => {
          // https://tools.odpch.ch/gtfs-rt-snapshot/2026/03/11/GTFS_RT-2026-03-11-1100.json
          const compareReportKey = dayKey + '-' + reportHrMinF;
          const compareDaySnapshotURL = ReportHelpers.computeGTFS_RT_URL(compareReportKey);
          mapCompareSnapshotURLs[compareReportKey] = compareDaySnapshotURL;
        });
      }
    }

    const compareReportKeys = Object.keys(mapCompareSnapshotURLs);
    for (const compareReportKey of compareReportKeys) {
      const compareDaySnapshotURL = mapCompareSnapshotURLs[compareReportKey];
      const compareGtfsRT_Snapshot = await this.dataService.fetchGTFS_RT_Snapshot(compareDaySnapshotURL);
      await this.loadGTFS_Data(compareGtfsRT_Snapshot.header.feedVersion);
      this.parseGTFS_RT(compareGtfsRT_Snapshot, compareReportKey);
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

  private async loadGTFS_Data(feedVersion: string) {
    if (feedVersion in this.mapGTFS_RouteAgency) {
      // poor's man cache - return if already computed
      return;
    }

    this.mapGTFS_RouteAgency[feedVersion] = {};

    const gtfsDay = ReportHelpers.parseGTFS_feedVersionAsGTFS_Day(feedVersion);

    const gtfsAgencyData = await this.dataService.fetchGTFS_Agency(gtfsDay);
    const gtfsRoutesData = await this.dataService.fetchGTFS_Routes(gtfsDay);

    const mapAgency: Record<string, AgencyJSON> = {};
    gtfsAgencyData.rows.forEach(row => {
      mapAgency[row.agency_id] = row;
    });

    gtfsRoutesData.rows.forEach(row => {
      const routeId = row.route_id;
      const agency = mapAgency[row.agency_id] ?? null;
      if (agency === null) {
        throw new Error('Cant find agency: ' + row.agency_id);
      }

      const routeGTFS_Data: RouteGTFS_Data = {
        routeId: routeId,
        agency: agency,
        route: row,
      };

      this.mapGTFS_RouteAgency[feedVersion][routeId] = routeGTFS_Data;
    });
  }

  private parseGTFS_RT(gtfsRT: Response_GTFS_RT, reportKey: string) {
    const mapGTFS_Routes = this.mapGTFS_RouteAgency[gtfsRT.header.feedVersion] ?? null;
    if (mapGTFS_Routes === null) {
      throw new Error('No lookups for feedVersion: ' + gtfsRT.header.feedVersion);
    }

    this.mapDaysData[reportKey] = {};

    const gtfsRT_Date = new Date(gtfsRT.header.timestamp * 1000);

    gtfsRT.entity.forEach(entity => {
      const routeId = entity.tripUpdate?.trip?.routeId ?? null;
      if (routeId === null) {
        console.log('ERROR: - entity with null routeId');
        console.log(entity);
        return;
      }

      const startDateS = entity.tripUpdate?.trip?.startDate ?? null;
      const startTimeS = entity.tripUpdate?.trip?.startTime ?? null;
      if ((startDateS === null) || (startTimeS === null)) {
        console.log('ERROR: - entity with null startDate/startTime');
        console.log(entity);
        return;
      }

      let tripStartDate: Date | null = null;

      try {
        const startDateF = startDateS.substring(0, 4) + '-' + startDateS.substring(4, 6) + '-' + startDateS.substring(6, 8);
        const tripStartDateF = startDateF + ' ' + startTimeS;
        tripStartDate = new Date(tripStartDateF);
      } catch (error) {
        console.log('ERROR: - cant parse trip startDate/startTime');
        console.log(entity);
        console.log(error);
        return;
      }

      if (tripStartDate === null) {
        console.log('ERROR: - cant parse trip startDate/startTime');
        console.log(entity);
        return;
      }

      if (tripStartDate > gtfsRT_Date) {
        return;
      }

      const routeGTFS_Data = mapGTFS_Routes[routeId] ?? null;

      const agencyId: string = (() => {
        if (routeId.startsWith('ojp:')) {
          return 'ojp';
        }

        if (routeId.startsWith('atv:')) {
          return 'atv';
        }
        
        if (routeGTFS_Data === null) {
          // console.log('ERROR: cant find route/agency for item');
          // console.log(entity);
          return 'NO_AGENCY';
        }

        return routeGTFS_Data.agency.agency_id;
      })();

      if (!(agencyId in this.mapDaysData[reportKey])) {
        const agencyJSON: AgencyJSON = (() => {
          if (routeGTFS_Data) {
            return routeGTFS_Data.agency;
          }

          const fakeAgency: AgencyJSON = {
            agency_id: agencyId,
            agency_name: '',
            agency_url: '',
            agency_phone: '',
            agency_timezone: '',
            agency_lang: '',
          };

          return fakeAgency;
        })();

        this.mapDaysData[reportKey][agencyId] = {
          id: agencyId,
          agencyJSON: agencyJSON,
          activeItemsTotal: 0,
          byRouteShortName: {},
        };
        
        if (routeGTFS_Data) {
          this.mapDaysData[reportKey][agencyId].agencyJSON = routeGTFS_Data.agency;
        }
      }

      this.mapDaysData[reportKey][agencyId].activeItemsTotal += 1;

      const routeShortName: string = (() => {
        if (routeGTFS_Data === null) {
          return 'NO_ROUTE';
        }

        const routeShortName = routeGTFS_Data.route.route_short_name;

        return routeShortName;
      })();
      if (!(routeShortName in this.mapDaysData[reportKey][agencyId].byRouteShortName)) {
        this.mapDaysData[reportKey][agencyId].byRouteShortName[routeShortName] = 0;
      }
      this.mapDaysData[reportKey][agencyId].byRouteShortName[routeShortName] += 1;
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
