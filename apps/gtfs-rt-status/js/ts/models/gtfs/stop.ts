namespace GTFS {
    export interface Stop {
        stop_id: string
        stop_name: string
        stop_lon: number
        stop_lat: number
        location_type: string
    }
}