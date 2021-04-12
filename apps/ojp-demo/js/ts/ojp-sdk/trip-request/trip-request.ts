import { DOMParser } from 'xmldom'
import xmlbuilder, { XMLElement } from 'xmlbuilder';

import mapboxgl from 'mapbox-gl';

import { EndpointType } from '../models/endpoint-type'
import { TripRequestParams } from '../models/trip-request-params'

import { Trip } from '../models/trip'
import XpathOJP from '../xml/xpath-ojp'

// Docs: https://opentransportdata.swiss/de/cookbook/ojptriprequest/

type StopPlaceRef = string
type GeoPosition = mapboxgl.LngLat

type TripRequestEndpoint = StopPlaceRef | GeoPosition

export class TripRequest {
    private mapRouteEndPoints: Record<EndpointType, TripRequestEndpoint>;
    private tripRequestParams: TripRequestParams;

    constructor(fromEndPoint: TripRequestEndpoint, toEndPoint: TripRequestEndpoint, tripRequestParams: TripRequestParams = {}) {
        this.mapRouteEndPoints = {
            From: fromEndPoint,
            To: toEndPoint
        }

        const defaultParams = <TripRequestParams>{
            NumberOfResults: 4,
            IncludeTrackSections: false,
            IncludeLegProjection: false,
            IncludeTurnDescription: false,
            IncludeIntermediateStops: false,
        };
        this.tripRequestParams = {...defaultParams, ...tripRequestParams};
    }

    public computeTrips(completion: (trips: Trip[]) => void) {
        const tripRequestXML = this.computeTripRequestPayload();
        this.fetchTripRequest(tripRequestXML, responseXML => {
            this.parseTripRequestResponse(responseXML, completion);
        });
    }

    private computeTripRequestPayload(): XMLElement {
        const ojpXML = xmlbuilder.create('OJP', {
            encoding: 'utf-8',
        });

        ojpXML.att('xmlns', 'http://www.siri.org.uk/siri');
        ojpXML.att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        ojpXML.att('xmlns:xsd', 'http://www.w3.org/2001/XMLSchema');
        ojpXML.att('xmlns:ojp', 'http://www.vdv.de/ojp');
        ojpXML.att('xsi:schemaLocation', 'http://www.siri.org.uk/siri ../ojp-xsd-v1.0/OJP.xsd');
        ojpXML.att('version', '1.0');

        const xmlServiceRequest = ojpXML.ele('OJPRequest').ele('ServiceRequest');

        const requestTimestamp = new Date().toISOString();
        xmlServiceRequest.ele('RequestTimestamp', requestTimestamp);
        xmlServiceRequest.ele('RequestorRef', 'OJP SDK v1.0');

        const tripRequestNode = xmlServiceRequest.ele('ojp:OJPTripRequest');

        const routeEndpoints: EndpointType[] = ["From", "To"]
        routeEndpoints.forEach(routeEndPointType => {
            let tagName = "Origin";
            if (routeEndPointType === "To") {
                tagName = "Destination";
            }

            const endPointNode = tripRequestNode.ele('ojp:' + tagName);
            const placeRefNode = endPointNode.ele('ojp:PlaceRef');

            const routeEndPoint = this.mapRouteEndPoints[routeEndPointType];
            if (typeof routeEndPoint === "string") {
                placeRefNode.ele('StopPointRef', routeEndPoint)
            }

            if (routeEndPoint.hasOwnProperty("lng")) {
                const endPointCoords = routeEndPoint as mapboxgl.LngLat;

                const geoPositionNode = placeRefNode.ele('ojp:GeoPosition');
                geoPositionNode.ele('Longitude', endPointCoords.lng);
                geoPositionNode.ele('Latitude', endPointCoords.lat);
            }
        });

        const tripRequestParamsNode = tripRequestNode.ele('ojp:Params');
        
        // TODO - this seems to be ignored
        tripRequestParamsNode.ele('ojp:NumberOfResults', this.tripRequestParams.NumberOfResults);
        
        tripRequestParamsNode.ele('ojp:IncludeTrackSections', this.tripRequestParams.IncludeTrackSections);
        tripRequestParamsNode.ele('ojp:IncludeLegProjection', this.tripRequestParams.IncludeLegProjection);
        tripRequestParamsNode.ele('ojp:IncludeTurnDescription', this.tripRequestParams.IncludeTurnDescription);
        tripRequestParamsNode.ele('ojp:IncludeIntermediateStops', this.tripRequestParams.IncludeIntermediateStops);
        
        return ojpXML;
    }

    private async fetchTripRequest(requestXML: XMLElement, completion: (responseXML: Document) => void) {
        const apiEndpoint = 'https://api.opentransportdata.swiss/ojp2020';
        const requestHeaders = {
            "Content-Type": "application/xml",
            "Authorization": "Bearer 57c5dbbbf1fe4d000100001842c323fa9ff44fbba0b9b925f0c052d1"
        };

        const responsePromise = await fetch(apiEndpoint, {
            headers: requestHeaders,
            body: requestXML.end(),
            method: 'POST'
        });

        const responseXMLText = await responsePromise.text();

        const responseXML = new DOMParser().parseFromString(responseXMLText, 'application/xml');
        completion(responseXML);
    }

    private parseTripRequestResponse(responseXML: Document, completion: (trips: Trip[]) => void) {
        const tripResultNodes = XpathOJP.queryNodes('//ojp:TripResult', responseXML);

        let trips: Trip[] = [];
        
        tripResultNodes.forEach(tripResult => {
            const trip = Trip.initFromTripResultNode(tripResult as Node);
            if (trip === null) {
                return
            }
            
            trips.push(trip);
        });

        completion(trips);
    } 
}