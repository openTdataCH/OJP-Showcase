SELECT 
    stops.stop_name 
FROM 
    stops, stop_times 
WHERE 
    stops.stop_id = stop_times.stop_id 
    AND stop_times.trip_id = '[TRIP_ID]';