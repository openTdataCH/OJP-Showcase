<?php
define('APP_PATH', dirname(__FILE__));
include(APP_PATH . '/inc/common.php');

$gtfs_day = @$_GET['gtfs_day'] ?: 'LATEST';

$agency_id = @$_GET['agency_id'] ?: null;
$route_short_name = @$_GET['route_short_name'] ?: null;
$trip_short_name = @$_GET['trip_short_name'] ?: null;
$service_day = @$_GET['service_day'] ?: null;
$journey_ref = @$_GET['journey_ref'] ?: null;
$line_ref = @$_GET['line_ref'] ?: null;
$original_trip_id = @$_GET['original_trip_id'] ?: null;

$gtfs_controller = new GTFS_DB_Controller(APP_CONFIG, $gtfs_day);

if (!is_null($route_short_name) && !is_null($line_ref)) {
    // TODO catch cases where // ch:1:Line:823:14 can give also $route_short_name
    // ACTUALLY for trains, i.e. route_short_name=RE33 and line_ref=ch:1:Line:11:33 will not work(RE33 != 33)
    $response = $gtfs_controller->query_trips_by_route_line_ref($route_short_name, $line_ref, $service_day);
    JsonView::dump($response);
    die;
}

if (!is_null($agency_id) && !is_null($route_short_name)) {
    $response = $gtfs_controller->query_trips_by_agency_route_short_name($agency_id, $route_short_name, $trip_short_name, $service_day);
    JsonView::dump($response);
    die;
}

if (!is_null($journey_ref)) {
    $response = $gtfs_controller->query_trips_by_journey_ref($journey_ref, $service_day);
    JsonView::dump($response);
    die;
}

if (!is_null($original_trip_id)) {
    $response = $gtfs_controller->query_trips_by_original_trip_id($original_trip_id, $service_day);
    JsonView::dump($response);
    die;
}

$response =  array(
    'message' => 'params cant be handled',
);
JsonView::dump($response);
