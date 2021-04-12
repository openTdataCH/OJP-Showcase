import { EndpointType } from '../endpoint-type'

// TODO - waaaay outside of the SDK - make it more generic
import HRDF_Stop from '../../../models/HRDF_Stop'

import XpathOJP from '../../helpers/xpath-ojp'

export class LegEndpoint {
    stopPointRef: string
    plannedPlatform: string | null
    stopPoint: HRDF_Stop | null // Use an app singleton?

    constructor(stopPointRef: string) {
        this.stopPointRef = stopPointRef
        this.plannedPlatform = null
        this.stopPoint = null
    }

    public static initFromTripLeg(timedLegNode: Node, endpointType: EndpointType): LegEndpoint | null {
        const legNodeDataS = endpointType == 'From' ? 'ojp:LegBoard' : 'ojp:LegAlight'
        const legEndpointNode = XpathOJP.queryNode(legNodeDataS, timedLegNode);
        if (legEndpointNode === null) {
            return null;
        }

        const stopPointRef = XpathOJP.queryText('siri:StopPointRef', legEndpointNode);
        if (stopPointRef === null) {
            return null;
        }

        const legTimeNodeS = endpointType == 'From' ? 'ojp:ServiceDeparture' : 'ojp:ServiceArrival';
        const legTimeNode = XpathOJP.queryNode(legTimeNodeS, legEndpointNode);
        if (legTimeNode === null) {
            return null;
        }

        const timetableTimeS = XpathOJP.queryText('ojp:TimetabledTime', legTimeNode);
        if (timetableTimeS === null) {
            return null;
        }

        const timetableTime = new Date(Date.parse(timetableTimeS));
        const timetableStopTime = <StopPointTime>{
            timetabledTime: timetableTime
        }

        const estimatedTimeS = XpathOJP.queryText('ojp:EstimatedTime', legTimeNode);
        if (estimatedTimeS) {
            const estimatedTime = new Date(Date.parse(estimatedTimeS));
            timetableStopTime.estimatedTime = estimatedTime;

            const dateDiffSeconds = (estimatedTime.getTime() - timetableTime.getTime()) / 1000;
            timetableStopTime.delayMinutes = Math.floor(dateDiffSeconds / 60);
        }

        let legEndpoint;
        if (endpointType == 'From') {
            legEndpoint = new LegFromEndpoint(stopPointRef, timetableStopTime);
        } else {
            legEndpoint = new LegToEndpoint(stopPointRef, timetableStopTime);
        }

        const plannedQuay = XpathOJP.queryText('ojp:PlannedQuay/ojp:Text', legEndpointNode);
        if (plannedQuay) {
            legEndpoint.plannedPlatform = plannedQuay;
        }

        return legEndpoint;
    }
}

export class LegFromEndpoint extends LegEndpoint {
    departureData: StopPointTime

    constructor(stopPointRef: string, departureData: StopPointTime) {
        super(stopPointRef)
        this.departureData = departureData
    }
}

export class LegToEndpoint extends LegEndpoint {
    arrivalData: StopPointTime

    constructor(stopPointRef: string, arrivalData: StopPointTime) {
        super(stopPointRef)
        this.arrivalData = arrivalData
    }
}