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

interface GTFS_RT_Static_Report_Metadata_JSON {
  report_dt: String
  gtfs_db_filename: String
  gtfs_db_age: String
  gtfs_rt_filename: String
  gtfs_rt_ts: Number
  gtfs_rt_dt: String
  gtfs_rt_age: Number
  total_rows_no: Number
  tripOK_routeOK_no: Number
  tripOK_routeNOK_no: Number
  tripNOK_routeOK_no: Number
  tripNOK_routeNOK_no: Number
  tripNOK_NOJP_no: Number
}

type HoursReport = (GTFS_RT_Static_Report_Metadata_JSON | null)[];
type DayHoursReport = HoursReport[];

interface PageModel {
  monthItems: string[],
  selectedMonth: string,
  dayHoursReport: DayHoursReport,
  currentReport: GTFS_RT_Static_Report_Metadata_JSON | null,
  dayCells: DayCell[],
}

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
      monthItems: monthItems,
      selectedMonth: monthItems[0],
      dayHoursReport: [],
      currentReport: null,
      dayCells: []
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
