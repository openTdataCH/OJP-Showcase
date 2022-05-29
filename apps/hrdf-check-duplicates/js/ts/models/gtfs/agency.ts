import { HRDF_Agency_DB } from "../../types/hrdf/agency_db"

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

    public static initFromHRDFAgencyDB(agencyDB: HRDF_Agency_DB) {
        const agency_id = agencyDB.agency_id
        const agency_name = agencyDB.full_name_de
        
        const agency = new Agency(agency_id, agency_name)
        agency.agency_code = agencyDB.short_name

        return agency
    }
}