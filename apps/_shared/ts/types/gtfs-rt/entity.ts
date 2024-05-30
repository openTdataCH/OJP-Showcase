import { TripUpdate } from './gtfs-rt'

export interface Response_GTFS_RT_Entity {
    Id: string,
    IsDeleted: boolean,
    TripUpdate?: TripUpdate
}
