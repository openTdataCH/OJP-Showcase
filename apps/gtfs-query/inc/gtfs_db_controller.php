<?php

class GTFS_DB_Controller {
    var $is_dev;
    var $request_URI;
    var $db_path;

    var $day;

    var $use_cache;

    var $map_sql_queries;
    var $go_realtime_csv_path;
    var $app_db_cache_path;

    function __construct($config, $day, $hhmm) {
        $this->is_dev = APP_PROFILE === 'dev';
        $this->request_URI = $_SERVER['REQUEST_URI'];

        if (is_null($day)) {
            $day = date('Y-m-d');
        }

        if (is_null($hhmm)) {
            $hhmm = date('Hi');
        }

        $gtfs_dbs_path = $config['ojp_gtfs_dbs_path'];

        $gtfs_db_day = $this->compute_gtfs_day_from_date($day, $hhmm);
        $gtfs_db_path = $this->compute_gtfs_db_path_from_day($gtfs_dbs_path, $gtfs_db_day);

        if (!file_exists($gtfs_db_path)) {
            $request_dt_s = $day . '-' . $hhmm;
            $gtfs_db_path = $this->compute_gtfs_db_path_from_datetime($gtfs_dbs_path, $request_dt_s);

            if (!$gtfs_db_path) {
                $message = array(
                    "error" => "Cant find DB for " . $request_dt_s,
                );
                JsonView::dump_error('400', $message);
            }
        }

        $this->db_path = $gtfs_db_path;
        $this->day = $day;

        $this->map_sql_queries = $config['map_sql_queries'];
        $this->go_realtime_csv_path = $config['go_realtime_csv_path'];
        $this->app_db_cache_path = $config['app_db_cache_path'];

        $this->use_cache = TRUE;

        $this->cache_prefix = 'v1_' . $gtfs_db_day;
    }

    private function compute_gtfs_day_from_date($day, $hhmm) {
        $day_w_WED = 3;

        $day_w = (int) date('w', strtotime($day));
        // WEDNESDAY
        if ($day_w === $day_w_WED) {
            if ($hhmm >= '1400') {
                return $day;
            }
        }

        $last_wednesday_ts = strtotime('last wednesday', strtotime($day));
        $last_wednesday_f = date('Y-m-d', $last_wednesday_ts);
        return $last_wednesday_f;
    }

    private function compute_gtfs_db_path_from_day($gtfs_dbs_path, $gtfs_day) {
        $gtfs_db_filename = 'gtfs_' . $gtfs_day . '.sqlite';
        $gtfs_db_path = $gtfs_dbs_path . '/' . $gtfs_db_filename;
        return $gtfs_db_path;
    }

    private function compute_gtfs_db_path_from_datetime($gtfs_db_path, $request_dt_s) {
        $db_file_paths = glob($gtfs_db_path . "/*.sqlite");
        rsort($db_file_paths);

        foreach ($db_file_paths as $idx => $db_path) {
            $db_path_parts = explode('/', $db_path);
            $db_filename = end($db_path_parts);
            $db_dt_matches_found = preg_match('/gtfs_([0-9-]+?)\.sqlite/', $db_filename, $db_dt_matches);
            if (!$db_dt_matches_found) {
                continue;
            }

            // new dataset starts at 14:00
            $db_dt = $db_dt_matches[1] . '-1400';

            if ($request_dt_s >= $db_dt) {
                return $db_path;
            }
        }

        return null;
    }

    public function query_active_trips($from_hhmm, $to_hhmm, $filter_agency_ids, $parse_db_row_type) {
        if (is_null($from_hhmm)) {
            $from_hhmm = date('Hi');
        }

        if (is_null($to_hhmm)) {
            $to_hhmm = date('Hi');
        }

        $cache_agency_ids = $filter_agency_ids ? implode('-', $filter_agency_ids) : '';
        $cache_filename = 'query_trips_' . $this->cache_prefix . '_day_' . $this->day ;
        $cache_filename .= '_from_' . $from_hhmm . '_to_' . $to_hhmm; 
        $cache_filename .= '_agency_ids_' . $cache_agency_ids . '_db_row_type_' . $parse_db_row_type . '.json';
        $cache_path = $this->app_db_cache_path . '/' . $cache_filename;

        $data_source = null;
        if ($this->use_cache && file_exists($cache_path)) {
            $db_rows_s = file_get_contents($cache_path);
            $db_rows = json_decode($db_rows_s, TRUE);
            $data_source = 'cache: ' . $cache_filename;
        } else {
            $db_rows = $this->query_db_active_trips($from_hhmm, $to_hhmm, $filter_agency_ids, $parse_db_row_type);
            file_put_contents($cache_path, json_encode($db_rows));
            $data_source = 'DB';
        }

        $result_json = array(
            'data_source' => $data_source,
            'rows_no' => count($db_rows),
            'rows' => $db_rows,
        );

        return $result_json;
    }

    private function query_db_active_trips($from_hhmm, $to_hhmm, $filter_agency_ids, $parse_db_row_type) {
        $db = new SQLite3($this->db_path);
        $sql = "SELECT start_date FROM calendar LIMIT 1";
        $gtfs_start_dt_s = $db->querySingle($sql);
        $gtfs_from_date = date_create_from_format("Ymd", $gtfs_start_dt_s);

        $request_day_date = date_create_from_format("Y-m-d", $this->day);
        $day_idx = $request_day_date->diff($gtfs_from_date)->days;

        $request_from_day_minutes = $this->convert_hhmm_day_minutes($from_hhmm);
        $request_to_day_minutes = $this->convert_hhmm_day_minutes($to_hhmm);
        
        $extra_sql_filters = array();
        $agency_ids_filter = $this->compute_agency_ids_sql_filter($filter_agency_ids);
        if ($agency_ids_filter) {
            array_push($extra_sql_filters, $agency_ids_filter);
        }

        $from_to_trips_where_path = $this->map_sql_queries['where_from_to_trips'];
        $from_to_trips_where = file_get_contents($from_to_trips_where_path);
        $from_to_trips_filter = "AND " . $from_to_trips_where;
        array_push($extra_sql_filters, $from_to_trips_filter);

        $extra_where_s = implode("\n", $extra_sql_filters);

        $sql_path = $this->map_sql_queries['query_day_active_trips'];
        $sql = file_get_contents($sql_path);

        $sql = str_replace('[EXTRA_WHERE]', $extra_where_s, $sql);
        $sql = str_replace('[DAY_IDX]', $day_idx, $sql);
        $sql = str_replace('[INTERVAL_FROM]', $request_from_day_minutes, $sql);
        $sql = str_replace('[INTERVAL_TO]', $request_to_day_minutes, $sql);

        $result = $db->query($sql);

        $result_rows = array();

        while ($db_row = $result->fetchArray(SQLITE3_ASSOC)) {
            $result_row = NULL;

            if ($parse_db_row_type === 'FULL') {
                $result_row = $this->parse_db_trip_full($db_row);
            }

            if ($parse_db_row_type === 'FLAT') {
                $result_row = $this->parse_db_trip_flat($db_row);
            }

            array_push($result_rows, $result_row);
        }

        return $result_rows;
    }

    private function parse_db_trip_full($db_row) {
        $stop_times = array();
        $stop_times_data = explode(' -- ', $db_row['stop_times_s']);
        foreach($stop_times_data as $stop_time_data) {
            $stop_time_parts = explode('|', $stop_time_data);
            
            $stop_id = $stop_time_parts[0];
            
            $stop_arr_hhmm = $stop_time_parts[1];
            if ($stop_arr_hhmm === '') {
                $stop_arr_hhmm = null;
            }

            $stop_dep_hhmm = $stop_time_parts[2];
            if ($stop_dep_hhmm === '') {
                $stop_dep_hhmm = null;
            }

            $stop_time_row = array(
                'stop_id' => $stop_id,
                'stop_arr' => $stop_arr_hhmm,
                'stop_dep' => $stop_dep_hhmm,
            );
            array_push($stop_times, $stop_time_row);
        }

        $result_row = array(
            'trip_id' => $db_row['trip_id'],
            'departure_time' => $db_row['departure_time'],
            'arrival_time' => $db_row['arrival_time'],
            'trip_headsign' => $db_row['trip_headsign'],
            'route_id' => $db_row['route_id'],
            'agency_id' => $db_row['agency_id'],
            'has_day' => $db_row['day_bit'] === '1',
            'stop_times' => $stop_times,
        );

        return $result_row;
    }

    private function parse_db_trip_flat($db_row) {
        $result_row = array(
            'trip_id' => $db_row['trip_id'],
            'trip_short_name' => $db_row['trip_short_name'],
            'route_id' => $db_row['route_id'],
            'stop_times_s' => $db_row['stop_times_s'],
        );

        return $result_row;
    }

    private function convert_hhmm_day_minutes($hhmm_s) {
        $hours = (int) substr($hhmm_s, 0, 2);
        $minutes = (int) substr($hhmm_s, 2, 2);

        return $hours * 60 + $minutes;;
    }

    private function compute_agency_ids_sql_filter($filter_agency_ids) {
        $agency_ids = $filter_agency_ids;
        if (in_array('HAS_GTFS_RT', $agency_ids)) {
            $agency_ids = $this->load_agency_ids_from_csv();
        }

        if (empty($agency_ids)) {
            return null;
        }

        $agency_ids_escaped = array();
        foreach($agency_ids as $agency_id) {
            $agency_id_escaped = "'" . $agency_id . "'";
            array_push($agency_ids_escaped, $agency_id_escaped);
        }

        $agency_ids_sql_filter = "AND routes.agency_id IN (" . implode(', ', $agency_ids_escaped) . ")";
        
        return $agency_ids_sql_filter;
    }

    private function load_agency_ids_from_csv() {
        $agency_ids = array();

        $go_realtime_csv_path = $this->go_realtime_csv_path;
        $csv_handle = fopen($go_realtime_csv_path, 'r');
        $headers = null;
        if ($csv_handle) {
            while (($row = fgetcsv($csv_handle, 1024)) !== FALSE) {
                if (!$headers) {
                    $headers = $row;
                    continue;
                }
                $csv_row = array_combine($headers, $row);
                $agency_id = $csv_row['Company-GO-ID'];
                array_push($agency_ids, $agency_id);
            }
            fclose($csv_handle);
        }

        return $agency_ids;
    }

    public function query_table($table_name) {
        $allowed_tables = array('agency', 'routes', 'stops'); 
        if (!in_array($table_name, $allowed_tables)) {
            $message = array(
                "error" => "No lookup found for " . $table_name,
            );
            JsonView::dump_error('400', $message);
            die;
        }

        $cache_filename = 'lookup_table_' . $this->cache_prefix . '_' . $table_name . '.json';
        $cache_path = $this->app_db_cache_path . '/' . $cache_filename;

        if ($this->use_cache && file_exists($cache_path)) {
            $result_rows_s = file_get_contents($cache_path);
            $result_rows = json_decode($result_rows_s, TRUE);
            $data_source = 'cache: ' . $cache_filename;
        } else {
            $result_rows = $this->fetch_table_rows($table_name);
            file_put_contents($cache_path, json_encode($result_rows));
            $data_source = 'DB';
        }

        $result_json = array(
            'lookup_name' => $table_name,
            'data_source' => $data_source,
            'rows_no' => count($result_rows),
            'rows' => $result_rows,
        );

        return $result_json;
    }

    private function fetch_table_rows($table_name) {
        $sql = "SELECT * FROM $table_name";
        $db = new SQLite3($this->db_path);
        $result = $db->query($sql);

        $result_rows = array();

        while ($db_row = $result->fetchArray(SQLITE3_ASSOC)) {
            array_push($result_rows, $db_row);
        }

        return $result_rows;
    }
}