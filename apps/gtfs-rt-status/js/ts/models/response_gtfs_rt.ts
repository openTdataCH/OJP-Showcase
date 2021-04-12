export interface Response_GTFS_RT {
    Header: Response_GTFS_RT_Header,
    Entity: Response_GTFS_RT_Entity[]
}

interface Response_GTFS_RT_Header {
    GtfsRealtimeVersion: string,
    Incrementality: string,
    Timestamp: number
}

export namespace GTFS_RT {
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
}

export interface Response_GTFS_RT_Entity {
    Id: string,
    IsDeleted: boolean,
    TripUpdate?: GTFS_RT.TripUpdate
}