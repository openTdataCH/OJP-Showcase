import { Component } from '@angular/core';
import { DataService } from './data.service';

interface GTFS_RT_Static_Monthly_Report {
  comments: string
  report_days: Record<string, Record<string, GTFS_RT_Static_Report_Metadata>>
}
interface GTFS_RT_Static_Report_Metadata {
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

interface PageModel {
  monthItems: string[],
  selectedMonth: string,
}

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
    }
  }

  ngOnInit() {
    this.updateReport();
  }

  private updateReport() {
    this.dataService.getMonthlyReport(this.model.selectedMonth).subscribe((response) => {
      const report = response as GTFS_RT_Static_Monthly_Report;
      console.log(report);
    });
  }

  public onMonthSelectChange() {
    this.updateReport();
  }
}
