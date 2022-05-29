import Agency from '../models/gtfs/agency';
import Calendar from '../models/gtfs/calendar';
import Stop from '../models/gtfs/stop';

import { HRDF_Agency_DB } from "../types/hrdf/agency_db";
import { HRDF_Calendar_DB } from "../types/hrdf/calendar_db";
import { HRDF_Stop_DB } from "../types/hrdf/stop_db";
import { HRDF_DB_Lookups_Response } from "../types/hrdf_db_lookups_response";

export default class HRDF_DB_Lookups_Controller {
    public agency: Record<string, Agency>
    public calendar: Record<string, Calendar>
    public calendar_data: {
        days_no: number
        start_date: Date
    }
    public stops: Record<string, Stop>

    constructor(
        agency: Record<string, Agency>, 
        calendar: Record<string, Calendar>,
        stops: Record<string, Stop>,
        calendar_data: {
            days_no: number
            start_date: Date
        }
    ) {
        this.agency = agency
        this.calendar = calendar
        this.stops = stops
        this.calendar_data = calendar_data
    }

    public static initFromDBLookups(data_response: HRDF_DB_Lookups_Response): HRDF_DB_Lookups_Controller {
        const mapAgencies: Record<string, Agency> = {}
        Object.keys(data_response.agency).forEach(agency_id => {
            const agency_db = data_response.agency[agency_id] as HRDF_Agency_DB
            const agency = Agency.initFromHRDFAgencyDB(agency_db);
            mapAgencies[agency.agency_id] = agency;
        });

        const mapCalendarService: Record<string, Calendar> = {}
        Object.keys(data_response.calendar).forEach(calendar_service_id => {
            const calendar_service_hrdf_db = data_response.calendar[calendar_service_id] as HRDF_Calendar_DB
            const calendarService = Calendar.initFromHRDFServiceDB(calendar_service_hrdf_db);
            mapCalendarService[calendarService.service_id] = calendarService;
        });

        const mapStops: Record<string, Stop> = {}
        Object.keys(data_response.stops).forEach(stop_id => {
            const stop_hrdf_db = data_response.stops[stop_id] as HRDF_Stop_DB
            const stop = Stop.initFromHRDFStopDB(stop_hrdf_db);
            mapStops[stop.stop_id] = stop;
        });

        const start_date = new Date(data_response.calendar_data.start_date);

        const controller = new HRDF_DB_Lookups_Controller(
            mapAgencies,
            mapCalendarService,
            mapStops,
            {
                days_no: data_response.calendar_data.days_no,
                start_date: start_date,
            }
        );

        return controller;
    }
}