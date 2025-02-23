SELECT 
    trips.* 
FROM 
    trips, routes, calendar
WHERE
    trips.trip_id = routes.representative_trip_id
    AND trips.service_id = calendar.service_id
    [EXTRA_WHERE]
