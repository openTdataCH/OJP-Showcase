namespace GTFS {
    export interface Stop_Time {
        stop: GTFS.Stop
        stop_arrival: Date | null
        stop_departure: Date | null
    }
}