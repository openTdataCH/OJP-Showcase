import { Response_GTFS_RT_Entity } from './entity'

export interface Response_GTFS_RT {
    Header: Response_GTFS_RT_Header,
    Entity: Response_GTFS_RT_Entity[]
}

interface Response_GTFS_RT_Header {
    GtfsRealtimeVersion: string,
    Incrementality: string,
    Timestamp: number
}
