import { TripUpdate } from './gtfs-rt'

export interface Response_GTFS_RT_Entity {
    id: string,
    isDeleted: boolean,
    tripUpdate?: TripUpdate
}
