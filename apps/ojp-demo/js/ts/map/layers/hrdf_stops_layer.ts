import GeoJSON from 'geojson';
import mapboxgl from 'mapbox-gl'
import HRDF_Stop from '../../models/HRDF_Stop'

import * as OJP from '../../ojp-sdk/index'
import Logger from '../../helpers/logger';
import GeoJSONMapLayer from './geojson_map_layer';
import Dev_Helpers from '../../helpers/dev_helpers';

type MapLayerEvent = "GeoJSONLoad" | "PopupChooseRoutePoint"

interface Route_HRDF_Stop {
    routeEndpointType: OJP.EndpointType,
    mapStop: HRDF_Stop
}

export default class HRDF_Stops_Layer extends GeoJSONMapLayer {
    private source_id: string;

    private trainStopsLayerID: string
    private otherStopsLayerID: string

    private mapFeatures: Record<string, HRDF_Stop>
    private map_listeners: Record<MapLayerEvent, ((ev: any | null) => void)[]>

    constructor() {
        const layerName = 'HRDF_Stops';

        let useMockedData = false;
        if (Dev_Helpers.isDEV()) {
            useMockedData = true;
            useMockedData = false;
        }
        
        let geojsonURL = 'https://opentdatach.github.io/assets-hrdf-stops-reporter/hrdf_stops_latest.geojson';
        
        super(layerName, geojsonURL);

        this.trainStopsLayerID = 'hrdf_stops_point_trains';
        this.otherStopsLayerID = 'hrdf_stops_point_regular';

        this.source_id = 'hrdf_stops';

        this.mapFeatures = {};
        this.map_listeners = {
            GeoJSONLoad: [],
            PopupChooseRoutePoint: [],
        };
    }

    protected handleLoadGeoJSON(geojson: GeoJSON.FeatureCollection) {
        this.mapFeatures = {};

        geojson.features.forEach(featureJSON => {
            const stop_feature = HRDF_Stop.init_fromGeoJSONFeature(featureJSON);
            if (stop_feature === null) {
                return;
            }

            this.mapFeatures[stop_feature.stop_id] = stop_feature;
        });

        Logger.logMessage('HRDF_Stops_Layer', 'handleLoadGeoJSON - done loading ' + geojson.features.length.toString() + ' features');
    }

    public addToMap(map: mapboxgl.Map) {
        this.geojsonPromise.then(geojson => {
            Logger.logMessage('HRDF_Stops_Layer', 'addToMap.this.geojsonPromise');

            map.addSource(this.source_id, <mapboxgl.GeoJSONSourceRaw>{
                type: 'geojson',
                data: geojson
            });

            this.addLayersToMap(map);

            this.map_listeners.GeoJSONLoad.forEach(completion => {
                if (typeof completion !== 'function') {
                    return;
                }
    
                completion(null);
            });
        });
    }

    public queryFeatureByStopId(stop_id: string): HRDF_Stop | null {
        return this.mapFeatures[stop_id] ?? null;
    }

    public onGeoJSONLoad(completion: () => void): void {
        this.map_listeners.GeoJSONLoad.push(completion);
    }

    public onPopupChooseRoutePoint(completion: (route_hdrf_stop: Route_HRDF_Stop) => void): void {
        this.map_listeners.PopupChooseRoutePoint.push(completion);
    }

    private addLayersToMap(map: mapboxgl.Map) {
        const layer_points_regular = <mapboxgl.CircleLayer>{
            id: this.otherStopsLayerID,
            source: this.source_id,
            filter: ['!=', ['get', 'has_train'], 'yes'],
            type: 'circle',
            paint: {
                'circle-color': "#0000FF",
                'circle-radius': 4,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#fff',
            },
            minzoom: 12
        };
        const layer_points_trains = <mapboxgl.CircleLayer>{
            id: this.trainStopsLayerID,
            source: this.source_id,
            filter: ['==', ['get', 'has_train'], 'yes'],
            type: 'circle',
            paint: {
                'circle-color': "#EA0B18",
                'circle-radius': 4,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#fff',
            },
        };

        const line_layers = [layer_points_regular, layer_points_trains];
        line_layers.forEach((layer: mapboxgl.CircleLayer) => {
            const layer_id = layer.id;

            map.addLayer(layer);

            map.on('mouseover', layer_id, (ev: mapboxgl.MapLayerMouseEvent) => {
                map.getCanvas().style.cursor = 'pointer';
            });
    
            map.on('mouseout', layer_id, () => {
                map.getCanvas().style.cursor = '';
            });
    
            const popup_html_template = (document.getElementById('popup_hrdf_stop') as HTMLElement).innerHTML;
            map.on('click', layer_id, (ev: mapboxgl.MapLayerMouseEvent) => {
                const popup_html = this.compute_popup_content(popup_html_template, ev);
                if (!popup_html) {
                    return;
                }

                const div_container = document.createElement('DIV');
                div_container.innerHTML = popup_html;

                const popup = new mapboxgl.Popup({
                    focusAfterOpen: false
                });
                popup.setLngLat(ev.lngLat)
                    .setDOMContent(div_container)
                    .addTo(map);

                div_container.addEventListener('click', ev => {
                    const src_button = ev.target as HTMLElement;

                    const route_endpoint_type_s = src_button.getAttribute('data-route-type');
                    if (route_endpoint_type_s === null) { 
                        return;
                    }
                    const route_endpoint_type: OJP.EndpointType = route_endpoint_type_s == 'from' ? "From" : "To";

                    const stop_id = src_button.getAttribute('data-stop-id');
                    if (stop_id === null) {
                        return;
                    }
                    const hrdf_stop = this.queryFeatureByStopId(stop_id);

                    if (hrdf_stop === null) {
                        return;
                    }

                    this.map_listeners.PopupChooseRoutePoint.forEach(completion => {
                        if (typeof completion !== 'function') {
                            return;
                        }

                        const route_hdrf_stop = <Route_HRDF_Stop>{
                            routeEndpointType: route_endpoint_type,
                            mapStop: hrdf_stop
                        };
            
                        completion(route_hdrf_stop);
                    });

                    popup.remove();
                });
            });
        });

        const label_layer = <mapboxgl.SymbolLayer>{
            "id": "hrdf_stops_label",
            "type": "symbol",
            "source": "hrdf_stops",
            "layout": {
              "text-field": "{stop_name} \n {stop_id}",
              "text-size": 12,
              "text-justify": "left",
              "text-anchor": "top-left",
              "text-offset": [0.2, 0.2]
            },
            "paint": {
              "text-halo-color": "rgba(241, 231, 231, 1)",
              "text-halo-width": 1
            },
            minzoom: 14
        };
        map.addLayer(label_layer);
    }

    private compute_popup_content(template_s: string, ev: mapboxgl.MapLayerMouseEvent): string | null {
        const mb_feature = ev.features?.[0]
        if (!mb_feature) {
            return null;
        }

        // TODO: cant we use mapFeatures ?
        const feature = HRDF_Stop.init_fromGeoJSONFeature(mb_feature)
        if (!feature) {
            return null;
        }

        const main_vehicle_types_s = feature.properties?.main_vehicle_types_s ?? '';

        let popup_html = template_s.slice();
        popup_html = popup_html.replace('[STOP_NAME]', feature.stop_name);
        popup_html = popup_html.replace(/\[STOP_ID\]/g, feature.stop_id);
        popup_html = popup_html.replace('[MAIN_VEHICLE_TYPES_S]', main_vehicle_types_s);

        return popup_html;
    }

    public findNearbyFeature(map: mapboxgl.Map, lnglat: mapboxgl.LngLat): HRDF_Stop | null {
        const pointPx = map.project(lnglat);

        const bboxWidth = 50;
        const bboxPx: [mapboxgl.PointLike, mapboxgl.PointLike] = [
            [
                pointPx.x - bboxWidth / 2,
                pointPx.y - bboxWidth / 2,
            ],
            [
                pointPx.x + bboxWidth / 2,
                pointPx.y + bboxWidth / 2,
            ]
        ]

        const features = map.queryRenderedFeatures(bboxPx, {
            layers: [
                this.trainStopsLayerID,
                this.otherStopsLayerID,
            ]
        });

        let foundStopId: string | null = null;
        let minDistance = 100 * 1000; // 100km
        features.forEach(feature => {
            const pointGeometry = <GeoJSON.Point>feature.geometry;
            const pointLngLat = mapboxgl.LngLat.convert(pointGeometry.coordinates as mapboxgl.LngLatLike)

            const dist = lnglat.distanceTo(pointLngLat);
            if (dist < minDistance) {
                foundStopId = feature.id as string
                minDistance = dist
            }
        });

        if (foundStopId === null) {
            return null
        }

        return this.queryFeatureByStopId(foundStopId)
    }
}