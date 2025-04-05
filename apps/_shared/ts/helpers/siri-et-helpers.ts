// ./_shared/ts/helpers/siri-et-helpers.ts

import { VehicleJourney } from "../models/siri-et/vehicle-journey";

import { BusinessOrganisationsController } from "../controllers/business-organisations";
import { GTFS_DB_Controller } from "../controllers/gtfs-db-controller";

import { AGENCY_ID_NO_DATA } from "../constants";

export type MapAgencySIRI_ET_Journeys = Record<string, VehicleJourney[]>;

export class SIRI_ET_Helpers {
  public static processSIRI_ET_Items(items: VehicleJourney[], boController: BusinessOrganisationsController, gtfsDBController: GTFS_DB_Controller): Record<string, MapAgencySIRI_ET_Journeys> {
    const mapDayAgencySIRI_ET_Journeys: Record<string, MapAgencySIRI_ET_Journeys> = {};
    
    items.forEach(item => {
      const day = item.vehicleDayRef;
      if (!(day in mapDayAgencySIRI_ET_Journeys)) {
        mapDayAgencySIRI_ET_Journeys[day] = {};
      }
      
      const mapAgencySIRI_ET_Journeys = mapDayAgencySIRI_ET_Journeys[day];

      const operatorRef = item.operatorRef;
      const boData = boController.mapSboid[operatorRef] ?? null;
      
      let agencyId = AGENCY_ID_NO_DATA;
      if (boData === null) {
        // catch ch:1:Organisation:797
        const operatorRefParts = operatorRef.split(':Organisation:');
        if (operatorRefParts.length === 2) {
          const lookupAgencyId = operatorRefParts[1];
          const agency = gtfsDBController.mapAgency[lookupAgencyId] ?? null;

          if (agency !== null) {
            agencyId = agency.agency_id;
          } else {
            // TODO - handle error
            // console.log(operatorRef);
          }
        }
      } else {
        agencyId = boData.organisationNumber;
      }

      if (!(agencyId in mapAgencySIRI_ET_Journeys)) {
        mapAgencySIRI_ET_Journeys[agencyId] = [];
      }

      mapAgencySIRI_ET_Journeys[agencyId].push(item);
    });

    return mapDayAgencySIRI_ET_Journeys;
  }
}