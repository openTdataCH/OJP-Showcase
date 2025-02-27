import { GTFS_Helpers } from "../../shared/helpers/gtfs-helpers";
import DateHelpers from "../../shared/helpers/date-helpers";
import { Trip } from "../../shared/models/gtfs/trip";
import { VehicleJourney } from "../../shared/models/siri-et/vehicle-journey";

export class MatchHelpers {
  public static computeGTFS_RT_TripStopKeys(trip: Trip): string[] {
    const keyParts: string[] = [];

    const computeStopDateKey = (stopDateF: string | null): string | null => {
      if (stopDateF === null) {
        return null;
      }
      
      // Adjust the after-midnight times if needed
      const timeSParts = stopDateF.split(':');
      const timeH_f = timeSParts[0];
      if (timeH_f > '24') {
        const timeH = Number(timeH_f) % 24;
        const newTimeH_f = ('' + timeH).padStart(2, '0');
        stopDateF = newTimeH_f + ':' + timeSParts[1];
      }

      stopDateF = stopDateF.replace(':', '');
      return stopDateF;
    };

    trip.stop_times.forEach((stopTime, idx) => {
      const stopIdKey = GTFS_Helpers.sloid2didok7(stopTime.stop.stop_id);

      const stopTimeKeys = ['arrivalTimeS', 'departureTimeS'];
      stopTimeKeys.forEach(stopTimeKeyO => {
        const stopTimeKey = stopTimeKeyO as ('arrivalTimeS' | 'departureTimeS'); 
        const stopTimeValue = computeStopDateKey(stopTime[stopTimeKey] ?? null);
        if (stopTimeValue !== null) {
          keyParts.push(stopIdKey + '=' + stopTimeValue);
        }
      });
    });

    return keyParts;
  }

  public static computeSIRI_ET_JourneyStopKeys(journey: VehicleJourney): string[] {
    const keyParts: string[] = [];

    const computeStopDateKey = (stopDate: Date | null): string | null => {
      if (stopDate === null) {
        return null;
      }
      
      let stopDateTimeF = DateHelpers.formatDateYMDHIS(stopDate);
      stopDateTimeF = stopDateTimeF.slice(11, 16).replace(':', '');

      return stopDateTimeF;
    };

    journey.serviceCalls.forEach((call, idx) => {
      const stopIdKey = GTFS_Helpers.sloid2didok7(call.stopPointRef);

      const stopTimeKeys = ['arrDateTime', 'depDateTime'];
      stopTimeKeys.forEach(stopTimeKeyO => {
        const stopTimeKey = stopTimeKeyO as ('arrDateTime' | 'depDateTime'); 
        const stopTimeValue = computeStopDateKey(call[stopTimeKey] ?? null);
        if (stopTimeValue !== null) {
          keyParts.push(stopIdKey + '=' + stopTimeValue);
        }
      });
    });

    return keyParts;
  }
}
