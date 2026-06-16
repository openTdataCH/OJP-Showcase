SELECT 
    [SQL_FIELDS]
FROM 
    trips, calendar, routes, agency, link_agency
WHERE 
    trips.service_id = calendar.service_id 
    AND trips.route_id = routes.route_id
    AND routes.agency_id = agency.agency_id
    AND routes.agency_id = link_agency.agency_id

    [EXTRA_WHERE]
