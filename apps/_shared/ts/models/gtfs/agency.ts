import { HRDF_Agency_DB } from "../../types/hrdf/agency_db"
import { AgencyJSON } from "../../types/gtfs/gtfs"

export default class Agency {
    public agency_id: string
    public agency_name: string
    public agency_code: string | null
    public agency_url: string | null
    public agency_timezone: string | null
    public agency_lang: string | null
    public agency_phone: string | null

    constructor(agency_id: string, agency_name: string) {
        this.agency_id = agency_id
        this.agency_name = agency_name
        this.agency_code = null
        this.agency_url = null
        this.agency_timezone = null
        this.agency_lang = null
        this.agency_phone = null
    }

    public static initFromAgencyJSON(agencyJSON: AgencyJSON) {
        const agency_id = agencyJSON.agency_id
        const agency_name = agencyJSON.agency_name
        
        const agency = new Agency(agency_id, agency_name)
        agency.agency_url = agencyJSON.agency_url
        agency.agency_timezone = agencyJSON.agency_timezone
        agency.agency_lang = agencyJSON.agency_lang
        agency.agency_phone = agencyJSON.agency_phone

        return agency
    }

    public static initFromHRDFAgencyDB(agencyDB: HRDF_Agency_DB) {
        const agency_id = agencyDB.agency_id
        const agency_name = agencyDB.full_name_de
        
        const agency = new Agency(agency_id, agency_name)
        agency.agency_code = agencyDB.short_name

        return agency
    }
}
