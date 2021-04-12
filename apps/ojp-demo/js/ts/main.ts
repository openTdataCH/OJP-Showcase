import MapController from './controllers/map_controller';
import MapRouteController from './controllers/map_route_controller';
import Logger from './helpers/logger';
import HRDF_Stops_Layer from './map/layers/hrdf_stops_layer';

Logger.logMessage('APP', 'START');

const stopsMapLayer = new HRDF_Stops_Layer();
stopsMapLayer.loadData();

const mapRouteController = new MapRouteController(stopsMapLayer);

const mapController = new MapController();
mapController.initMap('map_canvas');
mapController.addLayer(stopsMapLayer);
mapController.addRouteController(mapRouteController);
