UPDATE trips 
SET 
    departure_day_minutes = :departure_day_minutes, 
    arrival_day_minutes = :arrival_day_minutes, 
    departure_time = :departure_time, 
    arrival_time = :arrival_time, 
    stop_times_s = :stop_times_s 
WHERE 
    trip_id = :trip_id