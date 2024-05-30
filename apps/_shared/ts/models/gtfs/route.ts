import Agency from './agency'
import { AgencyJSON, RouteJSON } from '../../types/gtfs/gtfs'

export default class Route {
    public route_id: string
    public agency: Agency
    public route_short_name: string
    public route_long_name: string
    public route_desc: string
    public route_type: number

    constructor(
        route_id: string,
        agency: Agency,
        route_short_name: string,
        route_long_name: string,
        route_desc: string,
        route_type: number,
    ) {
        this.route_id = route_id
        this.agency = agency
        this.route_short_name = route_short_name
        this.route_long_name = route_long_name
        this.route_desc = route_desc
        this.route_type = route_type
    }

    public static initFromJSON(routeJSON: RouteJSON, mapAgency: Record<string, AgencyJSON | Agency>) {
        const route_id = routeJSON.route_id
        
        const agency_id = routeJSON.agency_id
        const agencyO = mapAgency[agency_id] ?? null;

        let agency = agencyO;
        if (agencyO.constructor.name !== 'Agency') {
            agency = Agency.initFromAgencyJSON(agencyO as AgencyJSON);
        }

        const route_short_name = routeJSON.route_short_name
        const route_long_name = routeJSON.route_long_name
        const route_desc = routeJSON.route_desc
        const route_type = routeJSON.route_type

        const route = new Route(route_id, agency as Agency, route_short_name, route_long_name, route_desc, route_type)
        return route
    }
}
