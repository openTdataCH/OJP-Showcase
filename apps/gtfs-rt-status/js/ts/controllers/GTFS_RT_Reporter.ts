import { Date_Helpers } from '../helpers/Date_Helpers';
import { DOM_Helpers } from '../helpers/DOM_Helpers';
import { Response_GTFS_Lookup } from '../models/response_gtfs_lookup';
import { GTFS_RT, Response_GTFS_RT, Response_GTFS_RT_Entity } from './../models/response_gtfs_rt'
import { GTFS_Static_Trip, GTFS_Static_Trip_Condensed } from './../models/response_gtfs_static_query'

export default class GTFS_RT_Reporter {
    private map_gtfs_rt_trips: Record<string, Response_GTFS_RT_Entity>
    
    private map_gtfs_all_trips: Record<string, GTFS_Static_Trip_Condensed>
    private trips_by_agency: Report_TripsByAgency[];
    private gtfs_trips_stats: GTFS_Static_Stats | null

    private map_gtfs_agency: Record<string, GTFS.Agency>
    private map_gtfs_routes: Record<string, GTFS.Route>
    private map_gtfs_stops: Record<string, GTFS.Stop>

    private request_datetime = new Date()

    private map_html_templates: Record<string, string>;

    private wrapperGTFS_StaticReportElement: HTMLElement;
    private wrapperGTFS_RTReportElement: HTMLElement;

    constructor() {
        this.map_gtfs_rt_trips = {};
        this.map_gtfs_all_trips = {};

        this.trips_by_agency = [];
        this.gtfs_trips_stats = null;

        this.map_gtfs_agency = {};
        this.map_gtfs_routes = {};
        this.map_gtfs_stops = {};

        this.wrapperGTFS_StaticReportElement = document.getElementById('content_wrapper') as HTMLElement;
        this.wrapperGTFS_RTReportElement = document.getElementById('hrdf_rt_wrapper') as HTMLElement;

        this.addEventHandlers();

        this.map_html_templates = {
            card_agency: (document.getElementById('template_agency') as HTMLElement).innerHTML,
            card_route: (document.getElementById('template_route_name') as HTMLElement).innerHTML,
            gtfs_rt_report: (document.getElementById('template_gtfs_rt_report') as HTMLElement).innerHTML,
            gtfs_static_report: (document.getElementById('template_gtfs_static_report') as HTMLElement).innerHTML,
        };
    }

    private addEventHandlers() {
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

    public loadAgency(response_json: Response_GTFS_Lookup) {
        this.map_gtfs_agency = {};

        const response_rows = response_json.rows as GTFS.Agency[];
        response_rows.forEach(agency => {
            const agency_id = agency.agency_id;
            this.map_gtfs_agency[agency_id] = agency;
        });
    }

    public loadRoutes(response_json: Response_GTFS_Lookup) {
        this.map_gtfs_routes = {};

        const response_rows = response_json.rows as GTFS.Route[];
        response_rows.forEach(route => {
            const route_id = route.route_id;
            this.map_gtfs_routes[route_id] = route;
        });
    }

    public loadStops(response_json: Response_GTFS_Lookup) {
        this.map_gtfs_stops = {};

        const response_rows = response_json.rows as GTFS.Stop[];
        response_rows.forEach(stop => {
            const stop_id = stop.stop_id;
            this.map_gtfs_stops[stop_id] = stop;
        });
    }

    public setRequestDatetime(request_datetime: Date) {
        this.request_datetime = request_datetime;
    }

    public loadTrips(response_json: GTFS_Static_Trip_Condensed[]) {
        this.map_gtfs_all_trips = {};

        response_json.forEach(trip_condensed => {
            const trip_id = trip_condensed.trip_id;
            this.map_gtfs_all_trips[trip_id] = trip_condensed;
        });
    }

    public loadGTFS_RT(response_gtfs_rt: Response_GTFS_RT, request_interval_from_date: Date, request_interval_to_date: Date) {
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

        this.updateGTFS_RTReport();
        this.updateGTFS_StaticReport();
    }

    private computeActiveTrips(request_interval_from_date: Date, request_interval_to_date: Date) {
        const trip_day = new Date(this.request_datetime);
        const trip_day_midnight = Date_Helpers.setHHMMToDate(trip_day, "00:00");

        let trips_finished_count = 0;

        let map_active_trips: Record<string, Record<string, GTFS_Static_Trip[]>> = {};
        for (const trip_id in this.map_gtfs_all_trips) {
            const condensed_trip = this.map_gtfs_all_trips[trip_id];

            const route = this.map_gtfs_routes[condensed_trip.route_id];
            const agency = this.map_gtfs_agency[route.agency_id];
            const trip = GTFS_Static_Trip.initWithCondensedTrip(condensed_trip, agency, route, trip_day_midnight, this.map_gtfs_stops);

            // Test the trip to be inside [-0.5h .. +3h]
            const is_active = trip.isActive(request_interval_from_date, request_interval_to_date);
            if (!is_active) {
                continue;
            }

            // Test the trip to finish after NOW
            const is_finished = trip.isFinished(this.request_datetime);
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
                        const is_in_future = trip.isInTheFuture(this.request_datetime);
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
            trips_count: Object.keys(this.map_gtfs_all_trips).length,
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

        let gtfs_rt_issues_no = 0;
        for (const trip_id in this.map_gtfs_rt_trips) {
            if (trip_id in this.map_gtfs_all_trips) {
                continue;
            }

            const gtfsRT = this.map_gtfs_rt_trips[trip_id];
            const routeID = gtfsRT.TripUpdate?.Trip?.RouteId;
            if (!routeID) {
                console.log('ERROR: invalid GTFS_RT response');
                console.log(gtfsRT);
                continue;
            }

            let tableRowTDs: string[] = [];

            const rowIDx = gtfs_rt_issues_no + 1;
            tableRowTDs.push('<td>' + rowIDx.toString() + '</td>');

            const tripInfo = trip_id + '<br/>' + routeID;
            tableRowTDs.push('<td>' + tripInfo + '</td>');

            let scheduleRelationshipS = gtfsRT.TripUpdate?.Trip?.ScheduleRelationship ?? '-';
            tableRowTDs.push('<td><span class="badge bg-success">' + scheduleRelationshipS + '</span></td>');

            let agencyData: GTFS.Agency | null = null;
            const routeData = this.map_gtfs_routes[routeID] ?? null;
            if (routeData) {
                const agencyID = routeData.agency_id;
                agencyData = this.map_gtfs_agency[agencyID] ?? null;

                if (agencyData) {
                    const hasAgencyInGTFS_Static = agencyID in mapGTFS_StaticAgencyIDs;
                    if (!hasAgencyInGTFS_Static) {
                        if (!(agencyID in mapMissingAgency)) {
                            mapMissingAgency[agencyID] = <Report_MissingAgency>{
                                agency: agencyData,
                                rt_cno: 0
                            };
                        }
    
                        mapMissingAgency[agencyID].rt_cno += 1

                        // Don't show the trips from the agencies that are not in GO-Realtime, just report the agencies
                        continue;
                    }
                }
            }

            if (agencyData) {
                tableRowTDs.push('<td>' + agencyData.agency_id + '</td>');
                tableRowTDs.push('<td>' + agencyData.agency_name + '</td>');
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
            const gtfsRTStopTimes: GTFS_RT.StopTimeUpdate[] = gtfsRT.TripUpdate?.StopTimeUpdate ?? [];
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
        }

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
            const is_in_future = trip.isInTheFuture(this.request_datetime);

            let table_row_tds: string[] = [];
            
            // IDX
            const trip_idx = trips_html_rows.length + 1;
            table_row_tds.push('<th scope="row">' + trip_idx.toString() + '</th>');

            // General info
            let info_parts: string[] = [];
            info_parts.push(trip.tripID);

            if (!is_in_future) {
                const map_url_address = trip.computeMapURL(this.request_datetime);
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

                const stop_display_time = stop_time.stop_departure ? stop_time.stop_departure : stop_time.stop_arrival;
                const stop_display_time_s = Date_Helpers.formatDateYMDHIS(stop_display_time!).substr(11, 5);

                let stop_time_css_class = "stop-time";
                if (stop_display_time! < this.request_datetime) {
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
    agency: GTFS.Agency
    rt_cno: number
}

interface Report_TripsByAgency {
    agency_row_idx: number
    agency: GTFS.Agency
    stats: TripRT_Stats
    show_all_trips: boolean
    routes_data: TripsByRouteName[]
}

interface TripsByRouteName {
    route_row_idx: number
    routeName: string
    stats: TripRT_Stats
    show_all_trips: boolean
    trips: GTFS_Static_Trip[]
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