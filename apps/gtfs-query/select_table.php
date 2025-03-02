<?php
define('APP_PATH', dirname(__FILE__));
include(APP_PATH . '/inc/common.php');

$table_name = @$_GET['table_name'] ?: null;
$gtfs_day = @$_GET['gtfs_day'] ?: 'LATEST';

if (!$table_name) {
    die('No lookup table given');
}

$gtfs_controller = new GTFS_DB_Controller(APP_CONFIG, $gtfs_day);
$result_json = $gtfs_controller->query_table($table_name);
JsonView::dump($result_json);