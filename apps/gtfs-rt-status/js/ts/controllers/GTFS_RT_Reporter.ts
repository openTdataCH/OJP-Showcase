import Date_Helpers from '../_shared/helpers/date-helpers';
import { URL_Helpers } from '../helpers/URL_Helpers';
import { DOM_Helpers } from '../helpers/DOM_Helpers';

import { Response_GTFS_Lookup } from '../models/response_gtfs_lookup';
import { Response_GTFS_RT_Entity } from '../_shared/types/gtfs-rt/entity'
import { Response_GTFS_RT } from '../_shared/types/gtfs-rt/gtfs-rt-response'
import { StopTimeUpdate } from '../_shared/types/gtfs-rt/gtfs-rt'
import { Trip, TripLight } from '../_shared/models/gtfs/trip';
import { AgencyJSON, RouteJSON, StopJSON, TripJSON } from '../_shared/types/gtfs/gtfs'

import { GTFS_Static_Trip_Condensed } from '../_shared/types/gtfs/trip-with-stops.interface';

import { GTFS_RT_Static_Report } from '../_shared/models/gtfs_rt_static_report'

import Agency from '../_shared/models/gtfs/agency';
import Calendar from '../_shared/models/gtfs/calendar';
import Route from '../_shared/models/gtfs/route';
import Stop from '../_shared/models/gtfs/stop';

import Progress_Controller from './Progress_Controller';

export default class GTFS_RT_Reporter {
    private progress_controller: Progress_Controller;
    private gtfs_day: string;
    private report_datetime;

    private gtfs_query_base_address: string;
    private gtfs_rt_url: string;

    private gtfs_query_btn: HTMLButtonElement;

    private gtfs_day_el: HTMLInputElement;
    private query_request_day_el: HTMLInputElement;
    private query_interval_from_time_el: HTMLInputElement;
    private query_interval_to_time_el: HTMLInputElement;

    private map_gtfs_rt_trips: Record<string, Response_GTFS_RT_Entity>
    
    private map_gtfs_active_trips: Record<string, GTFS_Static_Trip_Condensed>
    private trips_by_agency: Report_TripsByAgency[];
    private gtfs_trips_stats: GTFS_Static_Stats | null

    private map_gtfs_agency: Record<string, Agency>
    private map_gtfs_calendar: Record<string, Calendar>
    private map_gtfs_routes: Record<string, Route>
    private map_gtfs_stops: Record<string, Stop>
    private map_gtfs_day_trips: Record<string, TripLight>

    private map_html_templates: Record<string, string>;

    private wrapperGTFS_StaticReportElement: HTMLElement;
    private wrapperGTFS_RTReportElement: HTMLElement;

    constructor(progress_controller: Progress_Controller, gtfs_day: string, customReportFilename: string | null = null) {
        this.progress_controller = progress_controller;
        
        this.gtfs_day = gtfs_day;

        this.gtfs_query_base_address = 'https://tools.odpch.ch/gtfs-query';
        
        this.report_datetime = new Date();
        this.gtfs_rt_url = 'https://tools.odpch.ch/data/gtfs-rt/gtfs-rt-latest.json';

        if (customReportFilename !== null) {
            const reportDateTimeMatches = customReportFilename.match(/([0-9]{4})-([0-9]{2})-([0-9]{2})-([0-9]{2})([0-9]{2})/);
            if (reportDateTimeMatches !== null) {
                const reportYear = reportDateTimeMatches[1];
                const reportMonth = reportDateTimeMatches[2];
                const reportDay = reportDateTimeMatches[3];
                const reportHour = reportDateTimeMatches[4];
                const reportMin = reportDateTimeMatches[5];

                this.report_datetime = new Date(reportYear + '-' + reportMonth + '-' + reportDay + ' ' + reportHour + ':' + reportMin + ':00');
                let gtfs_rt_url = 'https://tools.odpch.ch/gtfs-rt-snapshot/[YYYY]/[MM]/[DD]/[GTFS_RT_FILENAME]';
                gtfs_rt_url = gtfs_rt_url.replace('[YYYY]', reportYear);
                gtfs_rt_url = gtfs_rt_url.replace('[MM]', reportMonth);
                gtfs_rt_url = gtfs_rt_url.replace('[DD]', reportDay);
                gtfs_rt_url = gtfs_rt_url.replace('[GTFS_RT_FILENAME]', customReportFilename);

                this.gtfs_rt_url = gtfs_rt_url;
            }
        }

        this.gtfs_query_btn = document.getElementById('gtfs_query_btn') as HTMLButtonElement;

        this.gtfs_day_el = document.getElementById('gtfs-day') as HTMLInputElement;
        this.query_request_day_el = document.getElementById('request-day') as HTMLInputElement;
        this.query_interval_from_time_el = document.getElementById('interval-from-time') as HTMLInputElement;
        this.query_interval_to_time_el = document.getElementById('interval-to-time') as HTMLInputElement;

        this.map_gtfs_rt_trips = {};
        this.map_gtfs_active_trips = {};

        this.trips_by_agency = [];
        this.gtfs_trips_stats = null;

        this.map_gtfs_agency = {};
        this.map_gtfs_calendar = {};
        this.map_gtfs_routes = {};
        this.map_gtfs_stops = {};
        this.map_gtfs_day_trips = {};

        this.wrapperGTFS_StaticReportElement = document.getElementById('content_wrapper') as HTMLElement;
        this.wrapperGTFS_RTReportElement = document.getElementById('hrdf_rt_wrapper') as HTMLElement;

        this.map_html_templates = {
            card_agency: (document.getElementById('template_agency') as HTMLElement).innerHTML,
            card_route: (document.getElementById('template_route_name') as HTMLElement).innerHTML,
            gtfs_rt_report: (document.getElementById('template_gtfs_rt_report') as HTMLElement).innerHTML,
            gtfs_static_report: (document.getElementById('template_gtfs_static_report') as HTMLElement).innerHTML,
        };

        this.initUI();
        this.addEventHandlers();
    }

    private initUI() {
        this.gtfs_query_btn.disabled = true;

        const date_f = Date_Helpers.formatDateYMDHIS(this.report_datetime);

        // - 30min
        const from_date = new Date(this.report_datetime.getTime() + (-30) * 60 * 1000);
        const from_date_f = Date_Helpers.formatDateYMDHIS(from_date);

        // + 3hours
        const to_date = new Date(this.report_datetime.getTime() + (3 * 60) * 60 * 1000);
        const to_date_f = Date_Helpers.formatDateYMDHIS(to_date);

        this.gtfs_day_el.value = this.gtfs_day;
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
                this.loadAgency(data_response_lookups.agency);
                this.loadStops(data_response_lookups.stops);
                this.loadRoutes(data_response_lookups.routes);
                resolve();
            }).catch( error => {
                this.progress_controller?.setError('ERROR loading resources');
                reject('ERROR loading resources');
            });
        });

        return promise;
    }

    public static async loadCustomReport(reportFilename: string) {
        const promise = new Promise<GTFS_RT_Static_Report | null>(async (resolve, reject) => {
            const reportDateTimeMatches = reportFilename.match(/([0-9]{4})-([0-9]{2})-([0-9]{2})-([0-9]{4})/);
            if (reportDateTimeMatches === null) {
                resolve(null);
                return;
            }

            const reportDateTime = reportDateTimeMatches[0];
            const reportY = reportDateTimeMatches[1];
            const reportM = reportDateTimeMatches[2];
            const reportD = reportDateTimeMatches[3];

            let url = 'https://tools.odpch.ch/gtfs-rt-static-compare-report/[YYYY]/[MM]/[DD]/gtfs_rt_static_report-[REPORT_DATETIME].json';
            url = url.replace('[YYYY]', reportY);
            url = url.replace('[MM]', reportM);
            url = url.replace('[DD]', reportD);
            url = url.replace('[REPORT_DATETIME]', reportDateTime);

            const responseJSON = await (await fetch(url)).json();

            const report = responseJSON as GTFS_RT_Static_Report;
            resolve(report);
        });

        return promise;
    }

    public setReady() {
        this.gtfs_query_btn.disabled = false;
        this.progress_controller?.setIdle();
    }

    private handle_gtfs_query_btn_click() {
        this.progress_controller?.setBusy('Fetching GTFS static / RT ...');
        this.gtfs_query_btn.disabled = true;

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
            this.gtfs_rt_url,
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
            this.loadActiveTrips(data_response_active_trips.rows);

            const data_response_day_trips = data_responses[2];
            this.loadDayTrips(data_response_day_trips.rows);

            const requestDay = new Date(this.query_request_day_el.value + ' 00:00:00');

            const request_interval_from_hhmm = this.query_interval_from_time_el.value;
            const request_interval_from_date = Date_Helpers.setHHMMToDate(requestDay, request_interval_from_hhmm);

            const request_interval_to_hhmm = this.query_interval_to_time_el.value;
            let request_interval_to_date = Date_Helpers.setHHMMToDate(requestDay, request_interval_to_hhmm);
            if (request_interval_to_date < request_interval_from_date) {
                request_interval_to_date.setDate(request_interval_to_date.getDate() + 1);
            }
            
            this.loadGTFS_RT(gtfs_rt_response, request_interval_from_date, request_interval_to_date);

            this.updateReport();
        });
    }

    private addEventHandlers() {
        this.gtfs_query_btn.addEventListener('click', () => {
            this.handle_gtfs_query_btn_click();
        });

        this.wrapperGTFS_StaticReportElement.addEventListener('click', (ev) => {
            const el = ev.target as HTMLElement;
            if (DOM_Helpers.hasClassName(el, 'toggle-all-trips-btn')) {
                const agency_row_idx_s = el.getAttribute('data-agency-idx') || null;
                const route_row_idx_s = el.getAttribute('data-route-idx') || null;

                if (agency_row_idx_s === null) {
                    return;
                }

                const agency_row_idx = parseInt(agency_row_idx_s);
                const agency_data = this.trips_by_agency[agency_row_idx];

                if (route_row_idx_s === null) {
                    agency_data.show_all_trips = !agency_data.show_all_trips;

                    agency_data.routes_data.forEach(route_data => {
                        route_data.show_all_trips = agency_data.show_all_trips;
                    });

                    const agency_html = this.computeAgencyHTML(agency_data);
                    const agency_el_id = 'agency_card_' + agency_row_idx_s;
                    const agency_el = document.getElementById(agency_el_id) as HTMLElement;

                    agency_el.outerHTML = agency_html;
                } else {
                    const route_row_idx = parseInt(route_row_idx_s);
                    const route_data = agency_data.routes_data[route_row_idx];
                    route_data.show_all_trips = !route_data.show_all_trips;

                    const route_html = this.computeRouteHTML(route_data, agency_data);
                    if (route_html === null) {
                        return
                    }

                    const route_el_id = 'route_card_' + agency_row_idx_s + '_' + route_row_idx_s;
                    const route_el = document.getElementById(route_el_id) as HTMLElement;
                    route_el.outerHTML = route_html;
                }
            }
        });
    }

    private loadAgency(response_json: Response_GTFS_Lookup) {
        this.map_gtfs_agency = {};

        const response_rows = response_json.rows as AgencyJSON[];
        response_rows.forEach(agencyJSON => {
            const agency = Agency.initFromAgencyJSON(agencyJSON)
            this.map_gtfs_agency[agency.agency_id] = agency;
        });
    }

    private loadRoutes(response_json: Response_GTFS_Lookup) {
        this.map_gtfs_routes = {};

        const response_rows = response_json.rows as RouteJSON[];
        response_rows.forEach(routeJSON => {
            const route = Route.initFromJSON(routeJSON, this.map_gtfs_agency);
            this.map_gtfs_routes[route.route_id] = route;
        });
    }

    private loadStops(response_json: Response_GTFS_Lookup) {
        this.map_gtfs_stops = {};

        const response_rows = response_json.rows as StopJSON[];
        response_rows.forEach(stopJSON => {
            const stop = Stop.initFromJSON(stopJSON)
            this.map_gtfs_stops[stop.stop_id] = stop;
        });
    }

    // active == day from/to trips
    private loadActiveTrips(response_json: GTFS_Static_Trip_Condensed[]) {
        this.map_gtfs_active_trips = {};

        response_json.forEach(trip_condensed => {
            this.map_gtfs_active_trips[trip_condensed.trip_id] = trip_condensed;
        });
    }

    private loadDayTrips(response_json: TripJSON[]) {
        this.map_gtfs_day_trips = {};

        response_json.forEach(tripJSON => {
            const trip = TripLight.initFromJSON(tripJSON, this.map_gtfs_routes, this.map_gtfs_calendar);
            this.map_gtfs_day_trips[trip.tripID] = trip;
        });
    }

    private loadGTFS_RT(response_gtfs_rt: Response_GTFS_RT, request_interval_from_date: Date, request_interval_to_date: Date) {
        this.map_gtfs_rt_trips = {};
        response_gtfs_rt.Entity.forEach(gtfs_rt_row => {
            const trip_id = gtfs_rt_row.TripUpdate?.Trip?.TripId;
            if (trip_id) {
                this.map_gtfs_rt_trips[trip_id] = gtfs_rt_row;
            } else {
                console.log('ERROR - cant find trip_id');
                console.log(gtfs_rt_row);
            }
        });

        this.computeActiveTrips(request_interval_from_date, request_interval_to_date);
    }

    private updateReport() {
        this.updateGTFS_RTReport();
        this.updateGTFS_StaticReport();
    }

    private computeActiveTrips(request_interval_from_date: Date, request_interval_to_date: Date) {
        const trip_day_midnight = Date_Helpers.setHHMMToDate(this.report_datetime, "00:00");

        let trips_finished_count = 0;

        let map_active_trips: Record<string, Record<string, Trip[]>> = {};
        for (const trip_id in this.map_gtfs_active_trips) {
            const condensed_trip_JSON = this.map_gtfs_active_trips[trip_id];
            const trip = Trip.initWithCondensedTrip(condensed_trip_JSON, this.map_gtfs_routes, this.map_gtfs_stops, this.map_gtfs_calendar, trip_day_midnight);
            
            const route = trip.route;
            const agency = route.agency;

            // Test the trip to be inside [-0.5h .. +3h]
            // This check is now(oct 2021) redundant, the trips are already filtered in the API.
            const is_active = trip.isActive(request_interval_from_date, request_interval_to_date);
            if (!is_active) {
                continue;
            }

            // Test the trip to finish after NOW
            const is_finished = trip.isFinished(this.report_datetime);
            if (is_finished) {
                trips_finished_count += 1;
                continue;
            }

            if (trip_id in this.map_gtfs_rt_trips) {
                trip.gtfsRT = this.map_gtfs_rt_trips[trip_id];
            } else {
                trip.gtfsRT = null;
            }

            if (!(agency.agency_id in map_active_trips)) {
                map_active_trips[agency.agency_id] = {};
            }

            if (!(route.route_short_name in map_active_trips[agency.agency_id])) {
                map_active_trips[agency.agency_id][route.route_short_name] = [];
            }

            map_active_trips[agency.agency_id][route.route_short_name].push(trip);
        }

        let missing_rt_trips_count = 0;

        let trips_by_agency: Report_TripsByAgency[] = [];
        for (const agency_id in map_active_trips) {
            const agency = this.map_gtfs_agency[agency_id];
            const agency_data = <Report_TripsByAgency>{
                agency_row_idx: -1,
                agency: agency,
                stats: <TripRT_Stats>{
                    rt_cno: 0,
                    active_missing_rt_cno: 0,
                    future_missing_rt_cno: 0
                },
                show_all_trips: false,
                routes_data: []
            }

            for (const route_short_name in map_active_trips[agency_id]) {
                const route_trips = map_active_trips[agency_id][route_short_name];
                const route_data = <TripsByRouteName>{
                    route_row_idx: -1,
                    routeName: route_short_name,
                    stats: <TripRT_Stats>{
                        rt_cno: 0,
                        active_missing_rt_cno: 0,
                        future_missing_rt_cno: 0
                    },
                    
                    show_all_trips: false,
                    trips: route_trips,
                }

                route_trips.forEach(trip => {
                    const has_rt = trip.gtfsRT !== null;
                    if (has_rt) {
                        route_data.stats.rt_cno += 1;
                        agency_data.stats.rt_cno += 1;
                    } else {
                        const is_in_future = trip.isInTheFuture(this.report_datetime);
                        if (is_in_future) {
                            route_data.stats.future_missing_rt_cno += 1;
                            agency_data.stats.future_missing_rt_cno += 1;
                        } else {
                            route_data.stats.active_missing_rt_cno += 1;
                            agency_data.stats.active_missing_rt_cno += 1;
                        }
                    }
                });

                agency_data.routes_data.push(route_data);
            }

            missing_rt_trips_count += agency_data.stats.active_missing_rt_cno;

            // Sort by route name
            agency_data.routes_data = agency_data.routes_data.sort((a, b) => a.stats.active_missing_rt_cno < b.stats.active_missing_rt_cno ? 1 : -1);

            trips_by_agency.push(agency_data);
        }

        // Sort by number of missing RTs and agency ID
        trips_by_agency = trips_by_agency.sort((a, b) => {
            let sortKeys: string[] = [];

            [a, b].forEach(c => {
                let cKey1 = '00000' + c.stats.active_missing_rt_cno;
                cKey1 = cKey1.substr(cKey1.length - 5, 5);

                let cKey2 = '00000' + c.agency.agency_id;
                cKey2 = cKey2.substr(cKey2.length - 5, 5);

                const sortKey = cKey1 + '-' + cKey2;
                sortKeys.push(sortKey);
            });

            return sortKeys[0] < sortKeys[1] ? 1 : -1;
        });

        // Inject ids
        trips_by_agency.forEach((agency_data, agency_row_idx) => {
            agency_data.agency_row_idx = agency_row_idx;

            agency_data.routes_data.forEach((route_data, route_row_idx) => {
                route_data.route_row_idx = route_row_idx;
            });
        })

        this.trips_by_agency = trips_by_agency;

        this.gtfs_trips_stats = {
            trips_count: Object.keys(this.map_gtfs_active_trips).length,
            trips_finished_count: trips_finished_count,
            agencies_count: trips_by_agency.length,
            missing_rt_trips_count: missing_rt_trips_count,
        };
    }

    private updateGTFS_RTReport() {
        const issuesMaxNo = 100;

        const gtfs_rt_trips_no = Object.keys(this.map_gtfs_rt_trips).length;

        let gtfsRT_ReportTRs: string[] = [];
        
        let mapMissingAgency: Record<string, Report_MissingAgency> = {};

        const mapGTFS_StaticAgencyIDs: Record<string, number> = {};
        this.trips_by_agency.forEach(agencyData => {
            mapGTFS_StaticAgencyIDs[agencyData.agency.agency_id] = 1;
        });

        // Promote non ojp: atv: TripIds 
        let tripIds = Object.keys(this.map_gtfs_rt_trips);
        const tripOJPIds = tripIds.filter(el => el.startsWith('ojp') || el.startsWith('atv'));
        const tripRestIds = tripIds.filter(el => !tripOJPIds.includes(el));
        tripIds = tripRestIds.concat(tripOJPIds);

        let gtfs_rt_issues_no = 0;
        tripIds.forEach(trip_id => {
            if (trip_id in this.map_gtfs_active_trips) {
                // Trip is matched in GTFS-DB
                return;
            }

            if (trip_id in this.map_gtfs_day_trips) {
                // Trip is outside of the from/to map_gtfs_active_trips but it is actually present in the day
                return;
            }

            const gtfsRT = this.map_gtfs_rt_trips[trip_id];
            const routeID = gtfsRT.TripUpdate?.Trip?.RouteId;
            if (!routeID) {
                console.log('ERROR: invalid GTFS_RT response');
                console.log(gtfsRT);
                return;
            }

            let tableRowTDs: string[] = [];

            const rowIDx = gtfs_rt_issues_no + 1;
            tableRowTDs.push('<td>' + rowIDx.toString() + '</td>');

            const tripInfo = trip_id + '<br/>' + routeID;
            tableRowTDs.push('<td>' + tripInfo + '</td>');

            let scheduleRelationshipS = gtfsRT.TripUpdate?.Trip?.ScheduleRelationship ?? '-';
            tableRowTDs.push('<td><span class="badge bg-success">' + scheduleRelationshipS + '</span></td>');

            let agency: Agency | null = null;
            const route = this.map_gtfs_routes[routeID] ?? null;
            if (route) {
                agency = this.map_gtfs_agency[route.agency.agency_id] ?? null;
                if (agency) {
                    const agencyID = agency.agency_id;
                    const hasAgencyInGTFS_Static = agencyID in mapGTFS_StaticAgencyIDs;
                    if (!hasAgencyInGTFS_Static) {
                        if (!(agencyID in mapMissingAgency)) {
                            mapMissingAgency[agencyID] = <Report_MissingAgency>{
                                agency: agency,
                                rt_cno: 0
                            };
                        }
    
                        mapMissingAgency[agencyID].rt_cno += 1

                        // Don't show the trips from the agencies that are not in GO-Realtime, just report the agencies
                        return;
                    }
                }
            }

            if (agency) {
                tableRowTDs.push('<td>' + agency.agency_id + '</td>');
                tableRowTDs.push('<td>' + agency.agency_name + '</td>');
            } else {
                tableRowTDs.push('<td>-</td>');
                tableRowTDs.push('<td>-</td>');
            }

            let startTimeS = '';
            let startTime = gtfsRT.TripUpdate?.Trip?.StartTime ?? null;
            if (startTime) {
                startTimeS = startTime.substr(0, 5);
            }

            tableRowTDs.push('<td>' + startTimeS + '</td>');

            let stopNames: string[] = [];
            const gtfsRTStopTimes: StopTimeUpdate[] = gtfsRT.TripUpdate?.StopTimeUpdate ?? [];
            gtfsRTStopTimes.forEach(stopTime => {
                const stopData = this.map_gtfs_stops[stopTime.StopId] ?? null

                let stopName = 'n/a'
                if (stopData) {
                    stopName = stopData.stop_name;
                }

                stopNames.push(stopName);
            });

            const stopNamesS = stopNames.join(' - ');
            tableRowTDs.push('<td>' + stopNamesS + '</td>');

            const gtfsRT_ReportTR = '<tr>' + tableRowTDs.join('') + '</tr>';
            gtfsRT_ReportTRs.push(gtfsRT_ReportTR);

            gtfs_rt_issues_no += 1;
        });

        let mapAgencyWithoutGTFS_RT: Record<string, number> = {};
        this.trips_by_agency.forEach(agencyData => {
            if (agencyData.stats.rt_cno === 0) {
                mapAgencyWithoutGTFS_RT[agencyData.agency.agency_id] = 1;
            }
        });

        let report_html = this.map_html_templates.gtfs_rt_report.slice();
        report_html = report_html.replace(/\[NO_RT_NO\]/g, gtfs_rt_issues_no.toString());
        report_html = report_html.replace(/\[RT_NO\]/g, gtfs_rt_trips_no.toString());

        const agencyIDsWithoutGTFS_RT = Object.keys(mapAgencyWithoutGTFS_RT);
        let agencyIDsWithoutGTFS_RT_HTML = '';
        if (agencyIDsWithoutGTFS_RT.length > 0) {
            let listItems: string[] = [];
            agencyIDsWithoutGTFS_RT.forEach(agencyID => {
                const agencyData = this.map_gtfs_agency[agencyID]
                const agencyS = agencyData.agency_id + ' - ' + agencyData.agency_name;
                listItems.push('<li>' + agencyS + '</li>');
            });

            agencyIDsWithoutGTFS_RT_HTML = listItems.join('');
        }
        report_html = report_html.replace('[AGENCY_WITHOUT_GTFS-RT_LIST]', agencyIDsWithoutGTFS_RT_HTML);
        report_html = report_html.replace('[AGENCY_WITHOUT_GTFS-RT_LIST_NO]', agencyIDsWithoutGTFS_RT.length.toString());

        let missingAgency = Object.values(mapMissingAgency);
        missingAgency = missingAgency.sort((a, b) => a.rt_cno < b.rt_cno ? 1 : -1);

        let missingAgencyHTML = '';
        if (missingAgency.length > 0) {
            let listItems: string[] = [];

            missingAgency.forEach(agencyData => {
                const agency = agencyData.agency
                const agencyS = agency.agency_id + ' - ' + agency.agency_name + ' <span class="badge bg-success">' + agencyData.rt_cno + '</span>';
                listItems.push('<li>' + agencyS + '</li>');
            });

            missingAgencyHTML = listItems.join('');
        }
        report_html = report_html.replace('[AGENCY_WITHOUT_GO_REALTIME]', missingAgencyHTML);
        report_html = report_html.replace('[AGENCY_WITHOUT_GO_REALTIME_NO]', missingAgency.length.toString());

        const missingGTFS_StaticIssuesNo = gtfsRT_ReportTRs.length;
        let gtfsRT_IssuesS = 'Missing GTFS static entries <span class="badge bg-secondary">' + missingGTFS_StaticIssuesNo.toString() + '</span>';
        if (missingGTFS_StaticIssuesNo > issuesMaxNo) {
            gtfsRT_ReportTRs = gtfsRT_ReportTRs.slice(0, issuesMaxNo);
            gtfsRT_IssuesS += ' (showing first ' + issuesMaxNo.toString() + ' items)';
        }
        report_html = report_html.replace('[GTFS_RT_ISSUES_CAPTION]', gtfsRT_IssuesS);

        const tableRowsHTML = gtfsRT_ReportTRs.join('');
        const tableHTML = '<table class="table table-sm table-hover gtfs-trips"><thead><tr><th scope="col" style="width: 30px;">ID</th><th scope="col" style="width: 200px;">TripID / RouteID</th><th scope="col" style="width: 100px;">GTFS-RT</th><th scope="col" style="width: 20px;">ID</th><th scope="col" style="width: 100px;">Agency</th><th scope="col" class="align-middle" style="width: 70px;">Departure</th><th scope="col">Stops</th></tr></thead><tbody>' + tableRowsHTML + '</tbody></table>';
        report_html = report_html.replace('[TABLE_HTML]', tableHTML);

        this.wrapperGTFS_RTReportElement.innerHTML = report_html;
    }

    private updateGTFS_StaticReport() {
        let agencyHTMLRows: string[] = [];

        this.trips_by_agency.forEach(agency_data => {
            const agency_html = this.computeAgencyHTML(agency_data);
            agencyHTMLRows.push(agency_html);
        });

        const agencyHTML = agencyHTMLRows.join("\n");

        let gtfsStaticReportHTML = this.map_html_templates.gtfs_static_report.slice();
        gtfsStaticReportHTML = gtfsStaticReportHTML.replace('[GTFS_STATIC_REPORT_HTML]', agencyHTML);

        if (this.gtfs_trips_stats) {
            const stats = this.gtfs_trips_stats;
            gtfsStaticReportHTML = gtfsStaticReportHTML.replace(/\[GTFS_STATIC_TRIPS_NO\]/g, stats.trips_count.toString());
            gtfsStaticReportHTML = gtfsStaticReportHTML.replace(/\[TRIPS_ALREADY_FINISHED_NO\]/g, stats.trips_finished_count.toString());
            gtfsStaticReportHTML = gtfsStaticReportHTML.replace(/\[GTFS_STATIC_AGENCIES_NO\]/g, stats.agencies_count.toString());
            gtfsStaticReportHTML = gtfsStaticReportHTML.replace(/\[GTFS_STATIC_MISSING_RT_NO\]/g, stats.missing_rt_trips_count.toString());
        } else {
            gtfsStaticReportHTML = gtfsStaticReportHTML.replace(/\[GTFS_STATIC_TRIPS_NO\]/g, 'N/A');
            gtfsStaticReportHTML = gtfsStaticReportHTML.replace(/\[TRIPS_ALREADY_FINISHED_NO\]/g, 'N/A');
            gtfsStaticReportHTML = gtfsStaticReportHTML.replace(/\[GTFS_STATIC_AGENCIES_NO\]/g, 'N/A');
            gtfsStaticReportHTML = gtfsStaticReportHTML.replace(/\[GTFS_STATIC_MISSING_RT_NO\]/g, 'N/A');
        }

        this.wrapperGTFS_StaticReportElement.innerHTML = gtfsStaticReportHTML;
    }

    private computeAgencyHTML(agency_data: Report_TripsByAgency) {
        const agency = agency_data.agency;
        const agency_trip_stats = agency_data.stats;

        let agency_html = this.map_html_templates.card_agency.slice();
        
        const agency_card_id = agency_data.agency_row_idx.toString();
        agency_html = agency_html.replace(/\[AGENCY_CARD_ID\]/g, agency_card_id);
        
        const agency_display_name = agency.agency_id + ': ' + agency.agency_name;
        agency_html = agency_html.replace('[AGENCY_NAME]', agency_display_name);
        agency_html = agency_html.replace(/\[AGENCY_ID\]/g, agency.agency_id);
        agency_html = agency_html.replace(/\[AGENCY_ROW_IDX\]/g, agency_data.agency_row_idx.toString());
        
        agency_html = agency_html.replace('[NO_RT_NO]', agency_trip_stats.active_missing_rt_cno.toString());
        agency_html = agency_html.replace('[FUTURE_NO_RT_NO]', agency_trip_stats.future_missing_rt_cno.toString());
        agency_html = agency_html.replace('[RT_NO]', agency_trip_stats.rt_cno.toString());

        const badge_togle_all = agency_data.show_all_trips ? 'HIDE' : 'SHOW ALL';
        agency_html = agency_html.replace('[BADGE_TOGGLE_ALL]', badge_togle_all);

        let routes_html_rows: string[] = [];

        agency_data.routes_data.forEach(route_data => {
            const route_html = this.computeRouteHTML(route_data, agency_data);
            if (route_html) {
                routes_html_rows.push(route_html);
            }
        });

        const routes_html_s = routes_html_rows.join("\n");
        agency_html = agency_html.replace('[SERVICE_ROUTES_LIST]', routes_html_s);

        return agency_html;
    }

    private computeRouteHTML(route_data: TripsByRouteName, agency_data: Report_TripsByAgency) {
        const route_trip_stats = route_data.stats;

        let route_html = this.map_html_templates.card_route.slice();
        
        const route_card_id = agency_data.agency_row_idx + '_' + route_data.route_row_idx.toString();
        route_html = route_html.replace(/\[ROUTE_CARD_ID\]/g, route_card_id);

        route_html = route_html.replace('[ROUTE_NAME]', route_data.routeName);
        
        route_html = route_html.replace('[NO_RT_NO]', route_trip_stats.active_missing_rt_cno.toString());
        route_html = route_html.replace('[FUTURE_NO_RT_NO]', route_trip_stats.future_missing_rt_cno.toString());
        route_html = route_html.replace('[RT_NO]', route_trip_stats.rt_cno.toString());

        const badge_togle_all = route_data.show_all_trips ? 'HIDE' : 'SHOW ALL';
        route_html = route_html.replace('[BADGE_TOGGLE_ALL]', badge_togle_all);

        route_html = route_html.replace(/\[AGENCY_ROW_IDX\]/g, agency_data.agency_row_idx.toString());
        route_html = route_html.replace(/\[ROUTE_ROW_IDX\]/g, route_data.route_row_idx.toString());

        const route_trips = route_data.trips.sort((a, b) => a.departureTime < b.departureTime ? -1 : 1);

        let trips_html_rows: string[] = [];
        route_trips.forEach(trip => {
            const is_in_future = trip.isInTheFuture(this.report_datetime);

            let table_row_tds: string[] = [];
            
            // IDX
            const trip_idx = trips_html_rows.length + 1;
            table_row_tds.push('<th scope="row">' + trip_idx.toString() + '</th>');

            // General info
            let info_parts: string[] = [];
            info_parts.push(trip.tripID);

            if (!is_in_future) {
                const map_url_address = trip.computeMapURL(this.report_datetime);
                const map_el_s = ' - <a href="' + map_url_address + '" target="_blank">Map</a>';
                info_parts.push(map_el_s);
            }

            info_parts.push('<br/>');
            info_parts.push(trip.route.route_id);

            table_row_tds.push('<td>' + info_parts.join('') + '</td>');

            // RT Info
            const has_rt_info = trip.gtfsRT !== null;

            let gtfs_rt_parts: string[] = [];
            if (has_rt_info) {
                const gtfs_rt = trip.gtfsRT as Response_GTFS_RT_Entity
                const rt_trip = gtfs_rt.TripUpdate?.Trip;

                let rt_status_text = '';
                let rt_color_class = 'bg-success';

                if (rt_trip) {
                    rt_status_text = rt_trip.ScheduleRelationship;
                    if (rt_status_text === 'Canceled') {
                        rt_color_class = 'bg-danger';
                    }
                }

                gtfs_rt_parts.push('<span class="badge rounded-pill ' + rt_color_class +'">' + rt_status_text + '</span>');
            } else {
                gtfs_rt_parts.push('<span class="badge rounded-pill bg-secondary text-white">NO GTFS-RT</span>');

                if (is_in_future) {
                    gtfs_rt_parts.push('<span class="badge rounded-pill bg-warning text-dark">Future</span>');
                }
            }

            const gtfs_rt_s = gtfs_rt_parts.join("<br/>");
            table_row_tds.push('<td>' + gtfs_rt_s + '</td>');

            // From-To Dates
            const trip_from_s = Date_Helpers.formatDateYMDHIS(trip.departureTime).substr(10, 6);
            const trip_to_s = Date_Helpers.formatDateYMDHIS(trip.arrivalTime).substr(10, 6);

            table_row_tds.push('<td>' + trip_from_s + ' - ' + trip_to_s + '</td>');

            // Stop Times
            let stop_times_parts: string[] = [];
            trip.stop_times.forEach((stop_time, stop_idx) => {
                const stop_data = stop_time.stop;

                const stop_display_time = stop_time.departureDateTime ? stop_time.departureDateTime : stop_time.arrivalDateTime;
                const stop_display_time_s = stop_time.departureTimeS ? stop_time.departureTimeS : stop_time.arrivalTimeS;

                let stop_time_css_class = "stop-time";
                if (stop_display_time! < this.report_datetime) {
                    stop_time_css_class += " stop-time-passed";
                }

                const stop_time_s = '<span class="' + stop_time_css_class + '">' + stop_data.stop_name + ' (' + stop_display_time_s + ')</span>';
                stop_times_parts.push(stop_time_s);
            });

            const stop_times_s = stop_times_parts.join(' - ');
            table_row_tds.push('<td>' + stop_times_s + '</td>');

            const trip_row = '<tr>' + table_row_tds.join('') + '</tr>';

            const trip_has_rt_issues = !has_rt_info && !is_in_future;
            
            let should_show_trip = false;
            if (trip_has_rt_issues) {
                should_show_trip = true;
            } else {
                if (route_data.show_all_trips) {
                    should_show_trip = true;
                }
            }

            if (should_show_trip) {
                trips_html_rows.push(trip_row);
            }
        });

        const trips_table_rows_s = trips_html_rows.join("\n");
        const table_html = '<table class="table table-sm table-hover gtfs-trips"><thead><tr><th scope="col">ID</th><th scope="col" style="width: 300px;">TripID / RouteID</th><th scope="col" style="width: 100px;">GTFS-RT</th><th scope="col" class="align-middle" style="width: 150px;">Departure</th><th scope="col" class="align-middle">Stops</th></tr></thead><tbody>' + trips_table_rows_s + '</tbody></table>';
        route_html = route_html.replace('[TABLE_HTML]', table_html);

        const should_display_route = trips_html_rows.length > 0 || agency_data.show_all_trips;
        if (should_display_route) {
            // debugger;
            return route_html;
        }

        return null;
    }
}

interface Report_MissingAgency {
    agency: Agency
    rt_cno: number
}

interface Report_TripsByAgency {
    agency_row_idx: number
    agency: AgencyJSON
    stats: TripRT_Stats
    show_all_trips: boolean
    routes_data: TripsByRouteName[]
}

interface TripsByRouteName {
    route_row_idx: number
    routeName: string
    stats: TripRT_Stats
    show_all_trips: boolean
    trips: Trip[]
}

interface TripRT_Stats {
    rt_cno: number
    active_missing_rt_cno: number
    future_missing_rt_cno: number
}

interface GTFS_Static_Stats {
    trips_count: number
    trips_finished_count: number
    agencies_count: number
    missing_rt_trips_count: number
}
