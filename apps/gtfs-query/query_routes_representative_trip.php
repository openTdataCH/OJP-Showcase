<?php
define('APP_PATH', dirname(__FILE__));
include(APP_PATH . '/inc/common.php');

$gtfs_day = @$_GET['gtfs_day'] ?: 'LATEST';
$service_day = @$_GET['service_day'] ?: null;

$gtfs_controller = new GTFS_DB_Controller(APP_CONFIG, $gtfs_day);
$result_json = $gtfs_controller->query_routes_representative_trip($service_day);

JsonView::dump($result_json);
