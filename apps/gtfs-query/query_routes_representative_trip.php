<?php
define('APP_PATH', dirname(__FILE__));
include(APP_PATH . '/inc/common.php');

$gtfs_day = @$_GET['gtfs_day'] ?: 'LATEST';

$gtfs_controller = new GTFS_DB_Controller(APP_CONFIG, $gtfs_day);
$result_json = $gtfs_controller->query_routes_representative_trip();

JsonView::dump($result_json);
