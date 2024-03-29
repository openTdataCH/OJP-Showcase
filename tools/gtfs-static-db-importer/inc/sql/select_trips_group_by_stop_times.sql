SELECT 
    trips.trip_id,
    trips.route_id,
    trips.service_id,
    trips.trip_headsign,
    trips.trip_short_name,
    trips.direction_id,
    trips.shape_id,
    GROUP_CONCAT(PRINTF('%s|%s|%s|%s', stop_times.ROWID, stop_times.stop_id, stop_times.arrival_time, stop_times.departure_time)) AS stop_times_data
FROM trips, stop_times
WHERE
    trips.trip_id = stop_times.trip_id
GROUP BY trips.trip_id