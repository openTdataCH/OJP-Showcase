SELECT
    fplan_trip_bitfeld.fplan_trip_bitfeld_id,
    fplan.agency_id, 
    fplan.vehicle_type, 
    fplan.service_line, 
    fplan_trip_bitfeld.service_id, 
    GROUP_CONCAT(fplan_stop_times.stop_id) AS stop_ids_s
FROM 
    fplan, 
    fplan_trip_bitfeld, 
    fplan_stop_times
WHERE
    fplan.row_idx = fplan_trip_bitfeld.fplan_row_idx
    AND fplan_trip_bitfeld.fplan_trip_bitfeld_id = fplan_stop_times.fplan_trip_bitfeld_id
GROUP BY fplan_trip_bitfeld.fplan_trip_bitfeld_id