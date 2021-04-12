import { TripStats } from './trip-stats'
import { TripLeg, TripTimedLeg } from './trip-leg/trip-leg'

import XpathOJP from '../xml/xpath-ojp'
import Date_Helpers from '../helpers/date_helpers'

export class Trip {
    public id: string
    public legs: TripLeg[]
    public stats: TripStats
    
    constructor(tripID: string, legs: TripLeg[], tripStats: TripStats) {
        this.id = tripID;
        this.legs = legs;
        this.stats = tripStats
    }

    public static initFromTripResultNode(tripResultNode: Node) {
        const tripId = XpathOJP.queryText('ojp:Trip/ojp:TripId', tripResultNode)
        if (tripId === null) {
            return null;
        }

        const durationS = XpathOJP.queryText('ojp:Trip/ojp:Duration', tripResultNode)
        if (durationS === null) {
            return null;
        }
        
        const distanceS = XpathOJP.queryText('ojp:Trip/ojp:Distance', tripResultNode)
        if (distanceS === null) {
            return null;
        }

        const transfersNoS = XpathOJP.queryText('ojp:Trip/ojp:Transfers', tripResultNode)
        if (transfersNoS === null) {
            return null;
        }

        const tripStats = <TripStats>{
            duration: Date_Helpers.formatDuration(durationS),
            distanceMeters: parseInt(distanceS),
            transferNo: parseInt(transfersNoS)
        }

        let legs: TripLeg[] = [];
        
        const tripResponseLegs = XpathOJP.queryNodes('ojp:Trip/ojp:TripLeg', tripResultNode)
        tripResponseLegs.forEach(tripLegNode => {
            const tripLeg = TripLeg.initFromTripLeg(tripLegNode);
            if (tripLeg === null) {
                return
            }

            legs.push(tripLeg);
        })

        const trip = new Trip(tripId, legs, tripStats);
        
        return trip;
    }

    public computeDepartureTime(): Date | null {
        const timedLegs = this.legs.filter(leg => {
            return leg instanceof TripTimedLeg;
        });

        if (timedLegs.length === 0) {
            console.log('No TimedLeg found for this trip');
            console.log(this);
            return null;
        }

        const firstTimedLeg = timedLegs[0] as TripTimedLeg;
        const stopPointTime = firstTimedLeg.fromEndpoint.departureData;
        const stopPointDate = stopPointTime.estimatedTime ?? stopPointTime.timetabledTime;
        
        return stopPointDate;
    }

    public computeArrivalTime(): Date | null {
        const timedLegs = this.legs.filter(leg => {
            return leg instanceof TripTimedLeg;
        });

        if (timedLegs.length === 0) {
            console.log('No TimedLeg found for this trip');
            console.log(this);
            return new Date();
        }

        const lastTimedLeg = timedLegs[timedLegs.length - 1] as TripTimedLeg;
        const stopPointTime = lastTimedLeg.toEndpoint.arrivalData;
        const stopPointDate = stopPointTime.estimatedTime ?? stopPointTime.timetabledTime;
        
        return stopPointDate;
    }
}