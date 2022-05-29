import Trip_Variant from '../models/hrdf/trip_variant';

import { DOM_Helpers } from '../helpers/DOM_Helpers';

import { HRDF_DB_Lookups_Response } from '../types/hrdf_db_lookups_response';
import { HRDF_Duplicates_Report_Response } from '../types/hrdf_duplicates_report_response'
import { HRDF_Duplicates_Report, HRDF_Duplicates_Agency_Data, HRDF_Duplicate_Trips_Data } from '../types/hrdf_duplicates_report';

import HRDF_DB_Lookups_Controller from './hrdf_db_lookups_controller';
import { HRDF_Duplicates_List_Response } from '../types/hrdf_duplicates_list_response';

export default class HRDF_Check_Duplicates_Controller {
    private hrdf_day_select: HTMLSelectElement
    private map_html_templates: Record<string, string>;
    
    private map_calendar_service_content: Record<string, string>

    private hrdf_api_base: string;
    
    private loading_status_el: HTMLElement;
    private report_content_el: HTMLElement;

    constructor() {
        this.hrdf_day_select = document.getElementById('hrdf_day_select') as HTMLSelectElement;
        this.hrdf_day_select.addEventListener('change', () => {
            const hrdf_day = this.hrdf_day_select.value;
            this._load_duplicates_for_day(hrdf_day);
        });

        this.map_html_templates = {
            card_vehicle_type: (document.getElementById('template_vehicle_type') as HTMLElement).innerHTML,
            card_duplicate_trips: (document.getElementById('template_duplicate_trips') as HTMLElement).innerHTML,
        };

        this.map_calendar_service_content = {};

        this.hrdf_api_base = './api/hrdf-query';
        
        this.loading_status_el = document.getElementById('loading_status') as HTMLElement;
        this.report_content_el = document.getElementById('report_content') as HTMLElement;
    }

    public check_available_datasets(completion: (hrdf_days: string[]) => void): void {
        const available_datasets_api = this.hrdf_api_base + '/hrdf_duplicates_list.json';

        fetch(available_datasets_api)
            .then(response => response.json())
            .then(response_data => {
                const dataHRDF_Duplicates_Response = response_data as HRDF_Duplicates_List_Response;
                completion(dataHRDF_Duplicates_Response.hrdf_duplicates_available_days);
            });
    }

    public set_error_message(message: string) {
        console.error('ERROR HRDF_Check_Duplicates_Controller' + message);
    }

    public load_days(hrdf_days: string[]) {
        this._update_hrdf_days_select(hrdf_days);
        if (hrdf_days.length > 0) {
            this._load_duplicates_for_day(hrdf_days[0]);
        }
    }

    private _update_hrdf_days_select(hrdf_days: string[]) {
        const select_options: string[] = [];

        hrdf_days.forEach(hrdf_day => {
            const option_HTML = '<option value="' + hrdf_day + '">' + hrdf_day + '</option>';
            select_options.push(option_HTML);
        });

        this.hrdf_day_select.innerHTML = select_options.join('');

        const search_form_container = document.getElementById('search-form') as HTMLDivElement;
        DOM_Helpers.removeClassName(search_form_container, 'd-none');
    }

    private _load_duplicates_for_day(hrdf_day: string) {
        DOM_Helpers.removeClassName(this.loading_status_el, 'd-none');
        DOM_Helpers.addClassName(this.report_content_el, 'd-none');

        let data_HRDF_DB_Lookups_JSON = './data/hrdf-db-lookups/hrdf_lookups_' + hrdf_day + '.json';
        let data_HRDF_Duplicates_JSON = './data/hrdf-duplicates-reports/hrdf_duplicates_report_' + hrdf_day + '.json';

        const resource_files = [
            data_HRDF_DB_Lookups_JSON,
            data_HRDF_Duplicates_JSON,
        ];

        Promise.all(resource_files.map(resource_file => fetch(resource_file))).then(responses =>
            Promise.all(responses.map(response => response.json()))
        ).then(data_responses => {
            this._loadResponses(data_responses);
            
            DOM_Helpers.addClassName(this.loading_status_el, 'd-none');
            DOM_Helpers.removeClassName(this.report_content_el, 'd-none');
        }).catch( error => {
            console.log('error fetching resources: ' + error);
            console.log(resource_files);
        });
    }

    private _loadResponses(data_responses: any) {
        const hrdf_db_lookups_response = data_responses[0] as HRDF_DB_Lookups_Response;
        const mapHRDFLookups = HRDF_DB_Lookups_Controller.initFromDBLookups(hrdf_db_lookups_response);

        const dataHRDF_Duplicates = data_responses[1] as HRDF_Duplicates_Report_Response;

        const hrdf_duplicates_report: HRDF_Duplicates_Report = {
            agencies_data: []
        };

        this.map_calendar_service_content = dataHRDF_Duplicates.service_data;

        for (const [agency_id, map_agency_trips_data] of Object.entries(dataHRDF_Duplicates.agency_data)) {
            const agency_trips_data: HRDF_Duplicate_Trips_Data[] = [];

            for (const [hrdf_trip_key, fplan_row_indices] of Object.entries(map_agency_trips_data)) {
                const hrdf_trips: Trip_Variant[] = [];

                fplan_row_indices.forEach(fplan_row_idx => {
                    const hrdf_trip_db = dataHRDF_Duplicates.map_hrdf_trips[fplan_row_idx]
                    const hrdf_trip = Trip_Variant.initFromTripVariantDB(
                        hrdf_trip_db, 
                        mapHRDFLookups.agency,
                        mapHRDFLookups.calendar, 
                        mapHRDFLookups.stops,
                    );
                    hrdf_trips.push(hrdf_trip);
                });

                if (hrdf_trips.length === 0) {
                    console.log('ERROR - no trips for the agency?');
                    console.log(agency_trips_data);
                    return;
                }

                const first_trip = hrdf_trips[0];

                // Sort by vehicle type + line number (numerically)
                let sort_key = first_trip.vehicle_type;
                
                if (first_trip.service_line) {
                    const digits_matches = first_trip.service_line.match(/\d+/)
                    const digits_matches_s = digits_matches ? digits_matches[0] : '';
                    const sort_key_line = '0'.repeat(5 - digits_matches_s.length) + digits_matches_s + '_' + first_trip.service_line;
                    sort_key += '_' + sort_key_line
                }

                const hrdf_duplicate_trips_data = <HRDF_Duplicate_Trips_Data>{
                    hrdf_trip_key: hrdf_trip_key,
                    sort_key: sort_key,
                    hrdf_trips: hrdf_trips,
                }
                agency_trips_data.push(hrdf_duplicate_trips_data);
            }

            agency_trips_data.sort((a, b) => {
                if (a.sort_key < b.sort_key) return -1;
                if (a.sort_key < b.sort_key) return 1;
                return 0;
            });

            const agency = mapHRDFLookups.agency[agency_id];
            const sort_key = agency.agency_code ?? 'n/a';
            const agency_data = <HRDF_Duplicates_Agency_Data>{
                agency: agency,
                sort_key: sort_key,
                trips_data: agency_trips_data,
            };

            hrdf_duplicates_report.agencies_data.push(agency_data)
        }

        hrdf_duplicates_report.agencies_data.sort((a, b) => {
            if (a.sort_key < b.sort_key) return -1;
            if (a.sort_key < b.sort_key) return 1;
            return 0;
        });

        this._render_duplicates_report(hrdf_duplicates_report);
    }

    private _render_duplicates_report(hrdf_duplicates_report: HRDF_Duplicates_Report) {
        const select_container = document.getElementById('agency_select') as HTMLSelectElement;
        select_container.innerHTML = this._computeSelectHTML(hrdf_duplicates_report);
        
        // Select SBB by default
        select_container.value = '11';

        select_container.addEventListener('change', ev => {
            this._render_agency_duplicates(select_container.value, hrdf_duplicates_report);
        });

        this._render_agency_duplicates(select_container.value, hrdf_duplicates_report);

        DOM_Helpers.removeClassName(this.report_content_el, 'd-none');
    }

    private _computeSelectHTML(hrdf_duplicates_report: HRDF_Duplicates_Report) {
        const select_option_HTML_items: string[] = [];
        hrdf_duplicates_report.agencies_data.forEach(agency_hrdf_duplicates_data => {
            const hrdf_trips_count = agency_hrdf_duplicates_data.trips_data.length;
            const agency = agency_hrdf_duplicates_data.agency;
            let option_title: string = agency.agency_code ?? '';
            option_title += ' (' + agency.agency_id + ')';
            option_title += ' - ' + agency.agency_name + ' - ' + hrdf_trips_count + ' group duplicates';

            const option_id = agency.agency_id;

            const select_option_HTML_item = '<option value="' + option_id + '">' + option_title +'</option>';
            select_option_HTML_items.push(select_option_HTML_item);
        });
        const select_options_HTML = select_option_HTML_items.join('');

        return select_options_HTML;
    }

    private _render_agency_duplicates(agency_id: string, hrdf_duplicates_report: HRDF_Duplicates_Report) {
        const selected_agency_data = hrdf_duplicates_report.agencies_data.find(agency_data => {
            return agency_data.agency.agency_id === agency_id;
        });

        const map_trips_by_vehicle_type: Record<string, HRDF_Duplicate_Trips_Data[]> = {};
        selected_agency_data?.trips_data.forEach(hrdf_duplicate_trips_data => {
            const vehicle_type_key = hrdf_duplicate_trips_data.sort_key;
            if (!(vehicle_type_key in map_trips_by_vehicle_type)) {
                map_trips_by_vehicle_type[vehicle_type_key] = [];
            }

            map_trips_by_vehicle_type[vehicle_type_key].push(hrdf_duplicate_trips_data);
        });

        const vehicle_type_cards: string[] = [];

        const trips_by_vehicle_type: HRDF_Duplicate_Trips_Data[][] = Object.values(map_trips_by_vehicle_type);
        let group_idx = 0;
        trips_by_vehicle_type.forEach(duplicates_data => {
            const collapse_level1_id = '' + group_idx;
            const vehicle_type_card_HTML = this._compute_vehicle_type_card_HTML(duplicates_data, collapse_level1_id);
            vehicle_type_cards.push(vehicle_type_card_HTML);
            group_idx += 1;
        });

        const agency_report_container = document.getElementById('agency_report_container') as HTMLDivElement;
        agency_report_container.innerHTML = vehicle_type_cards.join('');
    }

    private _compute_vehicle_type_card_HTML(group_duplicates_data: HRDF_Duplicate_Trips_Data[], collapse_level1_id: string) {
        let card_HTML = this.map_html_templates.card_vehicle_type.slice();
        
        const main_trip = group_duplicates_data[0].hrdf_trips[0];
        let vehicle_type_title = main_trip.vehicle_type;
        if (main_trip.service_line) {
            vehicle_type_title += ' ' + main_trip.service_line;
        }
        card_HTML = card_HTML.replace('[VEHICLE_TYPE]', vehicle_type_title);

        const vehicle_type_groups_no = group_duplicates_data.length;
        const vehicle_type_groups_no_s = vehicle_type_groups_no + ' ' + (vehicle_type_groups_no === 1 ? 'group' : 'groups');
        card_HTML = card_HTML.replace('[GROUPS_NO_PLURAL]', vehicle_type_groups_no_s);

        const group_duplicates_cards: string[] = [];
        let duplicate_idx = 0;
        group_duplicates_data.forEach(duplicates_data => {
            const collapse_level2_id = collapse_level1_id + '_' + duplicate_idx;
            const group_duplicates_card = this._compute_duplicates_card_HTML(duplicates_data, collapse_level2_id);
            group_duplicates_cards.push(group_duplicates_card);
            duplicate_idx += 1;
        });

        const group_duplicates_cards_HTML = group_duplicates_cards.join('');
        card_HTML = card_HTML.replace('[VEHICLE_TYPE_DUPLICATE_CARDS]', group_duplicates_cards_HTML);

        card_HTML = card_HTML.replace(/\[CARD_LEVEL1_ID\]/g, collapse_level1_id.toString());

        return card_HTML;
    }

    private _compute_duplicates_card_HTML(duplicates_data: HRDF_Duplicate_Trips_Data, collapse_level2_id: string) {
        let card_HTML = this.map_html_templates.card_duplicate_trips.slice();

        const duplicate_trips_title = duplicates_data.hrdf_trip_key;
        card_HTML = card_HTML.replace('[DUPLICATE_KEY]', duplicate_trips_title);

        const items_no = duplicates_data.hrdf_trips.length;
        card_HTML = card_HTML.replace('[ITEMS_NO]', items_no.toString());

        const duplicate_header_th_cells = [
            '<th>Line IDX</th>',
        ];
        const duplicate_fplan_type_td_cells: string[] = [
            '<th>Type</th>',
        ];
        const duplicate_fplan_td_cells: string[] = [
            '<th>FPLAN</th>',
        ];
        const duplicate_fplan_stop_times_td_cells: string[] = [
            '<th>Stop Times</th>',
        ];
        const duplicate_fplan_calendar_td_cells: string[] = [
            '<th>Calendar</th>',
        ];

        duplicates_data.hrdf_trips.forEach(hrdf_trip => {
            const hrdf_fplan_lookup_key = hrdf_trip.fplan_row_idx + '.' + hrdf_trip.service.service_id
            const duplicate_header_th_cell = '<th>' + hrdf_fplan_lookup_key + '</th>';
            duplicate_header_th_cells.push(duplicate_header_th_cell);

            let fplan_type = hrdf_trip.vehicle_type
            if (hrdf_trip.service_line) {
                fplan_type += hrdf_trip.service_line;
            }
            const duplicate_fplan_type_td_cell = '<td>' + fplan_type + '</td>';
            duplicate_fplan_type_td_cells.push(duplicate_fplan_type_td_cell);

            const fplan_content_meta = this._compute_trip_meta_cell(hrdf_trip);
            const duplicate_fplan_td_cell = '<td class="fplan_content">' + fplan_content_meta + '</td>';
            duplicate_fplan_td_cells.push(duplicate_fplan_td_cell);

            const fplan_content_stop_times = this._compute_trip_stops_table(hrdf_trip);
            const duplicate_fplan_stop_times_td_cell = '<td>' + fplan_content_stop_times + '</td>';
            duplicate_fplan_stop_times_td_cells.push(duplicate_fplan_stop_times_td_cell);

            const service_id = hrdf_trip.service.service_id;
            const service_s = this.map_calendar_service_content[service_id];
            const duplicate_fplan_calendar_td_cell = '<td class="fplan_content"><pre>' + service_s + '</pre></td>';
            duplicate_fplan_calendar_td_cells.push(duplicate_fplan_calendar_td_cell);
        });

        const duplicates_data_tr_rows: string[] = [];
        duplicates_data_tr_rows.push('<tr>' + duplicate_fplan_type_td_cells.join('') + '</tr>');
        duplicates_data_tr_rows.push('<tr>' + duplicate_fplan_td_cells.join('') + '</tr>');
        duplicates_data_tr_rows.push('<tr>' + duplicate_fplan_stop_times_td_cells.join('') + '</tr>');
        duplicates_data_tr_rows.push('<tr>' + duplicate_fplan_calendar_td_cells.join('') + '</tr>');

        const duplicates_data_thead_HTML = '<thead><tr>' + duplicate_header_th_cells.join('') + '</tr></thead>';
        const duplicates_data_tbody_HTML = '<tbody>' + duplicates_data_tr_rows.join('') + '</tbody>';

        const duplicates_data_HTML = '<table class="table table-bordered">' + duplicates_data_thead_HTML + duplicates_data_tbody_HTML + '</table>';
        
        card_HTML = card_HTML.replace('[DUPLICATE_TRIPS_TABLE]', duplicates_data_HTML);

        card_HTML = card_HTML.replace(/\[CARD_LEVEL2_ID\]/g, collapse_level2_id);

        return card_HTML;
    }

    private _compute_trip_meta_cell(hrdf_trip: Trip_Variant) {
        const service_id = hrdf_trip.service.service_id;
        
        const trip_stop_ids: string[] = [];
        hrdf_trip.stopTimes.forEach(stop_time => {
            trip_stop_ids.push(stop_time.stop.stop_id);
        });

        const fplan_content_meta_rows: string[] = [];
        
        const fplan_content_rows = hrdf_trip.fplan_content.split("\n")
        fplan_content_rows.forEach(fplan_content_row => {
            const isMeta = fplan_content_row[0] === '*';
            const isStopTime = !isMeta;

            let isDifferentVariant = false;

            const isAVE = fplan_content_row.substring(0, 5) === '*A VE';
            if (isAVE) {
                const hasCalendarService = fplan_content_row.indexOf(service_id) !== -1;
                if (!hasCalendarService) {
                    isDifferentVariant = true;
                }
            }

            if (isStopTime) {
                const fplan_content_stop_id = fplan_content_row.substring(0, 7);
                if (!trip_stop_ids.includes(fplan_content_stop_id)) {
                    isDifferentVariant = true;
                }
            }

            if (isDifferentVariant) {
                fplan_content_row = '=> different variant ··· ' + fplan_content_row;
            }

            const meta_row = fplan_content_row;
            fplan_content_meta_rows.push(meta_row);
        });

        const fplan_content_meta_HTML = '<pre>' + fplan_content_meta_rows.join("\n") + '</pre>';

        return fplan_content_meta_HTML;
    }

    private _compute_trip_stops_table(hrdf_trip: Trip_Variant) {
        const table_rows: string[] = [];

        hrdf_trip.stopTimes.forEach((stop_time, idx) => {
            const stop_time_cells: string[] = [];
            stop_time_cells.push('<td>' + (idx + 1) + '</td>');
            const stop_name_cell = stop_time.stop.stop_name + ' (' + stop_time.stop.stop_id +')';
            stop_time_cells.push('<td>' + stop_name_cell + '</td>');
            
            stop_time_cells.push('<td>' + (stop_time.arrival_time ?? '') + '</td>');
            stop_time_cells.push('<td>' + (stop_time.departure_time ?? '') + '</td>');

            const stop_time_tr = '<tr>' + stop_time_cells.join("") + '</tr>';
            table_rows.push(stop_time_tr);
        });

        const table_row_headers = [
            '<th scope="col">#</th>',
            '<th scope="col">Stop</th>',
            '<th scope="col">Arr</th>',
            '<th scope="col">Dep</th>',
        ];

        const stop_times_table_HTML_rows: string[] = [
            '<table class="table table-striped table-hover">',
            '<thead><tr>' + table_row_headers.join("") + '</tr></thead>',
            '<tbody>' + table_rows.join("") + '</tbody>',
            '</table>',
        ];

        const stop_times_table_HTML = stop_times_table_HTML_rows.join("");

        return stop_times_table_HTML;
    }
}
