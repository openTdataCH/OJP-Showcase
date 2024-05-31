<?php

class GTFS_DB_Controller {
    var $is_dev;
    var $request_URI;
    
    var $db;

    var $use_cache;
    var $cache_prefix;

    var $map_sql_queries;
    var $go_realtime_csv_path;
    var $app_db_cache_path;

    function __construct($config, $gtfs_db_day) {
        $this->is_dev = APP_PROFILE === 'dev';
        $this->request_URI = $_SERVER['REQUEST_URI'];

        $gtfs_dbs_path = $config['ojp_gtfs_dbs_path'];

        $gtfs_db_path = $this->compute_gtfs_db_path_from_day($gtfs_dbs_path, $gtfs_db_day);
        if (!file_exists($gtfs_db_path)) {
            print('error - cant find db for ' . $gtfs_db_day);
            exit(1);
        }

        $this->db = new SQLite3($gtfs_db_path, SQLITE3_OPEN_READONLY);

        $this->map_sql_queries = $config['map_sql_queries'];
        $this->go_realtime_csv_path = $config['go_realtime_csv_path'];
        $this->app_db_cache_path = $config['app_db_cache_path'];

        $this->use_cache = TRUE;

        $this->cache_prefix = 'v1_' . $gtfs_db_day;
    }

    private function compute_gtfs_db_path_from_day($gtfs_dbs_path, $gtfs_day) {
        $gtfs_db_filename = 'gtfs_' . $gtfs_day . '.sqlite';
        $gtfs_db_path = $gtfs_dbs_path . '/' . $gtfs_db_filename;
        return $gtfs_db_path;
    }

    public function query_day_from_to_trips($day, $filter_agency_ids_s, $from_hhmm, $to_hhmm) {
        $sql_fields = file_get_contents($this->map_sql_queries['fields_query_day_full_trips']);

        $result_json = $this->_query_day_trips($sql_fields, $day, $filter_agency_ids_s, $from_hhmm, $to_hhmm);
        
        return $result_json;
    }

    private function _query_day_trips($sql_fields, $day, $filter_agency_ids_s, $from_hhmm = null, $to_hhmm = null, $parse_db_row_type = 'FLAT') {
        $cache_filename_parts = array(
            'query_day_trips_' . $this->cache_prefix,
            'day_' . $day,
        );
        
        if ($from_hhmm !== null) {
            array_push($cache_filename_parts, 'from_' . $from_hhmm);
        }
        if ($to_hhmm !== null) {
            array_push($cache_filename_parts, 'from_' . $to_hhmm);
        }

        $filter_agency_ids = explode(',', $filter_agency_ids_s);
        array_push($cache_filename_parts, 'agency_ids_' . implode('-', $filter_agency_ids));

        if ($parse_db_row_type !== null) {
            array_push($cache_filename_parts, 'db_row_type_' . $parse_db_row_type);
        }
        
        $cache_filename = implode('__', $cache_filename_parts) . '.json';
        $cache_path = $this->app_db_cache_path . '/' . $cache_filename;

        $data_source = null;
        if ($this->use_cache && file_exists($cache_path)) {
            $db_rows_s = file_get_contents($cache_path);
            $db_rows = json_decode($db_rows_s, TRUE);
            $data_source = 'cache: ' . $cache_filename;
        } else {
            $db_rows = $this->query_db_trips($sql_fields, $day, $filter_agency_ids, $from_hhmm, $to_hhmm, $parse_db_row_type);
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

    private function query_db_trips($sql_fields, $day, $filter_agency_ids, $from_hhmm = null, $to_hhmm = null, $parse_db_row_type = null) {
        // START compute DAY_IDX
        $calendar_sql = "SELECT start_date FROM calendar LIMIT 1";
        $gtfs_start_dt_s = $this->db->querySingle($calendar_sql);
        $gtfs_from_date = date_create_from_format("Ymd", $gtfs_start_dt_s);

        $sql_path = $this->map_sql_queries['query_day_trips'];
        $sql = file_get_contents($sql_path);

        $sql = str_replace('[SQL_FIELDS]', $sql_fields, $sql);

        $request_day_date = date_create_from_format("Y-m-d", $day);
        $day_idx = $request_day_date->diff($gtfs_from_date)->days;
        $sql = str_replace('[DAY_IDX]', $day_idx, $sql);
        // DONE
        
        $sql_where_items = array();
        
        $sql_where_agency = $this->compute_agency_ids_sql_filter($filter_agency_ids);
        array_push($sql_where_items, $sql_where_agency);

        if (($from_hhmm !== null) && ($to_hhmm !== null)) {
            $sql_where_from_to = file_get_contents($this->map_sql_queries['where_from_to_trips']);
            array_push($sql_where_items, 'AND ' . $sql_where_from_to);
        }

        $sql_where_s = implode("\n", $sql_where_items);
        $sql = str_replace('[EXTRA_WHERE]', $sql_where_s, $sql);

        if (($from_hhmm !== null) && ($to_hhmm !== null)) {
            $request_from_day_minutes = $this->convert_hhmm_day_minutes($from_hhmm);
            $request_to_day_minutes = $this->convert_hhmm_day_minutes($to_hhmm);
            $sql = str_replace('[INTERVAL_FROM]', $request_from_day_minutes, $sql);
            $sql = str_replace('[INTERVAL_TO]', $request_to_day_minutes, $sql);
        }

        $result = $this->db->query($sql);

        $result_rows = array();

        while ($db_row = $result->fetchArray(SQLITE3_ASSOC)) {
            // FLAT by default
            $result_row = $db_row;

            if ($parse_db_row_type === 'FULL') {
                $result_row = $this->parse_db_trip_full($db_row);
            }

            if (array_key_exists('day_bit', $result_row)) {
                unset($result_row['day_bit']);
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

        // filter out null or empty string values
        $agency_ids = array_filter($agency_ids);

        return $agency_ids;
    }

    public function query_table($table_name) {
        $allowed_tables = array('agency', 'calendar', 'routes', 'stops'); 
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

    private function fetch_table_rows($table_name, $filter = null) {
        $sql = "SELECT * FROM $table_name";
        if ($filter) {
            $sql .= " WHERE " . $filter;
        }
        
        $result = $this->db->query($sql);

        $result_rows = array();

        while ($db_row = $result->fetchArray(SQLITE3_ASSOC)) {
            array_push($result_rows, $db_row);
        }

        return $result_rows;
    }

    public function query_trip($trip_id) {
        $result = array(
            'message' => array(),
            'result' => array(
                'trip' => null,
                'calendar' => null,
            )
        );

        $trip_rows = $this->fetch_table_rows('trips', "trip_id = '" . $trip_id . "'");
        if (count($trip_rows) !== 1) {
            $result['message']['error'] = 'no trip found for ' . $trip_id;
            return $result;
        }

        $trip_db = $trip_rows[0];

        $service_id = $trip_db['service_id'] ?: null;
        if (is_null($service_id)) {
            $result['message']['error'] = 'no service found in trip ' . $trip_id;
            return $result;
        }

        $calendar_rows = $this->fetch_table_rows('calendar', "service_id = '" . $service_id . "'");
        if (count($trip_rows) !== 1) {
            $result['message']['error'] = 'no calendar found ' . $service_id;
            return $result;
        }

        $result['result']['trip'] = $trip_db;
        $result['result']['calendar'] = $calendar_rows[0];

        return $result;
    }
}
