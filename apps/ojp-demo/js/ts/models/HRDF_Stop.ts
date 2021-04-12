import Main_Vehicle_Type from "./Main_Vehicle_Type";
import GeoJSON from 'geojson';
import mapboxgl from 'mapbox-gl';

interface HRDF_Stop_JSON {
    stop_id: string
    stop_name: string
    stop_altitude: number
    in_fplan: number
    main_vehicle_types_s: string
}

export default class HRDF_Stop implements GeoJSON.Feature<GeoJSON.Point> {
    type: "Feature"
    geometry: GeoJSON.Point
    properties: GeoJSON.GeoJsonProperties

    public stop_id: string
    public stop_name: string
    public stop_altitude: number
    public is_in_fplan: boolean
    public is_train: boolean
    public main_vehicle_types: Main_Vehicle_Type[]

    constructor(geometry: GeoJSON.Point, properties: GeoJSON.GeoJsonProperties, stop_id: string, stop_name: string, stop_altitude: number, is_in_fplan: boolean, vehicle_types: Main_Vehicle_Type[]) {
        this.type = "Feature"
        this.geometry = geometry
        this.properties = properties

        this.stop_id = stop_id
        this.stop_name = stop_name
        this.stop_altitude = stop_altitude
        this.is_in_fplan = is_in_fplan
        this.main_vehicle_types = vehicle_types

        const is_train = this.main_vehicle_types.some(main_vehicle_type => {
            return main_vehicle_type == Main_Vehicle_Type.Train;
        });
        
        this.is_train = is_train;
        if (this.properties !== null) {
            this.properties['has_train'] = is_train ? 'yes' : 'no';
        }
    }

    public static init_fromGeoJSONFeature(feature: mapboxgl.MapboxGeoJSONFeature | GeoJSON.Feature): HRDF_Stop | null {
        if (feature.geometry.type !== 'Point') {
            return null;
        }

        const feature_properties = feature.properties as HRDF_Stop_JSON

        const is_in_fplan: boolean = feature_properties.in_fplan === 1
        
        const vehicle_types_s: string[] = feature_properties.main_vehicle_types_s.split(',')
        let vehicle_types: Main_Vehicle_Type[] = []
        vehicle_types_s.forEach(vehicle_type_s => {
            if (vehicle_type_s === '') {
                return;
            }

            const vehicle_type = Main_Vehicle_Type.from_string(vehicle_type_s)
            if (vehicle_type === null) {
                console.error('Cant create MOT_Type from ' + vehicle_type_s);
                return;
            }

            vehicle_types.push(vehicle_type);
        });

        const hrdf_stop_feature = new HRDF_Stop(feature.geometry, feature.properties, feature_properties.stop_id, feature_properties.stop_name, feature_properties.stop_altitude, is_in_fplan, vehicle_types)

        return hrdf_stop_feature
    }
}