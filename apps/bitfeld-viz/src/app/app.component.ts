import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime } from 'rxjs';

interface DatasetInfo {
  id: string,
  caption: string,
  startDateS: string,
  endDateS: string,
}

type MapMonthDayBits = Record<string, Record<string, boolean>>
type DayCellClassName = 'enabled' | 'disabled' | 'not_available'

interface DayCell {
  caption: number | ''
  className: DayCellClassName
}

interface MonthDayCellsModel {
  caption: string,
  cells: DayCell[][]
}

const EMPTY_DAY_CELL: DayCell = {
  caption: '',
  className: 'not_available',
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
'July', 'August', 'September', 'October', 'November', 'December'];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'bitfeld-viz';
  bitfeldData = new FormControl('');
  bitfeldDataset = new FormControl('');

  bitfeldBitsData: string[] = []
  bitfeldBitsS: string = ''
  
  monthsModel: MonthDayCellsModel[] = []

  appDatasets: DatasetInfo[] = [
    {
      id: 'fahrplan_2022',
      caption: 'Fahrplan 2022',
      startDateS: '2021-12-12',
      endDateS: '2022-12-10',
    },
    {
      id: 'fahrplan_2023',
      caption: 'Fahrplan 2023',
      startDateS: '2022-12-11',
      endDateS: '2023-12-09',
    },
    {
      id: 'fahrplan_2024',
      caption: 'Fahrplan 2024',
      startDateS: '2023-12-10',
      endDateS: '2024-12-14',
    },
    {
      id: 'fahrplan_2025',
      caption: 'Fahrplan 2025',
      startDateS: '2024-12-15',
      endDateS: '2025-12-13',
    },
    {
      id: 'fahrplan_2026',
      caption: 'Fahrplan 2026',
      startDateS: '2025-12-14',
      endDateS: '2026-12-12',
    },
    {
      id: 'fahrplan_2027',
      caption: 'Fahrplan 2027',
      startDateS: '2026-12-13',
      endDateS: '2027-12-11',
    },
    {
      id: 'fahrplan_2028',
      caption: 'Fahrplan 2028',
      startDateS: '2027-12-12',
      endDateS: '2028-12-09',
    },
    {
      id: 'fahrplan_2029',
      caption: 'Fahrplan 2029',
      startDateS: '2028-12-10',
      endDateS: '2029-12-08',
    },
  ]

  constructor() {
    const queryParams = new URLSearchParams(document.location.search);
    
    const bitfeldData = queryParams.get('bitfeld') ?? 'DF3E1C39F3E7CF9F3E7CF9F3E7CF0F3E7CF9B3A7C79F3E7CF9F3E7CF9F3A7CF9F3E7CF9F3E7CF9F3E7CF9F3E7CF9F600';
    this.bitfeldData.setValue(bitfeldData.trim());

    const nowYMD = new Date().toISOString().slice(0, 10);
    const defaultDataset = this.appDatasets.find(appDataset => (appDataset.startDateS <= nowYMD && nowYMD <= appDataset.endDateS)) ?? this.appDatasets[this.appDatasets.length - 1];

    const bitfeldDataset = queryParams.get('dataset') ?? defaultDataset.id;
    this.bitfeldDataset.setValue(bitfeldDataset.trim());
  }
  
  ngOnInit(): void {
    this.bitfeldData.valueChanges.pipe(debounceTime(300)).subscribe(value => {
      this.computeCalendarModel();
    });

    this.computeCalendarModel();
  }

  public computeCalendarModel() {
    const bitfeldData = this.bitfeldData.value
    if (bitfeldData === null) {
      return;
    }

    const appDataset = this.appDatasets.find(dataset => {
      return dataset.id === this.bitfeldDataset.value;
    });
    if (!appDataset) {
      return;
    }

    const mapMonthDayBits = this.parseYearBits(appDataset, bitfeldData);
    this.monthsModel = this.computeMonthsModel(mapMonthDayBits);
  }

  private parseYearBits(appDataset: DatasetInfo, bitfeldData: string): MapMonthDayBits {
    let bitfeldBitsS = 'n/a';

    const binaryRegex = /^[01]+$/;
    if (binaryRegex.test(bitfeldData)) {
      bitfeldBitsS = bitfeldData.trim();
    } else {
      // BITFELD type needs decoding
      bitfeldBitsS = BigInt('0x' + bitfeldData).toString(2).padStart(8, '0');
      bitfeldBitsS = bitfeldBitsS.substring(2);
    }

    console.log(bitfeldBitsS);
    
    const endDate = new Date(appDataset.endDateS);

    const mapMonthDayBits: MapMonthDayBits = {}

    let currentDate = new Date(appDataset.startDateS);
    let idx = 0;
    while(currentDate <= endDate) {
      const dateYMD = this.formatDay(currentDate, 'yyyy-mm-dd');
      const monthKey = dateYMD.substring(0, 7);
    
      if (!(monthKey in mapMonthDayBits)) {
        mapMonthDayBits[monthKey] = {};
      }

      const bitValueS = (bitfeldBitsS[idx] ?? '0');
      const monthDay = currentDate.getDate();
      mapMonthDayBits[monthKey][monthDay] = bitValueS === '1';
      
      // DEBUG
      // console.log(idx + ' ' + currentDate + ' --> ' +  dateYMD + '--' + monthDay + ' ' + bitValueS);
      
      currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
      idx += 1;
    }

    return mapMonthDayBits;
  }

  private formatDay(date: Date, type: 'yyyy-mm-dd') {
    if (type === 'yyyy-mm-dd') {
      const dateY = date.getFullYear();
      const dateM = date.getMonth() + 1;
      const dateD = date.getDay();

      const formattedDateParts = [
        '' + dateY,
        (dateM > 9 ? '' : '0') + dateM,
        (dateD > 9 ? '' : '0') + dateD,
      ];

      return formattedDateParts.join('-');
    }

    return date.toISOString();
  }

  private computeMonthsModel(mapMonthDayBits: MapMonthDayBits): MonthDayCellsModel[] {
    const monthsData = Object.keys(mapMonthDayBits).sort();
    const monthsModel: MonthDayCellsModel[] = [];

    monthsData.forEach(monthKey => {
      const monthYear = parseInt(monthKey.substring(0, 4));
      const monthNumber = parseInt(monthKey.substring(5, 7));
      const monthBits = mapMonthDayBits[monthKey];
      
      // the 2nd argument refers to the next month
      // 0 is the idx for the last day of the prev month
      const monthLastDay = new Date(monthYear, monthNumber, 0);
      const monthDaysNo = monthLastDay.getDate();
      const monthName = MONTH_NAMES[monthLastDay.getMonth()];

      const monthCells: DayCell[] = [];

      let monthDay = 1;
      while (monthDay <= monthDaysNo) {
        const dayDate = new Date(monthYear, monthNumber - 1, monthDay);
        
        if (monthDay === 1) {
          const dayWeekIdx = dayDate.getDay();
          const nullPadsNo = dayWeekIdx > 0 ? dayWeekIdx - 1 : 6;

          // console.log(monthKey + ' = ' + nullPadsNo);
          // if (monthKey === '2023-10') {
          //   console.log(monthBits);
          // }

          this.appendCells(monthCells, nullPadsNo, EMPTY_DAY_CELL);
        }

        const className: DayCellClassName = (() => {
          if (!(monthDay in monthBits)) {
            return 'not_available'
          }

          return monthBits[monthDay] ? 'enabled' : 'disabled'
        })()

        monthCells.push({
          caption: monthDay,
          className: className
        });
        
        monthDay += 1;
      }

      const restPaddingDaysNo = 7 - (monthCells.length % 7);
      if (restPaddingDaysNo < 7) {
        this.appendCells(monthCells, restPaddingDaysNo, EMPTY_DAY_CELL);
      }

      const monthWeekCells: DayCell[][] = [];
      const chunkSize = 7;
      for (let idx = 0; idx < monthCells.length; idx += chunkSize) {
        const weekCells = monthCells.slice(idx, idx + chunkSize);
        monthWeekCells.push(weekCells);
      }

      const monthData: MonthDayCellsModel = {
        caption: monthName + ' ' + monthLastDay.getFullYear(),
        cells: monthWeekCells
      }

      monthsModel.push(monthData);
    });

    console.log(mapMonthDayBits);
    console.log(monthsModel);

    return monthsModel;
  }

  private appendCells(cells: any[], cellsNo: number, cellValue: any) {
    let cellIdx = 1;
    while(cellIdx <= cellsNo) {
      cells.push(cellValue);
      
      cellIdx += 1;
    }
  }
}
