import { HRDF_Agency_DB } from "./hrdf/agency_db"
import { HRDF_Calendar_DB } from "./hrdf/calendar_db"
import { HRDF_Stop_DB } from "./hrdf/stop_db"

export interface HRDF_DB_LookupsResponse {
    agency: Record<string, HRDF_Agency_DB>
    calendar: Record<string, HRDF_Calendar_DB>
    calendar_data: {
        days_no: number
        start_date: string
    }
    stops: Record<string, HRDF_Stop_DB>
}