import { Response_GTFS_RT_Entity } from "./response_gtfs_rt"
import { Date_Helpers } from './../helpers/Date_Helpers' 
import SphericalMercator from '@mapbox/sphericalmercator'

export interface GTFS_Static_Trip_Condensed {
    trip_id: string,
    trip_short_name: string,
    route_id: string,
    stop_times_s: string
}

export class GTFS_Static_Trip {
    public tripID: string
    public departureTime: Date
    public arrivalTime: Date
    public route: GTFS.Route
    public agency: GTFS.Agency
    public stop_times: GTFS.Stop_Time[]
    
    public gtfsRT: Response_GTFS_RT_Entity | null
    
    constructor(trip_id: string, stop_times: GTFS.Stop_Time[], agency: GTFS.Agency, route: GTFS.Route) {
        this.tripID = trip_id;

        const first_stop = stop_times[0]
        this.departureTime = first_stop.stop_departure || new Date()

        const last_stop = stop_times[stop_times.length - 1]
        this.arrivalTime = last_stop.stop_arrival || new Date();
        
        this.route = route
        this.agency = agency
        this.stop_times = stop_times
        this.gtfsRT = null
    }

    public static initWithCondensedTrip(condensed_trip: GTFS_Static_Trip_Condensed, agency: GTFS.Agency, route: GTFS.Route, trip_day_midnight: Date, map_gtfs_stops: Record<string, GTFS.Stop>) {
        let stop_times: GTFS.Stop_Time[] = [];

        const stops_data = condensed_trip.stop_times_s.split(' -- ');
        stops_data.forEach((stop_data_s, idx) => {
            const is_first_stop = idx === 0;
            const is_last_stop = idx === stops_data.length - 1;
            
            const stop_data_parts = stop_data_s.split('|');

            const stop_id = stop_data_parts[0];
            
            let stop_arrival = null;
            if (!is_first_stop) {
                const arrival_s = stop_data_parts[1];
                stop_arrival = Date_Helpers.setHHMMToDate(trip_day_midnight, arrival_s);
            }

            let stop_departure = null;
            if (!is_last_stop) {
                const departure_s = stop_data_parts[2];
                stop_departure = Date_Helpers.setHHMMToDate(trip_day_midnight, departure_s);
            }

            const stop = map_gtfs_stops[stop_id];

            const stop_time = <GTFS.Stop_Time>{
                stop: stop,
                stop_arrival: stop_arrival,
                stop_departure: stop_departure,
            };

            stop_times.push(stop_time);
        });

        const trip = new GTFS_Static_Trip(condensed_trip.trip_id, stop_times, agency, route);
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
        var webmercator = new SphericalMercator({
            size: 256
        });

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
                const is_last_stop = idx === this.stop_times.length - 1;

                if (is_first_stop) {
                    return;
                }

                const stop_time_date = stop_time_b.stop_arrival;
                if (stop_time_date === null) {
                    return;
                }

                if (stop_time_date > request_time) {
                    const stop_time_a = this.stop_times[idx - 1];
                    if (stop_time_a.stop_departure == null) {
                        return;
                    }

                    const stop_time_ab = (stop_time_date.getTime() - stop_time_a.stop_departure.getTime()) / 1000;
                    const stop_time_ac = (request_time.getTime() - stop_time_a.stop_departure.getTime()) / 1000;
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

        const stop_mercator_point = webmercator.forward(stop_position);
        const stop_x = stop_mercator_point[0];
        const stop_y = stop_mercator_point[1];
        const zoom = 15;

        const url_address = 'https://maps2.trafimage.ch/ch.sbb.netzkarte?baselayers=ch.sbb.netzkarte,ch.sbb.netzkarte.dark,ch.sbb.netzkarte.luftbild.group,ch.sbb.netzkarte.landeskarte,ch.sbb.netzkarte.landeskarte.grau&display_srs=EPSG:2056&lang=de&layers=ch.sbb.puenktlichkeit-all,ch.sbb.netzkarte.buslinien&x=' + stop_x + '&y=' + stop_y + '&z=' + zoom;

        return url_address;
    }
}