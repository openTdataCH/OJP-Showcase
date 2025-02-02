// ./shared/controllers/gtfs-db-catalog.ts

import DateHelpers from '../helpers/date-helpers';
import { GTFS_Static_DB_Catalog_JSON } from "../models/gtfs_catalog";

export class GTFS_DB_Catalog_Controller {
  private catalogJSON: GTFS_Static_DB_Catalog_JSON;
  public latestGTFS_Day: string | null;

  constructor(catalogJSON: GTFS_Static_DB_Catalog_JSON) {
    this.catalogJSON = catalogJSON;

    this.latestGTFS_Day = (() => {
      if (this.catalogJSON.items.length === 0) {
        return null;
      }

      const catalogItem = this.catalogJSON.items[0];
      return catalogItem.gtfs_day;
    })();
  }

  public computeGTFS_DayFor_RT_Switch(forDate: Date = new Date()): string | null {
    // 2025-01-06 17:05
    const forDateS = DateHelpers.formatDateYMDHIS(forDate).slice(0, -3);
    
    const catalogItem = this.catalogJSON.items.find(el => {
      return forDateS >= el.gtfs_rt_switch_datetime_s
    }) ?? null;

    if (catalogItem === null) {
      return null;
    }

    if (catalogItem.db_relative_path === null) {
      return null;
    }

    return catalogItem.gtfs_day;
  }
}