<?php
define('APP_PATH', dirname(__FILE__));
include(APP_PATH . '/inc/common.php');

$hrdf_controller = new HRDF_DB_Controller(APP_CONFIG, 'latest');
$hrdf_duplicates_list_json = $hrdf_controller->compute_hrdf_duplicates_list();

JsonView::dump($hrdf_duplicates_list_json);
