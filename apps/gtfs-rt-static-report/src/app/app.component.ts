import { Component } from '@angular/core';
import { DataService } from './data.service';

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
    this.dataService.getMonthlyReport('2024-03').subscribe((response) => {
      console.log(response);
    });
  }
}
