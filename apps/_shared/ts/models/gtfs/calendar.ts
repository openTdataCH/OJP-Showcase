import DateHelpers from "../../helpers/date-helpers"
import { CalendarJSON } from "../../types/gtfs/gtfs"
import { HRDF_Calendar_DB } from "../../types/hrdf/calendar_db"

export default class Calendar {
    public service_id: string
    public start_date: Date
    public end_date: Date
    public day_bits: string
    public gtfs_start_date: Date
    
    public monday: number | null
    public tuesday: number | null
    public wednesday: number | null
    public thursday: number | null
    public friday: number | null
    public saturday: number | null
    public sunday: number | null

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

    public static initFromCalendarJSON(calendarJSON: CalendarJSON, gtfs_start_date: Date | null = null) {
        const service_id = calendarJSON.service_id
        const start_date = DateHelpers.DateFromGTFSDay(calendarJSON.start_date)
        const end_date = DateHelpers.DateFromGTFSDay(calendarJSON.end_date)
        const day_bits = calendarJSON.day_bits

        if (gtfs_start_date === null) {
            gtfs_start_date = start_date;
        }

        const calendarService = new Calendar(service_id, start_date, end_date, day_bits, gtfs_start_date)

        calendarService.monday = calendarJSON.monday
        calendarService.tuesday = calendarJSON.tuesday
        calendarService.wednesday = calendarJSON.wednesday
        calendarService.thursday = calendarJSON.thursday
        calendarService.friday = calendarJSON.friday
        calendarService.saturday = calendarJSON.saturday
        calendarService.sunday = calendarJSON.sunday
        
        return calendarService
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
