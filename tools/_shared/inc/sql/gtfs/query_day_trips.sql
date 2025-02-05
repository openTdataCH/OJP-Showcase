SELECT 
    [SQL_FIELDS]
FROM 
    trips, calendar, routes, agency
WHERE 
    trips.service_id = calendar.service_id 
    AND trips.route_id = routes.route_id
    AND routes.agency_id = agency.agency_id

    [EXTRA_WHERE]
