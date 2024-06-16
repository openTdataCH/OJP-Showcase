<?php
define('APP_PATH', dirname(__FILE__));
include(APP_PATH . '/inc/common.php');

$gtfs_day = @$_GET['gtfs_day'] ?: 'LATEST';

$agency_id = @$_GET['agency_id'] ?: null;
$route_short_name = @$_GET['route_short_name'] ?: null;
$trip_short_name = @$_GET['trip_short_name'] ?: null;
$service_day = @$_GET['service_day'] ?: null;

$gtfs_controller = new GTFS_DB_Controller(APP_CONFIG, $gtfs_day);

if (!is_null($agency_id) && !is_null($route_short_name)) {
    $response = $gtfs_controller->query_trips_by_agency_route_short_name($agency_id, $route_short_name, $trip_short_name, $service_day);
    JsonView::dump($response);
    die;
}

$response =  array(
    'message' => 'params cant be handled',
);
JsonView::dump($response);
