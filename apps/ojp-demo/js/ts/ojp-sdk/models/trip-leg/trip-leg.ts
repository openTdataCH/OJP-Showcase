import { Duration } from '../duration'
import { Location } from './location'

import LegService from '../leg-service'
import { LegEndpoint, LegFromEndpoint, LegToEndpoint } from './leg-endpoint'

import Date_Helpers from '../../helpers/date_helpers'
import XpathOJP from '../../helpers/xpath-ojp'

export class TripLeg {
    constructor() {
        // 
    }

    public static initFromTripLeg(tripLegNode: Node) {
        const tripContinousLeg = TripContinousLeg.initFromTripLeg(tripLegNode);
        if (tripContinousLeg) {
            return tripContinousLeg;
        }

        const tripTimedLeg = TripTimedLeg.initFromTripLeg(tripLegNode);
        if (tripTimedLeg) {
            return tripTimedLeg;
        }

        const transferLeg = TripTransferLeg.initFromTripLeg(tripLegNode);
        if (transferLeg) {
            return transferLeg;
        }

        console.log('Cant factory leg');
        console.log(tripLegNode);
        debugger;

        return null;
    }
}

export class TripContinousLeg extends TripLeg {
    public legModeS: string
    public legDuration: Duration
    public legDistance: number
    public fromLocation: Location
    public toLocation: Location

    constructor(legModeS: string, legDuration: Duration, legDistance: number, fromLocation: Location, toLocation: Location) {
        super()

        this.legModeS = legModeS
        this.legDuration = legDuration
        this.legDistance = legDistance
        this.fromLocation = fromLocation
        this.toLocation = toLocation
    }

    public static initFromTripLeg(tripLegNode: Node): TripContinousLeg | null {
        const legNode = XpathOJP.queryNode('ojp:ContinuousLeg', tripLegNode)
        if (legNode === null) {
            return null;
        }

        const fromLocation = Location.initFromLocationNodeS('ojp:LegStart', legNode)
        const toLocation = Location.initFromLocationNodeS('ojp:LegEnd', legNode)

        if (!(fromLocation && toLocation)) {
            return null
        }

        const legModeS = XpathOJP.queryText('ojp:Service/ojp:IndividualMode', legNode)
        if (legModeS === null) {
            return null
        }

        const durationS = XpathOJP.queryText('ojp:Duration', legNode)
        if (durationS === null) {
            return null;
        }
        
        let distanceS = XpathOJP.queryText('ojp:Length', legNode)
        if (distanceS === null) {
            // TODO - fixme
            distanceS = '0';
        }

        const legDuration = Date_Helpers.formatDuration(durationS)
        const legDistance = parseInt(distanceS)

        const tripLeg = new TripContinousLeg(legModeS, legDuration, legDistance, fromLocation, toLocation);

        return tripLeg;
    }
}

export class TripTimedLeg extends TripLeg {
    public service: LegService
    public fromEndpoint: LegFromEndpoint
    public toEndpoint: LegToEndpoint

    constructor(service: LegService, fromEndpoint: LegFromEndpoint, toEndpoint: LegToEndpoint) {
        super();
        this.service = service;
        this.fromEndpoint = fromEndpoint
        this.toEndpoint = toEndpoint
    }

    public static initFromTripLeg(tripLegNode: Node): TripTimedLeg | null {
        const legNode = XpathOJP.queryNode('ojp:TimedLeg', tripLegNode)
        if (legNode === null) {
            return null;
        }

        const service = LegService.initFromTripLeg(legNode);
        const fromEndpoint = LegEndpoint.initFromTripLeg(legNode, 'From') as LegFromEndpoint;
        const toEndpoint = LegEndpoint.initFromTripLeg(legNode, 'To') as LegToEndpoint;

        if (service && fromEndpoint && toEndpoint) {
            const tripLeg = new TripTimedLeg(service, fromEndpoint, toEndpoint);
            return tripLeg;
        }

        return null;
    }

    public computeDepartureTime(): Date {
        const stopPointTime = this.fromEndpoint.departureData;
        const stopPointDate = stopPointTime.estimatedTime ?? stopPointTime.timetabledTime;
        return stopPointDate
    }

    public computeArrivalTime(): Date {
        const stopPointTime = this.toEndpoint.arrivalData;
        const stopPointDate = stopPointTime.estimatedTime ?? stopPointTime.timetabledTime;
        return stopPointDate
    }
}

// TODO - partly similar with TripContinousLeg - extend?
export class TripTransferLeg extends TripLeg {
    public legModeS: string
    public legDuration: Duration
    public fromLocation: Location
    public toLocation: Location

    constructor(legModeS: string, legDuration: Duration, fromLocation: Location, toLocation: Location) {
        super()

        this.legModeS = legModeS
        this.legDuration = legDuration
        this.fromLocation = fromLocation
        this.toLocation = toLocation
    }

    public static initFromTripLeg(tripLegNode: Node): TripTransferLeg | null {
        const legNode = XpathOJP.queryNode('ojp:TransferLeg', tripLegNode)
        if (legNode === null) {
            return null;
        }

        const fromLocation = Location.initFromLocationNodeS('ojp:LegStart', legNode)
        const toLocation = Location.initFromLocationNodeS('ojp:LegEnd', legNode)

        if (!(fromLocation && toLocation)) {
            return null
        }

        const legModeS = XpathOJP.queryText('ojp:TransferMode', legNode)
        if (legModeS === null) {
            return null
        }

        let durationS = XpathOJP.queryText('ojp:WalkDuration', legNode)
        if (durationS === null) {
            durationS = XpathOJP.queryText('ojp:Duration', legNode)
            if (durationS === null) {
                return null;
            }
        }

        const legDuration = Date_Helpers.formatDuration(durationS)

        const tripLeg = new TripTransferLeg(legModeS, legDuration, fromLocation, toLocation);

        return tripLeg;
    }
}