SELECT trips.* 
FROM routes
LEFT JOIN trips ON 
trips.trip_id IN (
    SELECT 
        trips.trip_id
        FROM trips, calendar 
        WHERE trips.route_id =  routes.route_id
        AND trips.service_id = calendar.service_id
        -- TRIPS with most day_bit '1'
        ORDER BY LENGTH(REPLACE(calendar.day_bits, '0', '')) DESC
    LIMIT 1
)