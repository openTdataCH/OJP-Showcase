import { AgencyJSON, RouteJSON, StopJSON } from '../_shared/types/gtfs/gtfs'

export interface Response_GTFS_Lookup {
    lookup_name: string
    data_source: string
    rows_no: number
    rows: AgencyJSON[] | RouteJSON[] | StopJSON[]
}
