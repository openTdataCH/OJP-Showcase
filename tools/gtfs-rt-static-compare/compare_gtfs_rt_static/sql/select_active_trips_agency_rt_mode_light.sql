SELECT
    trips.trip_id,
    trips.route_id,
    routes.agency_id,
    departure_day_minutes,
    arrival_day_minutes
FROM trips, routes, link_agency, calendar
WHERE
    trips.route_id = routes.route_id
    AND
    routes.agency_id = link_agency.agency_id
    AND
    trips.service_id = calendar.service_id
    AND
    link_agency.has_gtfs_rt = 1
    AND
    (
        -- current day trip
        ( SUBSTR(calendar.day_bits, [DAY_IDX] + 1, 1) = '1' )
        OR
        -- check for prev day trip that are going over midnight
        (
            -- is after-midnight trip
            ( trips.arrival_day_minutes > 24 * 60 )
            -- prev day_bit is '1'
            AND (SUBSTR(calendar.day_bits, [DAY_IDX], 1) = '1')
            -- current day_bit is '0'
            AND (SUBSTR(calendar.day_bits, [DAY_IDX] + 1, 1) = '0')
        )
    )
