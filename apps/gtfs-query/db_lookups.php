<?php
define('APP_PATH', dirname(__FILE__));
include(APP_PATH . '/inc/common.php');

$day = @$_GET['day'] ?: null;
$hhmm =  @$_GET['hhmm'] ?: null;

$map_json = array();

$gtfs_controller = new GTFS_DB_Controller(APP_CONFIG, $day, $hhmm);
$table_names = array('agency', 'routes', 'stops');
foreach($table_names as $table_name) {
    $result_json = $gtfs_controller->query_table($table_name);
    $map_json[$table_name] = $result_json;
}

JsonView::dump($map_json);
