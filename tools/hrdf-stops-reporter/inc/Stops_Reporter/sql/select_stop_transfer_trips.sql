SELECT 
    stop_transfer_trips.stop_id, 
    fplan_from.agency_id AS from_agency_id,
    fplan_from.vehicle_type AS from_vehicle_type, 
    fplan_from.service_line AS from_service_line,
    fplan_from.fplan_trip_id AS from_fplan_trip_id,
    fplan_to.agency_id AS to_agency_id, 
    fplan_to.vehicle_type AS to_vehicle_type, 
    fplan_to.service_line AS to_service_line,
    fplan_to.fplan_trip_id AS to_fplan_trip_id,
    stop_transfer_trips.transfer_time
FROM 
    stop_transfer_trips,
    fplan AS fplan_from,
    fplan AS fplan_to
WHERE
    stop_transfer_trips.from_fplan_row_idx = fplan_from.row_idx
    AND stop_transfer_trips.to_fplan_row_idx = fplan_to.row_idx