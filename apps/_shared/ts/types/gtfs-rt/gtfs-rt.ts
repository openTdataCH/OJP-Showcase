export interface Trip {
    tripId: string
    routeId: string
    startTime: string
    startDate: string
    scheduleRelationship: string
}

export interface TripUpdate {
    trip?: Trip
    stopTimeUpdate?: StopTimeUpdate[]
}

export interface StopTimeUpdate {
    stopSequence: number
    stopId: string
    arrival?: StopTimeDelay
    departure: StopTimeDelay
    scheduleRelationship: string
}

export interface StopTimeDelay {
    delay: number
}
