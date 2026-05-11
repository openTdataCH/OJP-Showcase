import { VehicleJourney } from "../../shared/models/siri-et/vehicle-journey";
import { Trip } from "../../shared/models/gtfs/trip";
import { GTFS_DB_Controller } from "../../shared/controllers/gtfs-db-controller";

import { HTTP_Service } from "../services/http.service";

import { MatchHelpers } from "../helpers/match-helpers";

import { AgencyData, DataLoadProgress, GTFS_RT_ReportItem, MapAgencyGTFS_RT_Entity, ReportData, ReportResultItem, SIRI_ET_ReportItem } from "../types/report-controller";
import { MatchDB_Trip, ResultMatch } from "../types/report-controller";

import { MapAgencySIRI_ET_Journeys } from "../../shared/helpers/siri-et-helpers";

import { AGENCY_ID_NO_DATA, LIST_DELIMITER } from "../../shared/constants";
import { DEFAULT_REPORT_DATA } from "../constants";

type MapMatchDB_Trip = Record<string, MatchDB_Trip>;
type MapAgencyMatchDB_Trip = Record<string, MapMatchDB_Trip>;

export class ReportController {
  private reportDayF: string;

  private httpService: HTTP_Service;
  private gtfsDBController: GTFS_DB_Controller;
  private mapAgencySIRI_ET_Journeys: MapAgencySIRI_ET_Journeys;
  private mapAgencyGTFS_RT_Entity: MapAgencyGTFS_RT_Entity;
  private mapAgencyMatchDB_Trip: MapAgencyMatchDB_Trip;

  public reportData: ReportData;

  public onFetchData: (dataLoadProgress: DataLoadProgress) => void = () => {};

  constructor(reportDayF: string, httpService: HTTP_Service, gtfsDBController: GTFS_DB_Controller, mapAgencySIRI_ET_Journeys: MapAgencySIRI_ET_Journeys, mapAgencyGTFS_RT_Entity: MapAgencyGTFS_RT_Entity) {
    this.reportDayF = reportDayF;
    this.httpService = httpService;
    this.gtfsDBController = gtfsDBController;
    this.mapAgencySIRI_ET_Journeys = mapAgencySIRI_ET_Journeys;
    this.mapAgencyGTFS_RT_Entity = mapAgencyGTFS_RT_Entity;
    this.mapAgencyMatchDB_Trip = {};
    
    this.reportData = DEFAULT_REPORT_DATA;
  }

  public computeReportData(siriET_Total_No: number) {
    this.updateResultsModel(siriET_Total_No);

    this.updateSIRI_ET_NoAgencyModel();
    this.updateGTFS_RT_NoAgencyModel();

    this.updateAgencyCompareModel();
  }

  private updateResultsModel(siriET_Total_No: number) {
    this.reportData.siriET_Total_No = siriET_Total_No;
    
    this.reportData.siriET_Day_No = 0;
    for (const agencyId in this.mapAgencySIRI_ET_Journeys) {
      const journeys = this.mapAgencySIRI_ET_Journeys[agencyId];
      this.reportData.siriET_Day_No += journeys.length;
    }

    this.reportData.gtfsRT_Total_No = 0;
    for (const agencyId in this.mapAgencyGTFS_RT_Entity) {
      const gtfsRT_Entities = this.mapAgencyGTFS_RT_Entity[agencyId];
      this.reportData.gtfsRT_Total_No += gtfsRT_Entities.length;
    }
  }

  // SEC 2. MESSAGES WITH NO AGENCY - SIRI-ET
  private updateSIRI_ET_NoAgencyModel() {
    const siriET_NoAgencyJourneys = this.mapAgencySIRI_ET_Journeys[AGENCY_ID_NO_DATA] ?? [];

    this.reportData.siriET_NoAgencyItems = siriET_NoAgencyJourneys.map(el => {
      const item: SIRI_ET_ReportItem = {
        vehicleJourney: el
      }

      return item;
    });
  }

  // SEC 2. MESSAGES WITH NO AGENCY - GTSF-RT
  private updateGTFS_RT_NoAgencyModel() {
    const gtfsRT_Journeys = this.mapAgencyGTFS_RT_Entity[AGENCY_ID_NO_DATA] ?? [];
    this.reportData.gtfsRT_NoAgencyItems = gtfsRT_Journeys.map(el => {
      const item: GTFS_RT_ReportItem = {
        entityGTFS_RT: el
      }

      return item;
    });
  }

  private async updateAgencyCompareModel() {
    const siriET_AgencyIds = Object.keys(this.mapAgencySIRI_ET_Journeys);
    const gtfsRT_AgencyIds = Object.keys(this.mapAgencyGTFS_RT_Entity);

    const siriET_OnlyAgencyIds = siriET_AgencyIds.filter(key => !gtfsRT_AgencyIds.includes(key));
    const gtfsRT_OnlyAgencyIds = gtfsRT_AgencyIds.filter(key => !siriET_AgencyIds.includes(key));
    const bothAgencyIds = siriET_AgencyIds.filter(key => gtfsRT_AgencyIds.includes(key));

    this.updateSIRI_ET_AgencyNotIn_GTFS_RT_Model(siriET_OnlyAgencyIds);
    this.updateGTFS_RT_AgencyNotIn_SIRI_ET_Model(gtfsRT_OnlyAgencyIds);
    this.updateBothInAgencyModel(bothAgencyIds);

    const hasAgencies = this.reportData.bothInAgency.agencyData.length > 0;
    if (hasAgencies) {
      const agencyId = this.reportData.bothInAgency.agencyData[0].agency.agency_id;
      await this.fetchAndComputeBothInAgencyItems(agencyId);
      console.log(this.reportData);
    } else {
      // TODO - reset model?
    }
  }

  // SEC 3. AGENCY ONLY - SIRI-ET
  private updateSIRI_ET_AgencyNotIn_GTFS_RT_Model(agencyIds: string[]) {
    this.reportData.siriET_OnlyAgencyData = [];
    agencyIds.forEach((agencyId) => {
      const agency = this.gtfsDBController.mapAgency[agencyId] ?? null;
      if (agency === null) {
        console.log('cant find a GTFS DB agency for: ' + agencyId);
        return;
      }

      const siriET_Journeys = this.mapAgencySIRI_ET_Journeys[agencyId];

      const itemsNo = siriET_Journeys.length;

      const agencyData: AgencyData = {
        agency: agency,
        itemsNo: itemsNo,
        text: agency.agency_name + ' (' + agencyId + ') - ' + itemsNo + ' items',
      }
      this.reportData.siriET_OnlyAgencyData.push(agencyData);
    });

    this.reportData.siriET_OnlyAgencySelectedItems = [];
    if (agencyIds.length > 0) {
      const firstAgencyId = agencyIds[0];
      this.updateSIRI_ET_AgencySelectedItems(firstAgencyId);
    }
  }

  public updateSIRI_ET_AgencySelectedItems(agencyId: string) {
    const siriET_Journeys = this.mapAgencySIRI_ET_Journeys[agencyId] ?? [];
    this.reportData.siriET_OnlyAgencySelectedItems = siriET_Journeys.map(el => {
      const item: SIRI_ET_ReportItem = {
        vehicleJourney: el
      }

      return item;
    });
  }

  // SEC 3. AGENCY ONLY - GTFS-RT
  private updateGTFS_RT_AgencyNotIn_SIRI_ET_Model(agencyIds: string[]) {
    this.reportData.gtfsRT_OnlyAgencyData = [];
    agencyIds.forEach((agencyId) => {
      if (agencyId === AGENCY_ID_NO_DATA) {
        return;
      }

      const agency = this.gtfsDBController.mapAgency[agencyId];
      const gtfsRT_Entities = this.mapAgencyGTFS_RT_Entity[agencyId];

      const itemsNo = gtfsRT_Entities.length;

      const agencyData: AgencyData = {
        agency: agency,
        itemsNo: itemsNo,
        text: agency.agency_name + ' (' + agencyId + ') - ' + itemsNo + ' items',
      }
      this.reportData.gtfsRT_OnlyAgencyData.push(agencyData);
    });

    this.reportData.gtfsRT_OnlyAgencySelectedItems = [];
    if (agencyIds.length > 0) {
      const firstAgencyId = agencyIds[0];
      this.updateGTFS_RT_AgencySelectedItems(firstAgencyId);
    }
  }

  public updateGTFS_RT_AgencySelectedItems(agencyId: string) {
    this.reportData.gtfsRT_OnlyAgencySelectedItems = [];

    const gtfsRT_Entities = this.mapAgencyGTFS_RT_Entity[agencyId];
    gtfsRT_Entities.forEach(gtfsRT_Entity => {
      const gtfsRT_NoAgencyItem: GTFS_RT_ReportItem = {
        entityGTFS_RT: gtfsRT_Entity
      };
      this.reportData.gtfsRT_OnlyAgencySelectedItems.push(gtfsRT_NoAgencyItem);
    });
  }
  
  // SEC 4. AGENCY BOTH
  public async fetchAndComputeBothInAgencyItems(agencyId: string) {
    console.log('START fetch GTFS data for ' + agencyId);

    this.onFetchData({
      percent: 50,
      text: '... fetching GTFS data for ' + agencyId,
    });

    // ASYNC fetch trips for agency
    await this.updateBothInAgencyItemsModel(agencyId);

    this.onFetchData({
      percent: 100,
      text: '... done',
    });

    console.log('.. DONE');

    // Match GTFS_RT messages
    this.reportData.bothInAgency.gtfsRT_NoGTFS_Items = [];
    this.mapAgencyGTFS_RT_Entity[agencyId].forEach(item => {
      const tripId = item.tripUpdate?.trip?.tripId ?? null;
      if (tripId === null) {
        debugger;
        return;
      }

      if (tripId in this.mapAgencyMatchDB_Trip[agencyId]) {
        this.mapAgencyMatchDB_Trip[agencyId][tripId].trip.gtfsRT = item;
      } else {
        const gtfsRT_ReportItem: GTFS_RT_ReportItem = {
          entityGTFS_RT: item
        };
        this.reportData.bothInAgency.gtfsRT_NoGTFS_Items.push(gtfsRT_ReportItem);
      }
    });
    
    // POOL1 - Agency LineNumber GTFS trips - smaller pool for 101/fuzzy matching
    const mapLineMatchDB_Trips: Record<string, MatchDB_Trip[]> = {};
    for (const tripId in this.mapAgencyMatchDB_Trip[agencyId]) {
      const matchTrip = this.mapAgencyMatchDB_Trip[agencyId][tripId];
      const lineNumber = matchTrip.trip.route.route_short_name;
      if (!(lineNumber in mapLineMatchDB_Trips)) {
        mapLineMatchDB_Trips[lineNumber] = [];
      }
      mapLineMatchDB_Trips[lineNumber].push(matchTrip);
    }

    // POOL2 - Agency GTFS trips - for fuzzy matching
    const agencyMatchDB_Trips = Object.values(this.mapAgencyMatchDB_Trip[agencyId]);

    // Build a Map<LineNumber, SIRI_ET[]> for easier lookup
    const mapLineSIRI_ET_Journeys: Record<string, VehicleJourney[]> = {}
    this.mapAgencySIRI_ET_Journeys[agencyId].forEach(journey => {
      const serviceLine = journey.publishedLineName;
      if (!(serviceLine in mapLineSIRI_ET_Journeys)) {
        mapLineSIRI_ET_Journeys[serviceLine] = [];
      }

      mapLineSIRI_ET_Journeys[serviceLine].push(journey);
    });

    this.reportData.bothInAgency.siriET_NoGTFS_Items = [];
    this.reportData.bothInAgency.resultMatchNoGTFS_RT_Rows = [];
    this.reportData.bothInAgency.resultMatchRowsWithGTFS_RT_Rows = [];

    // Loop through SIRI_ET_Journey[]
    for (const serviceLine in mapLineSIRI_ET_Journeys) {
      const journeys = mapLineSIRI_ET_Journeys[serviceLine];

      journeys.forEach(journey => {
        const lineMatchDB_Trips = mapLineMatchDB_Trips[journey.publishedLineName] ?? [];
        const resultMatchRow = this.matchSIRI_ET_Journey(journey, lineMatchDB_Trips, agencyMatchDB_Trips);
        
        if (resultMatchRow.matchTrip === null) {
          this.reportData.bothInAgency.siriET_NoGTFS_Items.push(resultMatchRow);
        } else {
          const matchScore = resultMatchRow.matchTrip.matchScore ?? 0.0;
          const isPartialMatch = matchScore < 1.0;
          
          let matchText = 'MATCH';
          if (isPartialMatch) {
            matchText = 'PARTIAL ' + matchScore.toFixed(2);
          }

          const hasGTFS_RT = resultMatchRow.matchTrip.trip.gtfsRT !== null;
          const gtfsRT_matchText = hasGTFS_RT ? (resultMatchRow.matchTrip.trip.gtfsRT?.tripUpdate?.trip?.scheduleRelationship ?? 'GTFS-RT') : 'NO GTFS-RT';

          const reportResultItem: ReportResultItem = {
            serviceLine: journey.publishedLineName,
            siriET_JourneyRef: journey.vehicleJourneyRef,
            gtfsDB_matchClassNames: isPartialMatch ? 'bg-warning text-dark' : 'bg-success',
            gtfsDB_matchText: matchText,
            gtfsTripId: resultMatchRow.matchTrip.trip.tripID,
            gtfsServiceLine: resultMatchRow.matchTrip.trip.route.route_short_name,
            gtfsRT_matchText: gtfsRT_matchText,
            gtfsRT_matchTextClassNames: hasGTFS_RT ? 'bg-success' : 'bg-warning text-dark',
          };

          if (resultMatchRow.matchTrip.trip.gtfsRT === null) {
            this.reportData.bothInAgency.resultMatchNoGTFS_RT_Rows.push(reportResultItem);
          } else {
            this.reportData.bothInAgency.resultMatchRowsWithGTFS_RT_Rows.push(reportResultItem);
          }
        }
      });
    }

    console.log('OK parsed all mapAgencyGTFS_RT_Entity');
    console.log(this.reportData.bothInAgency);
    // debugger;
  }

  // at least 2 stop+deptime pairs should be matched between SIRI_ET journey and GTFS_static trips
  private fuzzyMatchSIRI_ET_JourneyAgainstGTFS_Trips(journeyStopKeys: string[], matchTrips: MatchDB_Trip[]): MatchDB_Trip | null {
    const foundMatchTrip = matchTrips.find(matchTrip => {
      const matchedStopKeys = journeyStopKeys.filter(stopKey => matchTrip.stopKeys.includes(stopKey));
      // ignore 0 or 1 matched keys
      if (matchedStopKeys.length < 2) {
        return false;
      }

      matchTrip.matchScore = parseFloat((matchedStopKeys.length / journeyStopKeys.length).toFixed(2));
      return true;
    }) ?? null;

    return foundMatchTrip;
  }

  private matchSIRI_ET_Journey(journey: VehicleJourney, lineMatchTrips: MatchDB_Trip[], agencyMatchTrips: MatchDB_Trip[]): ResultMatch {
    const resultMatchRow: ResultMatch = {
      vehicleJourney: journey,
      matchTrip: null,
    };

    const journeyStopKeys = MatchHelpers.computeSIRI_ET_JourneyStopKeys(journey);
    const journeyStopsKey = journeyStopKeys.join(LIST_DELIMITER);

    // TRY 1 - try exact match by stop+dep_time keys
    let foundMatchTrip = lineMatchTrips.find(el => el.stopsKey === journeyStopsKey) ?? null;

    if (foundMatchTrip !== null) {
      resultMatchRow.matchTrip = foundMatchTrip;
      resultMatchRow.matchTrip.matchScore = 1.0;
      return resultMatchRow;
    }

    // TRY 2 - try fuzzy match against GTFS_trips based on agency+lineName
    foundMatchTrip = this.fuzzyMatchSIRI_ET_JourneyAgainstGTFS_Trips(journeyStopKeys, lineMatchTrips);
    if (foundMatchTrip !== null) {
      resultMatchRow.matchTrip = foundMatchTrip;
      return resultMatchRow;
    }

    // TRY 3 - try fuzzy match against whole GTFS_trips from agency
    foundMatchTrip = this.fuzzyMatchSIRI_ET_JourneyAgainstGTFS_Trips(journeyStopKeys, agencyMatchTrips);
    if (foundMatchTrip === null) {
      resultMatchRow.matchTrip = foundMatchTrip;
      return resultMatchRow;
    }

    return resultMatchRow;
  }

  private updateBothInAgencyModel(agencyIds: string[]) {
    this.reportData.bothInAgency.agencyData = [];
    agencyIds.forEach((agencyId) => {
      if (agencyId === AGENCY_ID_NO_DATA) {
        return;
      }

      const agency = this.gtfsDBController.mapAgency[agencyId];

      const agencyJourneys = this.mapAgencySIRI_ET_Journeys[agencyId];
      const itemsNo = agencyJourneys.length;

      const agencyData: AgencyData = {
        agency: agency,
        itemsNo: itemsNo,
        text: agency.agency_name + ' (' + agencyId + ') - ' + itemsNo + ' items',
      }
      this.reportData.bothInAgency.agencyData.push(agencyData);
    });

    // Sort agencies by number of trips DESC
    this.reportData.bothInAgency.agencyData.sort((a, b) => b.itemsNo - a.itemsNo);
  }

  private updateBothInAgencyItemsModel(agencyId: string): Promise<void> {
    const response = new Promise<void>(resolve => {
      if (agencyId in this.mapAgencyMatchDB_Trip) {
        resolve();
        return;
      }

      this.httpService.fetchGTFS_AgencyTrips(this.gtfsDBController.gtfsDay, this.reportDayF, agencyId).subscribe({
        next: (response) => {
          const mapRoutes = this.gtfsDBController.mapRoutes;
          const mapStops = this.gtfsDBController.mapStops;

          this.mapAgencyMatchDB_Trip[agencyId] = {};

          response.rows.forEach(tripJSON => {
            const trip = Trip.initWithCondensedTrip(tripJSON, mapRoutes, mapStops, {});

            const stopKeys = MatchHelpers.computeGTFS_RT_TripStopKeys(trip); 
            this.mapAgencyMatchDB_Trip[agencyId][trip.tripID] = {
              id: trip.tripID,
              trip: trip,
              stopKeys: stopKeys,
              stopsKey: stopKeys.join(LIST_DELIMITER),
              matchScore: 0.0,
            };
          });
          
          resolve();
        },
        error: (error) => {
          console.error('Error fetching data:', error);
        }
      });
    });

    return response;
  }
}
