SELECT
    trips.*
FROM
    stop_times, trips
WHERE
    stop_times.trip_id = trips.trip_id
    AND stop_times.stop_id IN (
        SELECT stop_id FROM stops WHERE
            [STOP_NAMES_WHERE]
        )
GROUP BY stop_times.trip_id;
