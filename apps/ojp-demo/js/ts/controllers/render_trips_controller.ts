import HRDF_Stops_Layer from '../map/layers/hrdf_stops_layer';

import Date_Helpers from '../helpers/date_helpers';
import * as OJP from '../ojp-sdk/index';

export default class Render_Trips_Controller {
    private mapHTMLTemplates: Record<string, string>;
    private tripsContainer: HTMLElement;
    private stopsMapLayer: HRDF_Stops_Layer;

    constructor(stopsMapLayer: HRDF_Stops_Layer) {
        this.stopsMapLayer = stopsMapLayer;

        this.mapHTMLTemplates = {
            trip_card: (document.getElementById('template_trip-card') as HTMLElement).innerHTML,
            trip_leg_walk: (document.getElementById('template_trip-leg-walk') as HTMLElement).innerHTML,
            trip_leg_service: (document.getElementById('template_trip-leg-service') as HTMLElement).innerHTML,
        };

        this.tripsContainer = document.getElementById('trips_wrapper') as HTMLElement;
    }

    renderTrips(trips: OJP.Trip[]) {
        let tripCards: string[] = [];

        trips.forEach((trip, tripIDx) => {
            const tripCard = this.renderTripCard(trip, tripIDx);
            tripCards.push(tripCard);
        });

        const tripCardsS = tripCards.join("\n");
        this.tripsContainer.innerHTML = tripCardsS;
    }

    private renderTripCard(trip: OJP.Trip, tripIDx: number): string {
        let tripCardHTML = this.mapHTMLTemplates.trip_card.slice();

        // Trip 1 - 3 changes
        let tripTitle = 'Trip ' + (tripIDx + 1).toString() + ' -  ' + trip.stats.transferNo.toString() + ' transfers';
        tripTitle = 'Trip ' + (tripIDx + 1).toString();
        tripCardHTML = tripCardHTML.replace('[TRIP_TITLE]', tripTitle);

        const tripDepartureTimeS = this.renderTime(trip.computeDepartureTime());
        tripCardHTML = tripCardHTML.replace('[TRIP_FROM_TIME]', tripDepartureTimeS);

        const tripArrivalTimeS = this.renderTime(trip.computeArrivalTime());
        tripCardHTML = tripCardHTML.replace('[TRIP_TO_TIME]', tripArrivalTimeS);

        let tripLegsHTML: string[] = [];
        trip.legs.forEach((tripLeg, legIdx) => {
            let tripLegHTML = this.computeTripLegHTML(tripLeg);

            const isLastLeg = legIdx === trip.legs.length - 1;
            const bottomBorderClass = isLastLeg ? '' : 'border-bottom';
            tripLegHTML = tripLegHTML.replace('[BOTTOM_BORDER_CLASS]', bottomBorderClass);

            tripLegsHTML.push(tripLegHTML);
        });

        const tripLegsS = tripLegsHTML.join("\n");
        tripCardHTML = tripCardHTML.replace('[TRIP_LEGS]', tripLegsS);

        return tripCardHTML;
    }

    private renderTime(date: Date | null): string {
        if (date === null) {
            return 'n/a';
        }

        const dateFormattedS = Date_Helpers.formatDateYMDHIS(date);
        
        return dateFormattedS.substr(11,5);
    }

    private computeTripLegHTML(tripLeg: OJP.TripLeg): string {
        if (tripLeg instanceof OJP.TripTimedLeg) {
            return this.computeTripTimedLegHTML(tripLeg as OJP.TripTimedLeg);
        }

        if (tripLeg instanceof OJP.TripContinousLeg) {
            return this.computeTripContinousLegHTML(tripLeg as OJP.TripContinousLeg);
        }

        if (tripLeg instanceof OJP.TripTransferLeg) {
            return this.computeTripContinousLegHTML(tripLeg as OJP.TripTransferLeg);
        }

        console.log('UNKNOWN leg');
        console.log(tripLeg);

        return 'Unknown Leg: ';
    }

    private computeTripTimedLegHTML(tripLeg: OJP.TripTimedLeg): string {
        let tripLegHTML = this.mapHTMLTemplates.trip_leg_service.slice();

        const modeTransportClass = tripLeg.service.ptMode.isRail() ? 'mode-transport-train' : 'mode-transport-bus';
        tripLegHTML = tripLegHTML.replace('[MODE_TRANSPORT_CLASS]', modeTransportClass);

        const serviceLineClass = tripLeg.service.ptMode.isRail() ? 'service-line-train' : 'service-line-bus';
        tripLegHTML = tripLegHTML.replace('[SERVICE_LINE_CLASS]', serviceLineClass);
        
        const serviceLineNumberS = tripLeg.service.serviceLineNumber ?? '';
        tripLegHTML = tripLegHTML.replace('[SERVICE_LINE]', serviceLineNumberS);

        const fromStopID = tripLeg.fromEndpoint.stopPointRef
        let fromStopS = fromStopID
        const fromStop = this.stopsMapLayer.queryFeatureByStopId(fromStopID)
        if (fromStop) {
            fromStopS = fromStop.stop_name
        }
        tripLegHTML = tripLegHTML.replace('[TRIP_LEG_FROM]', fromStopS);

        const toStopID = tripLeg.toEndpoint.stopPointRef
        let toStopS = toStopID
        const toStop = this.stopsMapLayer.queryFeatureByStopId(toStopID)
        if (toStop) {
            toStopS = toStop.stop_name
        }
        tripLegHTML = tripLegHTML.replace('[TRIP_LEG_TO]', toStopS);

        const serviceIntermediartStopsInfo = 'WIP: intermediary stops';
        tripLegHTML = tripLegHTML.replace('[SERVICE_INTERMEDIARY_STOPS_INFO]', serviceIntermediartStopsInfo);

        const fromTimeS = this.renderTime(tripLeg.computeDepartureTime());
        tripLegHTML = tripLegHTML.replace('[TRIP_LEG_FROM_TIME]', fromTimeS);
        
        const toTimeS = this.renderTime(tripLeg.computeArrivalTime());
        tripLegHTML = tripLegHTML.replace('[TRIP_LEG_TO_TIME]', toTimeS);

        const fromPlatformS = tripLeg.fromEndpoint.plannedPlatform ?? '';
        tripLegHTML = tripLegHTML.replace('[TRIP_LEG_FROM_PLATFORM]', fromPlatformS);

        const toPlatformS = tripLeg.toEndpoint.plannedPlatform ?? '';
        tripLegHTML = tripLegHTML.replace('[TRIP_LEG_TO_PLATFORM]', toPlatformS);

        let fromTimeDelayS = '';
        const fromDelayMinutes = tripLeg.fromEndpoint.departureData.delayMinutes;
        if (fromDelayMinutes) {
            if (fromDelayMinutes > 0) {
                fromTimeDelayS += '+';
            } 
            fromTimeDelayS += fromDelayMinutes.toString() + "'";
        }
        tripLegHTML = tripLegHTML.replace('[TRIP_LEG_FROM_TIME_DELAY]', fromTimeDelayS);
        
        let toTimeDelayS = '';
        const toDelayMinutes = tripLeg.toEndpoint.arrivalData.delayMinutes;
        if (toDelayMinutes) {
            if (toDelayMinutes > 0) {
                toTimeDelayS += '+';
            } 
            toTimeDelayS += toDelayMinutes.toString() + "'";
        }
        tripLegHTML = tripLegHTML.replace('[TRIP_LEG_TO_TIME_DELAY]', toTimeDelayS);

        return tripLegHTML;
    }

    private computeTripContinousLegHTML(tripLeg: OJP.TripContinousLeg | OJP.TripTransferLeg): string {
        let tripLegHTML = this.mapHTMLTemplates.trip_leg_walk.slice();

        const modeTransportClass = 'mode-transport-walk';
        tripLegHTML = tripLegHTML.replace('[MODE_TRANSPORT_CLASS]', modeTransportClass);

        let legDistanceS = '';
        if (tripLeg instanceof OJP.TripContinousLeg) {
            let tripContinousLeg = tripLeg as OJP.TripContinousLeg;
            const legDistance = tripContinousLeg.legDistance;
            legDistanceS = legDistance.toString() + 'm';
        }
        tripLegHTML = tripLegHTML.replace('[TRIP_LEG_DISTANCE]', legDistanceS);

        const locationFromS = tripLeg.fromLocation.name;
        tripLegHTML = tripLegHTML.replace('[TRIP_LEG_FROM]', locationFromS);

        const locationToS = tripLeg.toLocation.name;
        tripLegHTML = tripLegHTML.replace('[TRIP_LEG_TO]', locationToS);
        
        const legDurationS = this.formatLegDuration(tripLeg.legDuration);
        tripLegHTML = tripLegHTML.replace('[TRIP_LEG_DURATION]', legDurationS);

        return tripLegHTML;
    }

    private formatLegDuration(duration: OJP.Duration): string {
        let durationParts: string[] = [];

        if (duration.hours > 0) {
            durationParts.push(duration.hours.toString() + ' h');
        }

        durationParts.push(duration.minutes.toString() + ' min');

        const durationPartsS = durationParts.join(' ');
        
        return durationPartsS;
    }
}