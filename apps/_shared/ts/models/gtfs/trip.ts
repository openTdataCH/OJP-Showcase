// import SphericalMercator from '@mapbox/sphericalmercator'

import Date_Helpers from '../../helpers/date-helpers'

import { Response_GTFS_RT_Entity } from '../../types/gtfs-rt/entity'
import { GTFS_Static_Trip_Condensed } from '../../types/gtfs/trip-with-stops.interface'
import { TripJSON } from '../../types/gtfs/gtfs'

import Calendar from './calendar'
import Route from './route'
import Stop from './stop'
import StopTime from './stop_time'

export class Trip {
    public tripID: string
    
    public stop_times: StopTime[]
    public route: Route
    public calendar: Calendar

    public departureTime: Date
    public arrivalTime: Date
    
    public gtfsRT: Response_GTFS_RT_Entity | null

    public trip_short_name: string | null
    
    constructor(trip_id: string, stop_times: StopTime[], route: Route, calendar: Calendar, trip_short_name: string | null = null) {
        this.tripID = trip_id;

        const first_stop = stop_times[0]
        this.departureTime = first_stop.departureDateTime || new Date()

        const last_stop = stop_times[stop_times.length - 1]
        this.arrivalTime = last_stop.arrivalDateTime || new Date();
        
        this.route = route
        this.calendar = calendar

        this.stop_times = stop_times
        this.gtfsRT = null

        this.trip_short_name = trip_short_name
    }

    public static initWithCondensedTrip(
        condensed_trip: GTFS_Static_Trip_Condensed,
        map_routes: Record<string, Route>,
        map_stops: Record<string, Stop>,
        map_calendar: Record<string, Calendar>,
        trip_day_midnight: Date | null = null
    ) {
        if (trip_day_midnight === null) {
            trip_day_midnight = Date_Helpers.setHHMMToDate(new Date(), "00:00");
        }
        
        let stop_times: StopTime[] = [];

        // 8505209:0:3||22:25 -- 8505212:0:1|22:35|22:35 -- 8505213:0:4|22:39|22:46 
        // -- 8518475:0:1|23:24|23:24 -- 8505305:0:4|23:27|
        const stops_data = condensed_trip.stop_times_s.split(' -- ');
        stops_data.forEach((stop_data_s, idx) => {
            const is_first_stop = idx === 0;
            const is_last_stop = idx === stops_data.length - 1;
            
            const stop_data_parts = stop_data_s.split('|');

            const stop_id = stop_data_parts[0];
            
            let arrival_s: string | null = null;
            if (!is_first_stop) {
                arrival_s = stop_data_parts[1];
            }

            let departure_s: string | null = null;
            if (!is_last_stop) {
                departure_s = stop_data_parts[2];
            }

            const stop = map_stops[stop_id];
            const stop_time = new StopTime(stop, idx + 1, arrival_s, departure_s, trip_day_midnight);

            stop_times.push(stop_time);
        });

        const route = map_routes[condensed_trip.route_id];

        const calendar = map_calendar[condensed_trip.service_id];
        const trip_short_name = condensed_trip.trip_short_name

        const trip = new Trip(condensed_trip.trip_id, stop_times, route, calendar, trip_short_name);

        return trip;
    }

    public isActive(interval_from: Date, interval_to: Date): boolean {
        if (this.arrivalTime < interval_from) {
            return false;
        }

        if (this.departureTime > interval_to) {
            return false;
        }

        return true;
    }

    public isFinished(request_time: Date) {
        if (this.arrivalTime < request_time) {
            return true;
        }

        return false;
    }

    public isInTheFuture(request_time: Date): Boolean {
        if (this.arrivalTime === null || this.departureTime === null) {
            return true;
        }

        if (this.departureTime > request_time) {
            return true;
        }

        return false;
    }

    public computeMapURL(request_time: Date) {
        // var webmercator = new SphericalMercator({
        //     size: 256
        // });

        let stop_position: [number, number] | null = null;

        if (this.isInTheFuture(request_time)) {
            const stop_time = this.stop_times[0];
            
            stop_position = [
                stop_time.stop.stop_lon,
                stop_time.stop.stop_lat
            ];
        }

        if (this.isFinished(request_time)) {
            const stop_time = this.stop_times[this.stop_times.length - 1];
            
            stop_position = [
                stop_time.stop.stop_lon,
                stop_time.stop.stop_lat
            ];
        }

        if (stop_position === null) {
            // loop through the stops
            this.stop_times.forEach((stop_time_b, idx) => {
                if (stop_position) {
                    return;
                }

                const is_first_stop = idx === 0;

                if (is_first_stop) {
                    return;
                }

                const stop_time_date = stop_time_b.arrivalDateTime;
                if (stop_time_date === null) {
                    return;
                }

                if (stop_time_date > request_time) {
                    const stop_time_a = this.stop_times[idx - 1];
                    if (stop_time_a.departureDateTime == null) {
                        return;
                    }

                    const stop_time_ab = (stop_time_date.getTime() - stop_time_a.departureDateTime.getTime()) / 1000;
                    const stop_time_ac = (request_time.getTime() - stop_time_a.departureDateTime.getTime()) / 1000;
                    const delta_longitude_ab = stop_time_b.stop.stop_lon - stop_time_a.stop.stop_lon;
                    const delta_latitude_ab = stop_time_b.stop.stop_lat - stop_time_a.stop.stop_lat;
                    
                    const delta_longitude_ac = stop_time_ac / stop_time_ab * delta_longitude_ab;
                    const delta_latitude_ac = stop_time_ac / stop_time_ab * delta_latitude_ab;

                    stop_position = [
                        stop_time_a.stop.stop_lon + delta_longitude_ac,
                        stop_time_a.stop.stop_lat + delta_latitude_ac
                    ];
                }
            });
        }

        if (stop_position === null) {
            return '';
        }

        // const stop_mercator_point = webmercator.forward(stop_position);
        const stop_mercator_point = [0, 1];

        const stop_x = stop_mercator_point[0];
        const stop_y = stop_mercator_point[1];
        const zoom = 15;

        const url_address = 'https://maps2.trafimage.ch/ch.sbb.netzkarte?baselayers=ch.sbb.netzkarte,ch.sbb.netzkarte.dark,ch.sbb.netzkarte.luftbild.group,ch.sbb.netzkarte.landeskarte,ch.sbb.netzkarte.landeskarte.grau&display_srs=EPSG:2056&lang=de&layers=ch.sbb.puenktlichkeit-all,ch.sbb.netzkarte.buslinien&x=' + stop_x + '&y=' + stop_y + '&z=' + zoom;

        return url_address;
    }
}

// Trip model without StopTimes
// used for quick lookups
export class TripLight {
    public tripID: string
    
    public route: Route
    public calendar: Calendar
    
    public trip_short_name: string | null
    
    constructor(trip_id: string, route: Route, calendar: Calendar, trip_short_name: string | null = null) {
        this.tripID = trip_id;

        this.route = route
        this.calendar = calendar

        this.trip_short_name = trip_short_name
    }

    public static initFromJSON(tripJSON: TripJSON, map_routes: Record<string, Route>, map_calendar: Record<string, Calendar>) {
        const trip_id = tripJSON.trip_id;
        const route_id = tripJSON.route_id;
        const service_id = tripJSON.service_id;

        const route = map_routes[route_id];
        const calendar = map_calendar[service_id];

        const trip = new TripLight(trip_id, route, calendar);

        trip.trip_short_name = tripJSON.trip_short_name;
        
        return trip;
    }
}