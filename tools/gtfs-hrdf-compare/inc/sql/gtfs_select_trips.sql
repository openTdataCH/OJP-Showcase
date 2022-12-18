SELECT 
    trips.trip_id,
    trips.service_id,
    trips.trip_short_name,
    trips.departure_day_minutes,
    trips.arrival_day_minutes,
    trips.departure_time,
    trips.arrival_time,
    trips.stop_times_s,
    routes.route_id,
    routes.agency_id,
    routes.route_short_name,
    routes.route_desc,
    routes.route_type,
    trips.*,
    routes.*
FROM
    trips, routes, calendar
WHERE
    trips.route_id = routes.route_id
    AND trips.service_id = calendar.service_id
    [EXTRA_WHERE]
