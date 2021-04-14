SELECT 
    trips.trip_id,
    trips.trip_short_name,
    trips.departure_time,
    trips.arrival_time,
    trips.departure_day_minutes,
    trips.arrival_day_minutes,

    trips.trip_short_name,
    trips.trip_headsign,
    
    routes.route_id,
    routes.route_type,
    routes.route_short_name,

    agency.agency_id,
    agency.agency_name,
    
    trips.stop_times_s,
    -- +1 is because the string index start at 1
    SUBSTR(calendar.day_bits, [DAY_IDX] + 1, 1) AS day_bit
FROM 
    trips, calendar, routes, agency
WHERE 
    trips.service_id = calendar.service_id 
    AND trips.route_id = routes.route_id
    AND routes.agency_id = agency.agency_id

    [EXTRA_WHERE]

    AND day_bit = '1'