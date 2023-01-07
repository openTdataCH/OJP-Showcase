import DateHelpers from "../../helpers/date-helpers"
import { HRDF_Calendar_DB } from "../../types/hrdf/calendar_db"

export default class Calendar {
    public service_id: string
    public start_date: Date
    public end_date: Date
    public day_bits: string
    public gtfs_start_date: Date
    public monday: boolean | null
    public tuesday: boolean | null
    public wednesday: boolean | null
    public thursday: boolean | null
    public friday: boolean | null
    public saturday: boolean | null
    public sunday: boolean | null

    constructor(service_id: string, start_date: Date, end_date: Date, day_bits: string, gtfs_start_date: Date) {
        this.service_id = service_id
        this.start_date = start_date
        this.end_date = end_date
        this.day_bits = day_bits
        this.gtfs_start_date = gtfs_start_date

        this.monday = null
        this.tuesday = null
        this.wednesday = null
        this.thursday = null
        this.friday = null
        this.saturday = null
        this.sunday = null
    }

    public static initFromHRDFServiceDB(serviceDB: HRDF_Calendar_DB, gtfs_start_date: Date | null = null) {
        const service_id = serviceDB.service_id
        const start_date = DateHelpers.DateFromGTFSDay(serviceDB.start_date)
        const end_date = DateHelpers.DateFromGTFSDay(serviceDB.end_date)

        if (gtfs_start_date === null) {
            gtfs_start_date = start_date;
        }

        const calendarService = new Calendar(service_id, start_date, end_date, serviceDB.day_bits, gtfs_start_date)
        
        return calendarService
    }
}
