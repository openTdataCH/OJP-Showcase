import { GTFS_Static_Trip_Condensed } from "./trip-with-stops.interface"

export interface AgencyJSON {
    agency_id: string
    agency_name: string
    agency_url: string
    agency_phone: string
    agency_timezone: string
    agency_lang: string
}

export interface CalendarJSON {
    service_id: string
    day_bits: string
    start_date: string
    end_date: string
    
    monday: number
    tuesday: number
    wednesday: number
    thursday: number
    friday: number
    saturday: number
    sunday: number
}

export interface RouteJSON {
    route_id: string
    agency_id: string
    route_short_name: string
    route_long_name: string
    route_desc: string
    route_type: number
    day_bits: string
    representative_trip_id: string
}

export interface StopJSON {
    stop_id: string
    stop_name: string
    stop_lon: number
    stop_lat: number
    location_type: string
    parent_station: string
}

export interface Stop_TimeJSON {
    stop_id: string
    stop_arrival: Date | null
    stop_departure: Date | null
}

export interface TripJSON {
    trip_id: string
    route_id: string
    service_id: string
    trip_headsign: string | null
    trip_short_name: string | null
}

export interface GTFS_DB_LookupAgency {
    lookup_name: 'agency',
    data_source: string,
    rows: AgencyJSON[],
    rows_no: number,
}

export interface GTFS_DB_LookupRoutes {
    lookup_name: 'routes',
    data_source: string,
    rows: RouteJSON[],
    rows_no: number,
}

export interface GTFS_DB_LookupJSON {
    agency: GTFS_DB_LookupAgency,
    routes: GTFS_DB_LookupRoutes,
    stops: {
        lookup_name: 'stops',
        data_source: string,
        rows: StopJSON[],
        rows_no: number,
    },
}

interface FTS_RouteJSON {
    route_id: string,
    trip_stop_ids: string,
}

export interface GTFS_DB_FTS_RoutesLookupJSON {
    lookup_name: 'fts_routes',
    data_source: string,
    rows: FTS_RouteJSON[],
    rows_no: number,
}

export interface GTFS_DB_Trips_Response {
    metadata: {
        gtfs_day: string,
        rows_no: number
    },
    rows: GTFS_Static_Trip_Condensed[],
}

// https://tools.odpch.ch/gtfs-query/trip/1.TA.96-702-j26-1.1.H
export interface TripDetailResponseJSON {
    message: string[]
    result: {
        trip: GTFS_Static_Trip_Condensed | null,
        calendar: CalendarJSON | null,
        route: RouteJSON | null,
        agency: AgencyJSON | null,
    };
}
