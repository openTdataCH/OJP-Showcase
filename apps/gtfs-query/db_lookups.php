<?php
define('APP_PATH', dirname(__FILE__));
include(APP_PATH . '/inc/common.php');

ini_set('memory_limit', '1024M');

$gtfs_day = @$_GET['gtfs_day'] ?: null;

if ($gtfs_day === null) {
    print('error - gtfs_day is null');
    exit(1);
}

$map_json = array();

$gtfs_controller = new GTFS_DB_Controller(APP_CONFIG, $gtfs_day);
$table_names = array('agency', 'routes', 'stops');
foreach($table_names as $table_name) {
    $result_json = $gtfs_controller->query_table($table_name);
    $map_json[$table_name] = $result_json;
}

JsonView::dump($map_json);
