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
}

export interface StopJSON {
    stop_id: string
    stop_name: string
    stop_lon: number
    stop_lat: number
    location_type: string
    parent_station: string
}

export interface Stop_Time {
    stop_id: string
    stop_arrival: Date | null
    stop_departure: Date | null
}
