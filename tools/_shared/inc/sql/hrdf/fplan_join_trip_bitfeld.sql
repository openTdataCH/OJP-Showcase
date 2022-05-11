SELECT 
    fplan.row_idx, 
    fplan_trip_bitfeld.fplan_trip_bitfeld_id, 
    fplan.fplan_content, 
    fplan_trip_bitfeld.service_id, 
    fplan_trip_bitfeld.from_stop_id, 
    fplan_trip_bitfeld.to_stop_id, 
    fplan.agency_id, 
    fplan.fplan_trip_id 
FROM 
    fplan, fplan_trip_bitfeld 
WHERE 
    fplan.row_idx = fplan_trip_bitfeld.fplan_row_idx