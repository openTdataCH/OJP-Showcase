import Progress_Controller from './Progress_Controller'
import Date_Helpers from '../_shared/helpers/date-helpers'
import { URL_Helpers } from '../helpers/URL_Helpers';
import GTFS_RT_Reporter from './GTFS_RT_Reporter';

export default class GTFS_DB_Controller {
    private gtfs_day: string;
    private report_datetime: Date

    public progress_controller: Progress_Controller | null = null;
    public gtfs_rt_reporter: GTFS_RT_Reporter | null = null;

    private gtfs_query_base_address: string;

    private gtfs_query_btn: HTMLButtonElement;

    private query_request_day_el: HTMLInputElement;
    private query_interval_from_time_el: HTMLInputElement;
    private query_interval_to_time_el: HTMLInputElement;

    constructor(gtfs_day: string, report_datetime: Date = new Date()) {
        this.gtfs_day = gtfs_day;
        this.report_datetime = report_datetime;
        
        this.gtfs_query_btn = document.getElementById('gtfs_query_btn') as HTMLButtonElement;
        this.gtfs_query_btn.addEventListener('click', () => {
            this.handle_gtfs_query_btn_click();
        });

        this.query_request_day_el = document.getElementById('request-day') as HTMLInputElement;
        this.query_interval_from_time_el = document.getElementById('interval-from-time') as HTMLInputElement;
        this.query_interval_to_time_el = document.getElementById('interval-to-time') as HTMLInputElement;

        this.gtfs_query_btn.disabled = true;

        this.gtfs_query_base_address = './api/gtfs-query'

        this.update_query_inputs();
    }

    private update_query_inputs() {
        const date_f = Date_Helpers.formatDateYMDHIS(this.report_datetime);

        // - 30min
        const from_date = new Date(this.report_datetime.getTime() + (-30) * 60 * 1000);
        const from_date_f = Date_Helpers.formatDateYMDHIS(from_date);

        // + 3hours
        const to_date = new Date(this.report_datetime.getTime() + (3 * 60) * 60 * 1000);
        const to_date_f = Date_Helpers.formatDateYMDHIS(to_date);

        this.query_request_day_el.value = date_f.substring(0, 10);

        const from_date_hhmm = from_date_f.substring(11, 16);
        this.query_interval_from_time_el.value = from_date_hhmm;

        let to_date_hhmm = to_date_f.substring(11, 16);
        if (to_date_hhmm < from_date_hhmm) {
            const day_hrs = parseInt(to_date_hhmm.substring(0, 2), 10) + 24
            const day_mins_f = to_date_hhmm.substring(3, 5);
            to_date_hhmm = day_hrs.toString() + ':' + day_mins_f;
        }
        this.query_interval_to_time_el.value = to_date_hhmm;
    }

    public async load_resources() {
        this.progress_controller?.setBusy('Loading Resources...');
        
        const promise = new Promise<void>(async (resolve, reject) => {
            const gtfs_query_lookups_qs_params = {
                gtfs_day: this.gtfs_day,
            };
            const gtfs_query_lookups_address = this.gtfs_query_base_address + '/db_lookups?' 
                + URL_Helpers.dict_to_querystring(gtfs_query_lookups_qs_params);
    
            const resource_files = [
                gtfs_query_lookups_address,
            ]
    
            Promise.all(resource_files.map( resource_file => fetch(resource_file))).then(responses =>
                Promise.all(responses.map(response => response.json()))
            ).then(data_responses => {
                const data_response_lookups = data_responses[0];
                this.gtfs_rt_reporter?.loadAgency(data_response_lookups.agency);
                this.gtfs_rt_reporter?.loadStops(data_response_lookups.stops);
                this.gtfs_rt_reporter?.loadRoutes(data_response_lookups.routes);
    
                this.gtfs_query_btn.disabled = false;
                this.progress_controller?.setIdle();
                resolve();
            }).catch( error => {
                this.progress_controller?.setError('ERROR loading resources');
                reject('ERROR loading resources');
            });
        });

        return promise;
    }

    private handle_gtfs_query_btn_click() {
        this.progress_controller?.setBusy('Fetching GTFS static / RT ...');
        this.gtfs_query_btn.disabled = true;

        let gtfs_rt_url = 'https://www.webgis.ro/tmp/proxy-gtfsrt2020/gtfsrt2020';
        const gtfs_query_active_trips_params = {
            gtfs_day: this.gtfs_day,
            day: this.query_request_day_el.value,
            from_hhmm: this.query_interval_from_time_el.value.replace(':', ''),
            to_hhmm: this.query_interval_to_time_el.value.replace(':', ''),
            filter_agency_ids: 'HAS_GTFS_RT',
        };
        const gtfs_query_active_trips_address = this.gtfs_query_base_address + '/query_day_from_to_trips?' 
            + URL_Helpers.dict_to_querystring(gtfs_query_active_trips_params);

        const gtfs_query_day_trips_params = {
            gtfs_day: this.gtfs_day,
            day: this.query_request_day_el.value,
        };
        const gtfs_query_day_trips_address = this.gtfs_query_base_address + '/query_day_trips?' 
            + URL_Helpers.dict_to_querystring(gtfs_query_day_trips_params);

        const resource_files = [
            gtfs_rt_url,
            gtfs_query_active_trips_address,
            gtfs_query_day_trips_address,
        ]

        Promise.all(resource_files.map( resource_file => fetch(resource_file))).then(responses =>
            Promise.all(responses.map(response => response.json()))
        ).then(data_responses => {
            this.gtfs_query_btn.disabled = false;
            this.progress_controller?.setIdle();

            const gtfs_rt_response = data_responses[0];

            const data_response_active_trips = data_responses[1];
            this.gtfs_rt_reporter?.loadActiveTrips(data_response_active_trips.rows);

            const data_response_day_trips = data_responses[2];
            this.gtfs_rt_reporter?.loadDayTrips(data_response_day_trips.rows);

            const requestDay = new Date(this.query_request_day_el.value + ' 00:00:00');

            const request_interval_from_hhmm = this.query_interval_from_time_el.value;
            const request_interval_from_date = Date_Helpers.setHHMMToDate(requestDay, request_interval_from_hhmm);

            const request_interval_to_hhmm = this.query_interval_to_time_el.value;
            let request_interval_to_date = Date_Helpers.setHHMMToDate(requestDay, request_interval_to_hhmm);
            if (request_interval_to_date < request_interval_from_date) {
                request_interval_to_date.setDate(request_interval_to_date.getDate() + 1);
            }
            
            this.gtfs_rt_reporter?.loadGTFS_RT(gtfs_rt_response, request_interval_from_date, request_interval_to_date);

            this.gtfs_rt_reporter?.updateReport();
        });
    }
}
