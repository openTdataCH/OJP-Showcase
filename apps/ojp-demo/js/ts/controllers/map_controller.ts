import mapboxgl from 'mapbox-gl'

import DebugController from './../map/controls/debug_control/debug_control';

import Logger from '../helpers/logger'
import GeoJSONMapLayer from '../map/layers/geojson_map_layer';
import MapRouteController from './map_route_controller';

export default class MapController {
    public mapLoadingPromise: Promise<mapboxgl.Map> | null;
    
    constructor() {
        Logger.logMessage('MapController', 'constructor');
        this.mapLoadingPromise = null;
    }

    public initMap(mapElementID: string) {
        const map = new mapboxgl.Map({
            container: mapElementID,
            style: 'mapbox://styles/mapbox/light-v10',
            bounds: [[5.9559,45.818], [10.4921,47.8084]],
            accessToken: 'pk.eyJ1IjoidmFzaWxlIiwiYSI6ImNra2k2dWFkeDFrbG0ycXF0Nmg0Z2tsNXAifQ.nK-i-3cpWmji7HvK1Ilynw',
        });

        const nav_control = new mapboxgl.NavigationControl({
            showCompass: false,
            visualizePitch: false
        });
        map.addControl(nav_control);
        
        const scale_control = new mapboxgl.ScaleControl({
            maxWidth: 200,
            unit: 'metric'
        });
        map.addControl(scale_control);
        
        const debug_controller = new DebugController();
        map.addControl(debug_controller, 'top-left');

        Logger.logMessage('MapController', 'MAP init');

        this.mapLoadingPromise = new Promise<mapboxgl.Map>((resolve, reject) => {
            map.on('load', () => {
                Logger.logMessage('MapController', 'MapController.mapLoadingPromise');
                resolve(map);
            });
        });
    }

    public addLayer(mapLayer: GeoJSONMapLayer) {
        this.mapLoadingPromise?.then(map => {
            Logger.logMessage('MapController', 'MapController.addLayer ' + mapLayer.layerName);
            mapLayer.addToMap(map);
        });
    }

    public addRouteController(mapRouteController: MapRouteController) {
        this.mapLoadingPromise?.then(map => {
            Logger.logMessage('MapController', 'mapLoadingPromise => Add MapRouteController');
            mapRouteController.addToMap(map);
        });
    }
}