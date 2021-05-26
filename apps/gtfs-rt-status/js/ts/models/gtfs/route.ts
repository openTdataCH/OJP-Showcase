namespace GTFS {
    // TODO - rename me to Route_JSON ?
    export interface Route {
        route_id: string
        agency_id: string
        route_short_name: string
        route_long_name: string
        route_desc: string
        route_type: number
    }
}