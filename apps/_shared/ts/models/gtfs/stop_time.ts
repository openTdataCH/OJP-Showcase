import DateHelpers from "../../helpers/date-helpers"

import { HRDF_Stop_Time_DB } from "../../types/hrdf/stop_time_db"
import Stop from "./stop"

export default class StopTime {
    public stop: Stop
    public stop_sequence: number
    public arrivalTimeS: string | null
    public departureTimeS: string | null
    
    public arrivalDateTime: Date | null
    public departureDateTime: Date | null

    constructor(stop: Stop, stop_sequence: number, arrival_time: string | null, departure_time: string | null, dayMidnight: Date | null = null) {
        this.stop = stop
        this.stop_sequence = stop_sequence
        
        this.arrivalTimeS = arrival_time
        this.departureTimeS = departure_time

        if (dayMidnight === null) {
            dayMidnight = new Date()
        }
        
        if (arrival_time === null) {
            this.arrivalDateTime = null;
        } else {
            this.arrivalDateTime = DateHelpers.setHHMMToDate(dayMidnight, arrival_time);
        }

        if (departure_time === null) {
            this.departureDateTime = null;
        } else {
            this.departureDateTime = DateHelpers.setHHMMToDate(dayMidnight, departure_time);
        }
    }

    public static initFromHRDFStopTimeDB(stopTimeDB: HRDF_Stop_Time_DB, stop: Stop, dayMidnight: Date | null = null) {
        const stop_sequence = stopTimeDB.stop_sequence
        const arrival_time = stopTimeDB.arrival_time
        const departure_time = stopTimeDB.departure_time

        const stopTime = new StopTime(stop, stop_sequence, arrival_time, departure_time, dayMidnight)
        return stopTime
    }
}
