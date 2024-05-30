export interface Trip {
    TripId: string
    RouteId: string
    StartTime: string
    StartDate: string
    ScheduleRelationship: string
}

export interface TripUpdate {
    Trip?: Trip
    StopTimeUpdate?: StopTimeUpdate[]
}

export interface StopTimeUpdate {
    StopSequence: number
    StopId: string
    Arrival?: StopTimeDelay
    Departure: StopTimeDelay
    ScheduleRelationship: string
}

export interface StopTimeDelay {
    Delay: number
}
