(
    -- ARRIVE AFTER [FROM ... ]
    trips.arrival_day_minutes > [INTERVAL_FROM]
    AND
    -- DEPART BEFORE [ ... TO]
    trips.departure_day_minutes < [INTERVAL_TO]
)