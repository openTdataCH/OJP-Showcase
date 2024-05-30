export interface GTFS_Static_Trip_Condensed {
    trip_id: string
    route_id: string
    trip_short_name: string
    service_id: string
    direction_id: string
    shape_id: string
    trip_headsign: string
    
    arrival_time: string
    arrival_day_minutes: number
    departure_time: string
    departure_day_minutes: number
    
    stop_times_s: string
}
