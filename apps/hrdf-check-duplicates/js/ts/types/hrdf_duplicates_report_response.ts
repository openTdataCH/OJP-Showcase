import { HRDF_Trip_Variant_DB } from "./hrdf/trip_variant_db"

export interface HRDF_Duplicates_Report_Response {
    agency_data: Record<string, Record<string, number[]>>
    map_hrdf_trips: Record<number, HRDF_Trip_Variant_DB>
    service_data: Record<string, string>
}