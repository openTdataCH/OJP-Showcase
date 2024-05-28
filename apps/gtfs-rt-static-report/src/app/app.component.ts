import { Component } from '@angular/core';
import { DataService } from './data.service';
import { DateHelpers } from './helpers/date-helpers';

interface GTFS_RT_Static_Monthly_Report_JSON {
  comments: string
  report_days: Record<string, Record<string, GTFS_RT_Static_Report_Metadata_JSON>>
}

interface DayCell {
  date: Date,
  dateF: string,
  isWeekend: boolean
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

type CellClassDB = 'odd' | 'even'

interface ReportCell {
  report: GTFS_RT_Static_Report_Metadata_JSON | null
  className: string
  cellValue: string
  error: string | null
  dayCell: DayCell,
  hourCell: HourCell,
}

interface PageModel {
  reportJSON: GTFS_RT_Static_Monthly_Report_JSON | null
  monthItems: string[],
  selectedMonth: string,
  monthlyHoursReport: ReportCell[][],
  selectedReportCell: ReportCell | null,
  dayCells: DayCell[],
  hourCells: HourCell[],
  reportValueLookups: ReportValueLookup[],
  selectedReportValueLookup: ReportValueLookup
}

const mapReportValueLookups: Record<ReportValueLookupType, string> = {
  gtfs_db_age: 'GTFS-DB Age',
  gtfs_rt_age: 'GTFS-RT Age',
  total_rows_no: 'GTFS-RT Trips',
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

const hourCells: HourCell[] = (() => {
  const cells: HourCell[] = [];

  let hour = 0;
  while (hour <= 23) {
    const hourF = hour.toString().padStart(2, '0');

    const cell: HourCell = {
      hour: hour,
      hourF: hourF,
    };
    cells.push(cell);

    hour += 1;
  }

  return cells;
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
      reportJSON: null,
      monthItems: monthItems,
      selectedMonth: monthItems[0],
      monthlyHoursReport: [],
      selectedReportCell: null,
      dayCells: [],
      hourCells: hourCells,
      reportValueLookups: reportValueLookups,
      selectedReportValueLookup: reportValueLookups[0],
    }
  }

  ngOnInit() {
    this.fetchAndUpdateReport();
  }

  private fetchAndUpdateReport() {
    this.dataService.getMonthlyReport(this.model.selectedMonth).subscribe((response) => {
      const report = response as GTFS_RT_Static_Monthly_Report_JSON;
      this.updateReportModel(report);
    });
  }

  public onMonthSelectChange() {
    this.fetchAndUpdateReport();
  }

  private updateReportModel(report: GTFS_RT_Static_Monthly_Report_JSON) {
    const currentDateParts = this.model.selectedMonth.split('-');
    const currentDateYear = Number(currentDateParts[0]);
    const currentDateMonth = Number(currentDateParts[1]);

    const currentDate = new Date(this.model.selectedMonth + '-01');
    const selectedMonthDaysNo = DateHelpers.computeMonthDaysNo(currentDate);

    const dayHoursReport: DayHoursReport = [];
    const dayCells: DayCell[] = [];

    let currentDay = 1;
    while (currentDay <= selectedMonthDaysNo) {
      const dayF = currentDay.toString().padStart(2, '0');

      const hourReportRows: HoursReport = [];
      const mapHourlyReports = report.report_days[dayF] ?? null;

      let currentHr = 0;
      while (currentHr <= 23) {
        if (mapHourlyReports === null) {
          hourReportRows.push(null);
        } else {
          const hrF = currentHr.toString().padStart(2, '0');
          const hrMinF = hrF + '00';

          const hourReport = mapHourlyReports[hrMinF] ?? null;
          hourReportRows.push(hourReport);
        }

        currentHr += 1;
      }

      dayHoursReport.push(hourReportRows);

      const currentDayDate = new Date(currentDateYear, currentDateMonth - 1, currentDay);
      let currentDayF = currentDayDate.toLocaleDateString('en-US', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      });
      currentDayF = currentDayF.replace(',', '');
      const currentDayFParts = currentDayF.split(' ');
      currentDayF = currentDayFParts[0] + ' ' + currentDayFParts[2] + '.' + currentDayFParts[1].replace(',', '');
      const isWeekend = ['Sat', 'Sun'].includes(currentDayFParts[0]);

      const dayCell: DayCell = {
        date: currentDayDate,
        dateF: currentDayF,
        isWeekend: isWeekend,
      }

      dayCells.push(dayCell);

      currentDay += 1;
    }

    this.model.dayHoursReport = dayHoursReport;
    this.model.dayCells = dayCells;

    let nowDayIdx = 0;
    // use current day for current month
    if (DateHelpers.isSameMonth(currentDate)) {
      const nowDay = new Date().getDate();
      nowDayIdx = nowDay - 1;
    }

    const hourReportRows = dayHoursReport[nowDayIdx] ?? null;
    if (hourReportRows === null) {
      this.model.currentReport = null;
    } else {
      // Find last non-null report hour
      for (let idx = hourReportRows.length - 1; idx >= 0; idx--) {
        if (hourReportRows[idx] !== null) {
          this.model.currentReport = hourReportRows[idx];
          break;
        }
      }
    }

    console.log(this.model);
  }
}
