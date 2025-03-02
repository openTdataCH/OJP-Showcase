import Agency from './agency'
import { AgencyJSON, RouteJSON } from '../../types/gtfs/gtfs'

export default class Route {
    public route_id: string;
    public agency: Agency;
    public route_short_name: string;
    public route_type: number;
    
    public route_long_name: string | null;
    public route_desc: string | null;
    public day_bits: string | null;
    public representative_trip_id: string | null;

    constructor(
        route_id: string,
        agency: Agency,
        route_short_name: string,
        route_type: number,
    ) {
        this.route_id = route_id;
        this.agency = agency;
        this.route_short_name = route_short_name;
        this.route_type = route_type;

        this.route_long_name = null;
        this.route_desc = null;
        this.day_bits = null;
        this.representative_trip_id = null;
    }

    public static initFromJSON(routeJSON: RouteJSON, mapAgency: Record<string, AgencyJSON | Agency>) {
        const route_id = routeJSON.route_id;

        const agency_id = routeJSON.agency_id;
        const agencyO = mapAgency[agency_id] ?? null;

        let agency = agencyO;
        if (agencyO.constructor.name !== 'Agency') {
            agency = Agency.initFromAgencyJSON(agencyO as AgencyJSON);
        }

        const route_short_name = routeJSON.route_short_name;
        const route_type = routeJSON.route_type;

        const route = new Route(route_id, agency as Agency, route_short_name, route_type);

        route.route_long_name = routeJSON.route_long_name;
        route.route_desc = routeJSON.route_desc;
        route.day_bits = routeJSON.day_bits;
        route.representative_trip_id = routeJSON.representative_trip_id;

        return route;
    }
}
