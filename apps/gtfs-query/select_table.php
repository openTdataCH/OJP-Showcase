<?php
define('APP_PATH', dirname(__FILE__));
include(APP_PATH . '/inc/common.php');

$day = @$_GET['day'] ?: null;
$hhmm =  @$_GET['hhmm'] ?: null;
$table_name = @$_GET['table_name'] ?: null;

if (!$table_name) {
    die('No lookup table given');
}

$gtfs_controller = new GTFS_DB_Controller(APP_CONFIG, $day, $hhmm);
$result_json = $gtfs_controller->query_table($table_name);
JsonView::dump($result_json);