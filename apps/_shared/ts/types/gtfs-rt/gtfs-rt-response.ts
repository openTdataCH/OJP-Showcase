import { Response_GTFS_RT_Entity } from './entity'

export interface Response_GTFS_RT {
    header: Response_GTFS_RT_Header,
    entity: Response_GTFS_RT_Entity[]
}

interface Response_GTFS_RT_Header {
    gtfsRealtimeVersion: string,
    incrementality: string,
    timestamp: number,
    feedVersion: string,
}
