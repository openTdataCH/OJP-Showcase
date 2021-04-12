import mapboxgl, { LngLatLike } from 'mapbox-gl'
import HRDF_Stops_Layer from '../map/layers/hrdf_stops_layer';
import HRDF_Stop from '../models/HRDF_Stop';
import Render_Trips_Controller from './render_trips_controller'

import * as OJP from '../ojp-sdk/index'

enum Sample_Points {
    "Zürich" = "8503000",
    "Bern" = "8507000",
    "Witikon" = "8591107",
    "Schilthorn" = "8507457",
}

interface IRouteData {
    marker: mapboxgl.Marker; // TODO check if we actually we need this
    inputElement: HTMLInputElement
    panMapLabelEl: HTMLElement
    endpoint: HRDF_Stop | null
}

export default class MapRouteController {
    private stopsMapLayer: HRDF_Stops_Layer;
    private mapRouteData: Record<OJP.EndpointType, IRouteData>;
    private renderTripsController: Render_Trips_Controller

    constructor(stopsMapLayer: HRDF_Stops_Layer) {
        this.stopsMapLayer = stopsMapLayer;
        this.renderTripsController = new Render_Trips_Controller(stopsMapLayer);

        const routeDataFrom = <IRouteData>{
            marker: new mapboxgl.Marker(),
            inputElement: document.getElementById('ojp_route_from') as HTMLInputElement,
            panMapLabelEl: document.getElementById('ojp_route_from_pan_btn') as HTMLInputElement,
            endpoint: null,
        };
        const routeDataTo = <IRouteData>{
            marker: new mapboxgl.Marker(),
            inputElement: document.getElementById('ojp_route_to') as HTMLInputElement,
            panMapLabelEl: document.getElementById('ojp_route_to_pan_btn') as HTMLInputElement,
            endpoint: null,
        };

        this.mapRouteData = {
            From: routeDataFrom,
            To: routeDataTo
        };

        stopsMapLayer.geojsonPromise.then(geojson => {
            const fromStop = this.stopsMapLayer.queryFeatureByStopId(Sample_Points.Bern);
            const toStop = this.stopsMapLayer.queryFeatureByStopId(Sample_Points.Zürich);

            if (!(fromStop && toStop)) {
                console.log('ERROR MapRouteController.constructor');
                return
            }

            this.mapRouteData.From.endpoint = fromStop
            this.mapRouteData.To.endpoint = toStop

            this.mapRouteData.From.marker.setLngLat(fromStop.geometry.coordinates as mapboxgl.LngLatLike)
            this.mapRouteData.To.marker.setLngLat(toStop.geometry.coordinates as mapboxgl.LngLatLike)

            this.computeRoute();
        });
    }

    public addToMap(map: mapboxgl.Map) {
        this.stopsMapLayer.geojsonPromise.then(geojson => {
            this.loadMapMarkers(map);

            // Route_HRDF_Stop
            this.stopsMapLayer.onPopupChooseRoutePoint(routeMapStop => {
                const routeEndpointType = routeMapStop.routeEndpointType as OJP.EndpointType;
                const routeEndpointData = this.mapRouteData[routeEndpointType];

                routeEndpointData.endpoint = routeMapStop.mapStop;
                routeEndpointData.inputElement.value = routeMapStop.mapStop.stop_name;
                routeEndpointData.marker.setLngLat(routeMapStop.mapStop.geometry.coordinates as LngLatLike);
    
                this.computeRoute();
            });
        });
    }

    private loadMapMarkers(map: mapboxgl.Map) {
        const routeEndpoints: OJP.EndpointType[] = ["From", "To"]

        routeEndpoints.forEach(endpointType => {
            const routeEndpointData = this.mapRouteData[endpointType];

            const mapStop = routeEndpointData.endpoint as HRDF_Stop;
            if (mapStop === null) {
                console.log('ERROR - loadMapMarkers - no stop defined for ' + endpointType);
                return
            }

            const marker = routeEndpointData.marker;
            marker.setDraggable(true);
            marker.setLngLat(mapStop.geometry.coordinates as mapboxgl.LngLatLike);
            marker.addTo(map);

            const endpointInput = routeEndpointData.inputElement;
            endpointInput.value = mapStop.stop_name;

            const panMapLabel = routeEndpointData.panMapLabelEl;
            panMapLabel.addEventListener('click', () => {
                map.setCenter(marker.getLngLat());
                map.setZoom(16);
            });

            marker.on('dragend', () => {
                const lnglat = marker.getLngLat();
                const nearbyStop = this.stopsMapLayer.findNearbyFeature(map, lnglat);
                if (nearbyStop) {
                    routeEndpointData.inputElement.value = nearbyStop.stop_name;
                    routeEndpointData.marker.setLngLat(nearbyStop.geometry.coordinates as mapboxgl.LngLatLike)
                } else {
                    const lngLatS = lnglat.lng.toFixed(6).toString() + ',' + lnglat.lat.toFixed(6).toString();
                    routeEndpointData.inputElement.value = lngLatS;
                }
                
                this.computeRoute();
            });
        });
    }

    private computeRoute() {
        const tripRequestFrom = this.mapRouteData.From.marker.getLngLat()
        const tripRequestTo = this.mapRouteData.To.marker.getLngLat()

        const tripRequestParams = <OJP.TripRequestParams>{
            NumberOfResults: 4,
            IncludeTrackSections: true,
            IncludeLegProjection: true,
        };
        const tripRequest = new OJP.TripRequest(tripRequestFrom, tripRequestTo, tripRequestParams);
        tripRequest.computeTrips(trips => {
            this.renderTripsController.renderTrips(trips);
        });
    }
}