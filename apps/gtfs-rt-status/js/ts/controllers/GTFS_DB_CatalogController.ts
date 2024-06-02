import { GTFS_Static_DB_Catalog_JSON } from "../_shared/models/gtfs_catalog";

export class GTFS_DB_CatalogController {
    private dbCatalog: GTFS_Static_DB_Catalog_JSON

    constructor(dbCatalog: GTFS_Static_DB_Catalog_JSON) {
        this.dbCatalog = dbCatalog;
    }

    public static fetchLatestCatalog() {
        const promise = new Promise<GTFS_Static_DB_Catalog_JSON>(async (resolve, reject) => {
            const url = 'https://tools.odpch.ch/gtfs-static-dbs/gtfs-static-dbs.json';
            const responseJSON = await (await fetch(url)).json();

            const dbCatalog = responseJSON as GTFS_Static_DB_Catalog_JSON;
            resolve(dbCatalog);
        });

        return promise;
    }

    public computeDbCatalogItem(forDate: Date = new Date()) {
        const catalogItem = this.dbCatalog.items.find(item => {
            if (item.db_relative_path === null) {
                return false;
            }

            const catalogGTFS_RT_SwitchDate = new Date(item.gtfs_rt_switch_datetime_s + ':00');
            if (forDate > catalogGTFS_RT_SwitchDate) {
                return true;
            }

            return false;
        }) ?? null;

        return catalogItem;
    }

}