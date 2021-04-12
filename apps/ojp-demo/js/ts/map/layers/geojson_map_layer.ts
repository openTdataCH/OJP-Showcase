import GeoJSON from 'geojson';
import mapboxgl from 'mapbox-gl';
import Logger from '../../helpers/logger';

export default class GeoJSON_MapLayer {
    public layerName: string
    public geojsonPromise: Promise<GeoJSON.FeatureCollection>;

    constructor(layerName: string, geojsonURL: string) {
        this.layerName = layerName;
        this.geojsonPromise = fetch(geojsonURL).then(response => {
            return response.json();
        });
    }

    public loadData() {
        this.fetchGeoJSON();
    }

    private async fetchGeoJSON() {
        this.geojsonPromise.then(geojson => {
            this.handleLoadGeoJSON(geojson);
        });
    }

    protected handleLoadGeoJSON(geojson: GeoJSON.FeatureCollection) {
        Logger.logMessage('GeoJSON_MapLayer', 'OVERRIDE GeoJSON_MapLayer.handleLoadGeoJSON ' + this.layerName);
        console.log(geojson);
    }

    public addToMap(map: mapboxgl.Map) {
        Logger.logMessage('GeoJSON_MapLayer', 'OVERRIDE GeoJSON_MapLayer.addToMap ' + this.layerName);
    }
}