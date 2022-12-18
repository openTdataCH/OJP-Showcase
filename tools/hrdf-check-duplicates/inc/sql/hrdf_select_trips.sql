SELECT 
    fplan.row_idx, 
    fplan.agency_id, 
    fplan.vehicle_type, 
    fplan.service_line,
    fplan.fplan_trip_id,
    fplan.fplan_content,
    fplan_trip_bitfeld.service_id, 
    fplan_trip_bitfeld.from_stop_id, 
    fplan_trip_bitfeld.to_stop_id,
    GROUP_CONCAT(
        PRINTF('%s|%s|%s', fplan_stop_times.stop_id, fplan_stop_times.stop_arrival, fplan_stop_times.stop_departure)
        ,' -- '
    ) AS stop_times_data
FROM 
    fplan, 
    fplan_trip_bitfeld,
    fplan_stop_times,
    calendar
WHERE 
    fplan.row_idx = fplan_trip_bitfeld.fplan_row_idx
    AND fplan_trip_bitfeld.fplan_trip_bitfeld_id = fplan_stop_times.fplan_trip_bitfeld_id
    AND fplan_trip_bitfeld.service_id = calendar.service_id
    [EXTRA_WHERE]

GROUP BY fplan_trip_bitfeld.fplan_trip_bitfeld_id
