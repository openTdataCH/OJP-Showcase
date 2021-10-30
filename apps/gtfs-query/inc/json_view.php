<?php

class JsonView {
    public static function dump($data, $params = array()) {
        $params_default = array(
            'http_headers' => array(),
        );
        $params = array_merge($params_default, $params);

        if (ob_get_contents()) {
            var_dump("Output detected, please remove it before dumping JSON data");
            die;
        }
        
        if (isset($_SERVER['HTTP_ACCEPT_ENCODING']) && substr_count($_SERVER['HTTP_ACCEPT_ENCODING'], 'gzip')) {
            ob_start("ob_gzhandler");
        }  else {
            ob_start();
        }
        
        header(' ', true, 200);
        header('Content-Type: application/json; charset=utf-8');

        header('Access-Control-Allow-Origin: *');
        
        header("Cache-Control: max-age=0, no-cache, no-store, must-revalidate");
        header("Pragma: no-cache");
        header("Expires: Thu, 01 Jan 1970 00:00:00 GMT");

        foreach ($params['http_headers'] as $http_header) {
            header($http_header);
        }
        
        echo (is_string($data) ? $data : json_encode($data)) . "\n";

        die;
    }

    public static function dump_error($status_code, $json_data) {
        header(' ', true, $status_code);
        header('Content-Type: application/json; charset=utf-8');
        
        header("Cache-Control: max-age=0, no-cache, no-store, must-revalidate");
        header("Pragma: no-cache");
        header("Expires: Thu, 01 Jan 1970 00:00:00 GMT");

        $json_data = array(
            "status_code" => $status_code,
            "message" => $json_data,
        );

        echo json_encode($json_data) . "\n";

        die;
    }
}