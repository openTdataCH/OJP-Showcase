<?php
define('APP_PATH', dirname(__FILE__));
include(APP_PATH . '/inc/common.php');

$day = @$_GET['day'] ?: null;
$hhmm =  @$_GET['hhmm'] ?: null;
$from_hhmm = @$_GET['from_hhmm'] ?: null;
$to_hhmm = @$_GET['to_hhmm'] ?: null;
$filter_agency_ids_s = @$_GET['filter_agency_ids'] ?: null;
$filter_agency_ids = array();
if (!is_null($filter_agency_ids_s)) {
    $filter_agency_ids = explode(',', $filter_agency_ids_s);
}
$parse_db_row_type = @$_GET['parse_type'] ?: 'FULL';

ini_set('memory_limit', '1024M');

$gtfs_controller = new GTFS_DB_Controller(APP_CONFIG, $day, $hhmm);
$result_json = $gtfs_controller->query_active_trips($from_hhmm, $to_hhmm, $filter_agency_ids, $parse_db_row_type);

JsonView::dump($result_json);

