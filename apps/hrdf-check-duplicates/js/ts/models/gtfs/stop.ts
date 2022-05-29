import { HRDF_Stop_DB } from "../../types/hrdf/stop_db"

export default class Stop {
    public stop_id: string
    public stop_name: string
    public stop_lon: number
    public stop_lat: number
    public location_type: string | null
    public parent_station: string | null

    constructor(stop_id: string, stop_name: string, stop_lon: number, stop_lat: number) {
        this.stop_id = stop_id
        this.stop_name = stop_name
        this.stop_lon = stop_lon
        this.stop_lat = stop_lat

        this.location_type = null
        this.parent_station = null
    }

    public static initFromHRDFStopDB(stopDB: HRDF_Stop_DB) {
        const stop_id = stopDB.stop_id
        const stop_name = stopDB.stop_name
        const stop_lon = stopDB.stop_lon
        const stop_lat = stopDB.stop_lat

        const stop = new Stop(stop_id, stop_name, stop_lon, stop_lat)
        return stop
    }
}