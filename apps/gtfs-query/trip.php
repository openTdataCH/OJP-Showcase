<?php
define('APP_PATH', dirname(__FILE__));
include(APP_PATH . '/inc/common.php');

$gtfs_day = @$_GET['gtfs_day'] ?: null;
$trip_id = @$_GET['trip_id'] ?: null;

if (is_null($trip_id)) {
    die('ERROR: missing trip_id');
}

if (is_null($gtfs_day)) {
    die('TODO detect latest GTFS');
}

$gtfs_controller = new GTFS_DB_Controller(APP_CONFIG, $gtfs_day);
$response = $gtfs_controller->query_trip($trip_id);

JsonView::dump($response);
