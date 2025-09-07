import { Component } from '@angular/core';
import { DataService } from './data.service';
import { DateHelpers } from './helpers/date-helpers';

interface DayCell {
  date: Date,
  dayF: string,
  dateF: string,
  isSunday: boolean
}

interface HourCell {
  hour: number,
  hourF: string
}

type ReportValueLookupType = 'gtfs_db_age' | 'gtfs_rt_age' | 'total_rows_no' | 'tripOK_routeOK_no' | 'tripOK_routeNOK_no' | 'tripNOK_routeOK_no' | 'tripNOK_routeNOK_no' | 'tripNOK_NOJP_no'

interface ReportValueLookup {
  type: ReportValueLookupType,
  caption: string
}

interface GTFS_RT_Static_Report_Metadata_JSON {
  report_dt: string
  gtfs_db_filename: string
  gtfs_db_age: number
  gtfs_rt_filename: string
  gtfs_rt_ts: number
  gtfs_rt_dt: string
  gtfs_rt_age: number
  total_rows_no: number
  tripOK_routeOK_no: number
  tripOK_routeNOK_no: number
  tripNOK_routeOK_no: number
  tripNOK_routeNOK_no: number
  tripNOK_NOJP_no: number
}

interface GTFS_RT_Static_Report_Compare_JSON {
  compare_type: 'h' | 'w' | 'w_p'
  map_days: Record<string, number>
  mean_value: Number
  drop_line: Number
}

export interface GTFS_RT_Static_Monthly_Report_JSON {
  last_update_dt: string
  comments: string
  report_days: Record<string, Record<string, GTFS_RT_Static_Report_Metadata_JSON>>
  compare_days: Record<string, Record<string, GTFS_RT_Static_Report_Compare_JSON>>
}

type CellClassDB = 'odd' | 'even';

interface GTFS_RT_StaticReportCompareMetadata {
  info: GTFS_RT_Static_Report_Compare_JSON
  reportLines: string[]
  valueF: string
  meanValueF: string
  dropLineF: string
}

interface ReportCell {
  key: string
  report: GTFS_RT_Static_Report_Metadata_JSON | null
  className: string
  cellValue: string
  error: string | null
  dayCell: DayCell,
  hourCell: HourCell,
  compareMetadata: GTFS_RT_StaticReportCompareMetadata | null,
}

interface PageModel {
  mapMonthlyReports: Record<string, GTFS_RT_Static_Monthly_Report_JSON>
  monthItems: string[],
  selectedMonth: string,
  hourlyReportCells: ReportCell[][],
  selectedReportCell: ReportCell | null,
  dayCells: DayCell[],
  hourCells: HourCell[],
  reportValueLookups: ReportValueLookup[],
  selectedReportValueLookup: ReportValueLookup,
  appVersion: string,
  showAllHours: boolean,
  reportLastUpdateF: string,
}

const mapReportValueLookups: Record<ReportValueLookupType, string> = {
  gtfs_db_age: 'GTFS-DB Age',
  gtfs_rt_age: 'GTFS-RT Age',
  total_rows_no: 'GTFS-RT Total Trips No',
  tripOK_routeOK_no: 'Matched Trips',
  tripOK_routeNOK_no: 'Matched Trips / Not-matched Routes',
  tripNOK_routeOK_no: 'Not-matched Trips / Matched Routes',
  tripNOK_routeNOK_no: 'Not-matched Trips / Not-matched Routes',
  tripNOK_NOJP_no: 'Not-matched Trips without ojp: prefix',
}

const reportValueLookups = (() => {
  const lookups: ReportValueLookup[] = [];

  const reportValueLookupTypes: ReportValueLookupType[] = ['total_rows_no', 'gtfs_db_age', 'gtfs_rt_age', 'tripOK_routeOK_no', 'tripOK_routeNOK_no', 'tripNOK_routeOK_no', 'tripNOK_routeNOK_no', 'tripNOK_NOJP_no'];

  reportValueLookupTypes.forEach(reportValueLookupType => {
    const lookup: ReportValueLookup = {
      type: reportValueLookupType,
      caption: mapReportValueLookups[reportValueLookupType]
    }
    lookups.push(lookup);
  });

  return lookups;
})();

const monthItems: string[] = (() => {
  const startMonthS = '2024-01';

  const startMoParts = startMonthS.split('-');
  const startY = Number(startMoParts[0]);
  const startM = Number(startMoParts[1]);
  const startDay = new Date(startY, startM - 1);

  const now = new Date();
  now.setDate(1);

  const items: string[] = [];
  
  while (startDay <= now) {
    const yearF = startDay.getFullYear();
    const monthF = (startDay.getMonth() + 1).toString().padStart(2, '0');
    items.push(yearF + '-' + monthF);

    if (items.length > 100) {
      // prevent long loops
      break;
    }

    startDay.setMonth(startDay.getMonth() + 1);
  }

  return items.slice().reverse();
})();

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  public model: PageModel;

  constructor(private dataService: DataService) {
    this.model = {
      mapMonthlyReports: {},
      monthItems: monthItems,
      selectedMonth: monthItems[0],
      hourlyReportCells: [],
      selectedReportCell: null,
      dayCells: [],
      hourCells: [],
      reportValueLookups: reportValueLookups,
      selectedReportValueLookup: reportValueLookups[0],
      appVersion: '2024-06-03-1'
      showAllHours: false,
      reportLastUpdateF: 'n/a',
    this.updateHourCells();


  async ngOnInit(): Promise<void> {
    await this.fetchAndUpdateReport();
    
    // HACK setTimeout with 0, otherwise doesnt scroll, the scroll scrollContainer is not ready
    setTimeout(() => {
      this.updateSelectionByDayHr();
    }, 0);
  }

  private updateHourCells() {
    const cells: HourCell[] = [];

    let hour = 0;
    while (hour <= 23) {
      const hourF = hour.toString().padStart(2, '0');

      const cell: HourCell = {
        hour: hour,
        hourF: hourF,
      };
      if (this.shouldShowHour(hour)) {
        cells.push(cell);
      }

      hour += 1;
    }

    this.model.hourCells = cells;
  }

  private async fetchAndUpdateReport() {
    this.model.mapMonthlyReports = {};

    const prevMonthF: string = (() => {
      const monthParts = this.model.selectedMonth.split('-');
      let prevYear = Number(monthParts[0]);
      let prevMonth = Number(monthParts[1]) - 1;
      if (prevMonth === 0) {
        prevYear -= 1;
        prevMonth = 12;
      }

      const prevYearF = String(prevYear).padStart(2, '0');
      const prevMonthF = String(prevMonth).padStart(2, '0');

      return prevYearF + '-' + prevMonthF;
    })();

    const prevMonthReport = await this.dataService.getMonthlyReport(prevMonthF);
    this.model.mapMonthlyReports[prevMonthF] = prevMonthReport

    const currentMonthReport = await this.dataService.getMonthlyReport(this.model.selectedMonth);
    this.model.mapMonthlyReports[this.model.selectedMonth] = currentMonthReport;

    this.updateReportModel();
  }

  public async onMonthSelectChange() {
    await this.fetchAndUpdateReport();
  }

  }

  public onReportValueTypeChange() {
    this.updateReportModel();
  }

  private updateReportModel() {
    const latestReport = this.model.mapMonthlyReports[this.model.selectedMonth] ?? null;

    if (latestReport === null) {
      return;
    }

    const reportLastUpdate = new Date(latestReport.last_update_dt);
    this.model.reportLastUpdateF = latestReport.last_update_dt;

    const dayReportCells: ReportCell[][] = [];
    const dayCells: DayCell[] = [];

    let classDBSource: CellClassDB = 'odd';
    let prevDBName: string | null = null;

    for (const reportYM in this.model.mapMonthlyReports) {
      const report = this.model.mapMonthlyReports[reportYM];

      const monthDay1Date = new Date(reportYM + '-01');
      const selectedMonthDaysNo = DateHelpers.computeMonthDaysNo(monthDay1Date);

      const reportYMParts = reportYM.split('-');
      const reportYearF = Number(reportYMParts[0]);
      const reportMonthF = Number(reportYMParts[1]);

      let currentDay = 1;
      while (currentDay <= selectedMonthDaysNo) {
        const dayF = currentDay.toString().padStart(2, '0');

        const dayCell: DayCell = (() => {
          const currentDayDate = new Date(reportYearF, reportMonthF - 1, currentDay);
          let currentDayF = currentDayDate.toLocaleDateString('en-US', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
          });
          currentDayF = currentDayF.replace(',', '');
          const currentDayFParts = currentDayF.split(' ');
          currentDayF = currentDayFParts[0] + ' ' + currentDayFParts[2] + '.' + currentDayFParts[1].replace(',', '');
          const isSunday = currentDayFParts[0] === 'Sun';

          return {
            date: currentDayDate,
            dayF: reportYM + '-' + dayF,
            dateF: currentDayF,
            isSunday: isSunday,
          }
        })();

        const hourReportCells: ReportCell[] = [];
        const mapDataHourlyReports = report.report_days[dayF] ?? null;

        this.model.hourCells.forEach(hourCell => {
          const key = dayCell.dayF + '-' + hourCell.hourF;

          const reportCell: ReportCell = {
            key: key,
            report: null,
            className: 'ok_empty',
            cellValue: '',
            error: null,
            dayCell: dayCell,
            hourCell: hourCell,
            compareMetadata: null,
          }

          const hasData: boolean = (() => {
            const reportCellDateS = reportYM + '-' + dayF + ' ' + hourCell.hourF + ':00:00';
            const reportCellDate = new Date(reportCellDateS);

            const isFuture = reportCellDate > reportLastUpdate;
            // Discard future event cells
            if (isFuture) {
              return false;
            }

            // Otherwise check if we have a report
            return mapDataHourlyReports !== null;
          })();

          if (hasData) {
            const hrMinF = hourCell.hourF + '00';
            const reportHR = mapDataHourlyReports[hrMinF] ?? null;
            if (reportHR === null) {
              if (prevDBName !== null) {
                reportCell.cellValue = 'n/a';
                reportCell.error = 'DATA';
              }
            } else {
              const reportAny = reportHR as any;
              const reportValue = reportAny[this.model.selectedReportValueLookup.type] ?? null;
              if (reportValue === null) {
                reportCell.cellValue = 'n/a'
              } else {
                reportCell.cellValue = reportValue.toLocaleString('de-CH');
              }
  
              if (Math.abs(reportHR.gtfs_rt_age) > 60) {
                reportCell.error = 'RT age';
              }

              if (reportHR.tripNOK_NOJP_no > 0) {
                reportCell.error = 'Match';
              }

              if (prevDBName !== null && (prevDBName !== reportHR.gtfs_db_filename)) {
                classDBSource = classDBSource === 'odd' ? 'even' : 'odd';
              }
              prevDBName = reportHR.gtfs_db_filename;

              reportCell.className = 'ok_' + classDBSource;
            }
            
            reportCell.report = reportHR;
          }

          if (this.shouldShowHour(hourCell.hour)) {
            hourReportCells.push(reportCell);
          }
        });

        dayReportCells.push(hourReportCells);

        dayCells.push(dayCell);

        currentDay += 1;
      }
    }

    this.model.hourlyReportCells = dayReportCells;
    this.model.dayCells = dayCells;

    this.model.selectedReportCell = (() => {
      const nowDayIdx = (() => {
        if (isSameMonth) {
          // use current day for current month
          const nowDay = new Date().getDate();
          return nowDay - 1;
        } else {
          // otherwise use first day of month
          return 0;
        }
      })();

      const hourReportRows = dayReportCells[nowDayIdx] ?? null;
      if (hourReportRows === null) {
        return null;
      }

      // filter for non-null reports
      const hourReportNotNullRows = hourReportRows.filter(el => el.report !== null);
      if (hourReportNotNullRows.length === 0) {
        return null;
      }

      const cellIndex = (() => {
        if (isSameMonth) {
          // for current month use latest report
          return hourReportNotNullRows.length - 1;
        }

        return 0;
      })();

      return hourReportNotNullRows[cellIndex];
    })();
  private shouldShowHour(hour: number) {
    if (this.model.showAllHours) {
      return true;
    }

    const isNormalHour = (6 <= hour) && (hour <=18);
    
    return isNormalHour;
  }

  private computeSnapshotURLFromTemplate(templateURL: string, metadata: GTFS_RT_Static_Report_Metadata_JSON) {
    let url = templateURL;

    const timeMatches = metadata.gtfs_rt_filename.match(/-([0-9]{4})-([0-9]{2})-([0-9]{2})-([0-9]{4})/);
    if (timeMatches) {
      url = url.replaceAll('[YYYY]', timeMatches[1]);
      url = url.replaceAll('[MM]', timeMatches[2]);
      url = url.replaceAll('[DD]', timeMatches[3]);
      url = url.replaceAll('[HHMM]', timeMatches[4]);
    }

    return url;
  }

  public computeReportURL() {
    const metadata = this.model.selectedReportCell?.report ?? null;
    if (metadata === null) {
      return '';
    }

    const templateURL = 'https://tools.odpch.ch/gtfs-rt-static-compare-report/[YYYY]/[MM]/[DD]/gtfs_rt_static_report-[YYYY]-[MM]-[DD]-[HHMM].json';
    const url = this.computeSnapshotURLFromTemplate(templateURL, metadata);

    return url;
  }

  public computeGTFS_RT_URL(metadata: GTFS_RT_Static_Report_Metadata_JSON | null) {
    if (metadata === null) {
      return '';
    }

    const templateURL = 'https://tools.odpch.ch/gtfs-rt-snapshot/[YYYY]/[MM]/[DD]/' + metadata.gtfs_rt_filename;
    const url = this.computeSnapshotURLFromTemplate(templateURL, metadata);

    return url;
  }

  public computeDetailLookupCaption(key: ReportValueLookupType) {
    const caption = mapReportValueLookups[key] ?? null;

    return caption;
  }

  public computeDetailLookupValue(key: string) {
    const metadata = this.model.selectedReportCell?.report ?? null;
    if (metadata === null) {
      return '';
    }

    const reportAny = metadata as any;
    const reportValue = reportAny[key] ?? null;
    if (typeof reportValue === 'number' && isFinite(reportValue)) {
      return reportValue.toLocaleString('de-CH');
    }

    return reportValue;
  }

  public computeDetailReportURL() {
    const metadata = this.model.selectedReportCell?.report ?? null;
    if (metadata === null) {
      return '';
    }

    const url = 'https://tools.odpch.ch/gtfs-rt-status/?report=' + metadata.gtfs_rt_filename;

    return url;
  }
}
