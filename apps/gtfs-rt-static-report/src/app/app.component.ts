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

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'gtfs-rt-static-report';

  constructor(private dataService: DataService) {

  }

  ngOnInit() {
    this.dataService.getMonthlyReport('2024-05').subscribe((response) => {
      const report = response as GTFS_RT_Static_Monthly_Report;
      console.log(report.comments);
    });
  }
}
