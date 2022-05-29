import { HRDF_Stop_Time_DB } from "../../types/hrdf/stop_time_db"
import Stop from "./stop"

export default class StopTime {
    public stop: Stop
    public stop_sequence: number
    public arrival_time: string | null
    public departure_time: string | null

    constructor(stop: Stop, stop_sequence: number, arrival_time: string | null, departure_time: string | null) {
        this.stop = stop
        this.stop_sequence = stop_sequence
        this.arrival_time = arrival_time
        this.departure_time = departure_time
    }

    public static initFromHRDFStopTimeDB(stopTimeDB: HRDF_Stop_Time_DB, stop: Stop) {
        const stop_sequence = stopTimeDB.stop_sequence
        const arrival_time = stopTimeDB.arrival_time
        const departure_time = stopTimeDB.departure_time

        const stopTime = new StopTime(stop, stop_sequence, arrival_time, departure_time)
        return stopTime
    }
}