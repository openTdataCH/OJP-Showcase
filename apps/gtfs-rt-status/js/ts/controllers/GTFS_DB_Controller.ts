import Progress_Controller from './Progress_Controller'
import { Date_Helpers } from './../helpers/Date_Helpers' 
import GTFS_RT_Reporter from './GTFS_RT_Reporter';

export default class GTFS_DB_Controller {
    public progress_controller: Progress_Controller | null = null;
    public gtfs_rt_reporter: GTFS_RT_Reporter | null = null;

    private gtfs_query_btn: HTMLButtonElement;

    private query_request_day_el: HTMLInputElement;
    private query_request_time_el: HTMLInputElement;
    private query_interval_from_time_el: HTMLInputElement;
    private query_interval_to_time_el: HTMLInputElement;

    private request_datetime = new Date();

    private is_dev = false;
    private use_mocked_data = false;
    private use_filtered_lookup = false;

    constructor() {
        this.is_dev = location.hostname === 'localhost';
        if (this.is_dev) {
            this.use_mocked_data = true;
            this.use_filtered_lookup = true;
            this.use_mocked_data = false;
            this.use_filtered_lookup = false;
        } else {
            this.use_mocked_data = false;
            this.use_filtered_lookup = false;
        }

        this.gtfs_query_btn = document.getElementById('gtfs_query_btn') as HTMLButtonElement;
        this.gtfs_query_btn.addEventListener('click', () => {
            this.handle_gtfs_query_btn_click();
        });

        this.query_request_day_el = document.getElementById('request-day') as HTMLInputElement;
        this.query_request_time_el = document.getElementById('request-time') as HTMLInputElement;
        this.query_interval_from_time_el = document.getElementById('interval-from-time') as HTMLInputElement;
        this.query_interval_to_time_el = document.getElementById('interval-to-time') as HTMLInputElement;

        this.gtfs_query_btn.disabled = true;

        this.update_request_time();
    }

    private update_query_inputs() {
        const now_date = this.request_datetime;

        const date_f = Date_Helpers.formatDateYMDHIS(now_date);

        // - 30min
        const from_date = new Date(now_date.getTime() + (-30) * 60 * 1000);
        const from_date_f = Date_Helpers.formatDateYMDHIS(from_date);

        // + 3hours
        const to_date = new Date(now_date.getTime() + (3 * 60) * 60 * 1000);
        const to_date_f = Date_Helpers.formatDateYMDHIS(to_date);

        this.query_request_day_el.value = date_f.substring(0, 10);
        this.query_request_time_el.value = date_f.substring(11, 16);
        this.query_interval_from_time_el.value = from_date_f.substring(11, 16);
        this.query_interval_to_time_el.value = to_date_f.substring(11, 16);
    }

    public load_resources(completion: () => void) {
        this.progress_controller?.setBusy('Loading Resources...');

        let gtfsDBDay = new Date();
        
        const gtfs_db_day_s = this.computeGTFS_DB_Day(gtfsDBDay);
        
        let gtfs_db_snapshot_base = 'https://opentdatach.github.io/assets-gtfs-static-snapshot';
        gtfs_db_snapshot_base += '/gtfs_' + gtfs_db_day_s;
        
        const gtfs_db_lookups_url = gtfs_db_snapshot_base + '/db_lookups.json';
        
        const request_day_s = this.query_request_day_el.value;
        let gtfs_db_trips_url = gtfs_db_snapshot_base + '/trips_' + request_day_s + '.json';
        if (this.use_filtered_lookup) {
            console.log('WARNING - using filtered lookup');
            gtfs_db_trips_url = gtfs_db_snapshot_base + '-FILTER/trips_' + request_day_s + '.json';
        }

        const resource_files = [
            gtfs_db_lookups_url,
            gtfs_db_trips_url,
        ]

        Promise.all(resource_files.map( resource_file => fetch(resource_file))).then(responses =>
            Promise.all(responses.map(response => response.json()))
        ).then(data_responses => {
            this.gtfs_rt_reporter?.setRequestDatetime(this.request_datetime);

            const data_response_lookups = data_responses[0];
            this.gtfs_rt_reporter?.loadAgency(data_response_lookups.agency);
            this.gtfs_rt_reporter?.loadStops(data_response_lookups.stops);
            this.gtfs_rt_reporter?.loadRoutes(data_response_lookups.routes);

            this.gtfs_rt_reporter?.loadTrips(data_responses[1]);

            this.gtfs_query_btn.disabled = false;
            this.progress_controller?.setIdle();
            completion();
        }).catch( error => {
            this.progress_controller?.setError('ERROR loading resources');
        });
    }

    private computeGTFS_DB_Day(date: Date) {
        // Wednesday (weekIdx 3) is the change
        const datasetWeekdayIDChange = 3;
        // Change time is at 14:00
        const datasetHoursChange = 14;

        let weekDayDiff = date.getDay() - datasetWeekdayIDChange;
        if (weekDayDiff < 0) {
            weekDayDiff += 7;
        }

        if (weekDayDiff === 0) {
            if (date.getHours() < datasetHoursChange) {
                weekDayDiff = 7;
            }
        }

        const newDate = new Date(date.getTime());
        newDate.setDate(date.getDate()-weekDayDiff);

        const newDateS = Date_Helpers.formatDateYMDHIS(newDate);

        return newDateS.substring(0, 10);
    }

    private update_request_time() {
        this.request_datetime = new Date();

        // Override - TEST
        if (this.use_mocked_data) {
            let m = "2021-05-26 17:50:33".split(/\D/);
            this.request_datetime = new Date(+m[0], +m[1] - 1, +m[2], +m[3], +m[4], +m[5]);

            console.log('WARNING - using mocked data');
            console.log('-- date ' + this.request_datetime);
        }
        
        this.update_query_inputs();
    }

    private handle_gtfs_query_btn_click() {
        this.progress_controller?.setBusy('Fetching GTFS-RT ...');
        this.gtfs_query_btn.disabled = true;

        this.update_request_time();

        let gtfs_rt_url = 'https://www.webgis.ro/tmp/proxy-gtfsrt2020/gtfsrt2020';

        const gtfs_rt_promise = fetch(gtfs_rt_url);
        Promise.all([gtfs_rt_promise]).then(responses =>
            Promise.all(responses.map(response => response.json()))
        ).then(data_responses => {
            this.gtfs_query_btn.disabled = false;
            this.progress_controller?.setIdle();

            const gtfs_rt_response = data_responses[0];
            this.gtfs_rt_reporter?.setRequestDatetime(this.request_datetime);

            const request_interval_from_hhmm = this.query_interval_from_time_el.value;
            const request_interval_from_date = Date_Helpers.setHHMMToDate(this.request_datetime, request_interval_from_hhmm);

            const request_interval_to_hhmm = this.query_interval_to_time_el.value;
            
            let request_interval_to_date = Date_Helpers.setHHMMToDate(this.request_datetime, request_interval_to_hhmm);
            if (request_interval_to_date < request_interval_from_date) {
                request_interval_to_date.setDate(request_interval_to_date.getDate() + 1);
            }
            
            this.gtfs_rt_reporter?.loadGTFS_RT(gtfs_rt_response, request_interval_from_date, request_interval_to_date);
        });
    }
}