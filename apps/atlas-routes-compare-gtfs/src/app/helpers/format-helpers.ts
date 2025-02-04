import { GTFS_Helpers } from "../../shared/helpers/gtfs-helpers";
import { Trip } from "../../shared/models/gtfs/trip";

export class FormatHelpers {
  public static computeTripStopsText(trip: Trip): string {
    const tripStopTimes: string[] = [];
    trip.stop_times.forEach(stopTime => {
      const tripStopTime = stopTime.stop.stop_name;
      tripStopTimes.push(tripStopTime);
    });

    const tripStopTimesS = tripStopTimes.join(' - ');
    return tripStopTimesS;
  }

  public static computeTripSloids(trip: Trip): string {
    const tripSloids: string[] = [];
    
    trip.stop_times.forEach(stopTime => {
      const sloid = GTFS_Helpers.convertToSloid(stopTime.stop.stop_id);
      
      tripSloids.push(sloid);
    });

    const tripSloidsS = tripSloids.join(' - ');
    return tripSloidsS;
  }
}