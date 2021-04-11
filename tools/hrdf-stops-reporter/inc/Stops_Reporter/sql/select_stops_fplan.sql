SELECT 
    fplan.agency_id, 
    fplan.vehicle_type, 
    fplan.service_line, 
    fplan_trip_bitfeld.service_id, 
    fplan_stop_times.stop_id, 
    gleis.track_full_text
FROM  fplan, fplan_trip_bitfeld, fplan_stop_times
LEFT JOIN gleis ON fplan_stop_times.gleis_id = gleis.gleis_id
WHERE
    fplan.row_idx = fplan_trip_bitfeld.fplan_row_idx
    AND fplan_trip_bitfeld.fplan_trip_bitfeld_id = fplan_stop_times.fplan_trip_bitfeld_id