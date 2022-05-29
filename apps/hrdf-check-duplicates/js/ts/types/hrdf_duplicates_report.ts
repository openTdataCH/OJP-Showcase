import Agency from "../models/gtfs/agency";
import Trip_Variant from "../models/hrdf/trip_variant";

export interface HRDF_Duplicates_Report {
    agencies_data: HRDF_Duplicates_Agency_Data[],
}

export interface HRDF_Duplicates_Agency_Data {
    agency: Agency
    sort_key: string
    trips_data: HRDF_Duplicate_Trips_Data[]
}

export interface HRDF_Duplicate_Trips_Data {
    hrdf_trip_key: string
    sort_key: string
    hrdf_trips: Trip_Variant[]
}