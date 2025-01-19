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