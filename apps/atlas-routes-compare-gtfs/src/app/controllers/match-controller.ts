import Stop from "../../shared/models/gtfs/stop";
import { Trip } from "../../shared/models/gtfs/trip";
import Route from "../../shared/models/gtfs/route";
import { GTFS_DB_Controller } from "../../shared/controllers/gtfs-db-controller";

import { GeoHelpers } from "../../shared/helpers/geo-helpers";
import { FormatHelpers } from "../helpers/format-helpers"

import { AtlasLineDataController, AtlasRouteCSVRow, AtlasStopGeoJSONFeature } from "../../shared/controllers/atlas-data";
import { BusinessOrganisationsController } from "../../shared/controllers/business-organisations";
import { AgencyReportRow, AgencyRouteReportRow, AtlasOEV_RouteReportRow, GTFS_RouteReportRow, ReportData } from "../types/_all";

import { DEBUG_ROUTE_IDs } from "../constants";

interface MatchedGTFS_Route {
  route: Route,
  stops: Stop[],
  mapAtlasFeatures: Record<string, AtlasStopGeoJSONFeature>,
}

interface MatchIndexes {
  agencyRoutes: Record<string, Route[]>,
  routeNumberRoutes: Record<string, Route[]>,
  gtfsRoutes: Route[],
};

export class MatchController {
  private gtfsDBController: GTFS_DB_Controller; 
  private boController: BusinessOrganisationsController;
  private atlasLinieController: AtlasLineDataController; 
  private mapRouteTrips: Record<string, Trip>; 
  private mapAtlasRouteFeatures: Record<string, AtlasStopGeoJSONFeature[]>;
  private mapAtlasOEV_Routes: Record<string, AtlasOEV_RouteReportRow>;

  constructor(
    gtfsDBController: GTFS_DB_Controller, 
    boController: BusinessOrganisationsController, 
    atlasLinieController: AtlasLineDataController, 
    mapRouteTrips: Record<string, Trip>, 
    mapAtlasRouteFeatures: Record<string, AtlasStopGeoJSONFeature[]>,
    mapAtlasOEV_Routes: Record<string, AtlasOEV_RouteReportRow>,
  ) {
      this.gtfsDBController = gtfsDBController;
      this.boController = boController;
      this.atlasLinieController = atlasLinieController;
      this.mapRouteTrips = mapRouteTrips;
      this.mapAtlasRouteFeatures = mapAtlasRouteFeatures;
      this.mapAtlasOEV_Routes = mapAtlasOEV_Routes;
  }

  public process(reportData: ReportData) {
    // STEP1 - build GTFS lookup "indexes"
    const matchIndexes: MatchIndexes = {
      agencyRoutes: {},
      routeNumberRoutes: {},
      gtfsRoutes: Object.values(this.gtfsDBController.mapRoutes),
    };
    
    matchIndexes.gtfsRoutes.forEach(route => {
      const agencyId = route.agency.agency_id;
      if (!(agencyId in matchIndexes.agencyRoutes)) {
        matchIndexes.agencyRoutes[agencyId] = [];
      }

      const routeNumber = route.route_short_name;
      if (route.route_short_name.trim().length === 0) {
        console.error('DATA issue: empty route_short_name ?');
        console.log(route);
        debugger;
      }
      if (!(routeNumber in matchIndexes.routeNumberRoutes)) {
        matchIndexes.routeNumberRoutes[routeNumber] = [];
      }

      matchIndexes.agencyRoutes[agencyId].push(route);
      matchIndexes.routeNumberRoutes[routeNumber].push(route);
    });

    console.log('MATCH INDEXES');
    console.log(matchIndexes);
    console.log('========');

    reportData.agencyReportRows = [];
    reportData.agencySelectRows = [];

    for(const sboid in this.atlasLinieController.mapAgencyRows) {
      const boCSV_Row = this.boController.mapSboid[sboid] ?? null;
      if (boCSV_Row === null) {
        console.error('Cant find ATLAS sboid: ' + sboid);
        debugger;
      }

      const atlasRoutes = this.atlasLinieController.mapAgencyRows[sboid];

      reportData.stats.routesNo += atlasRoutes.length;

      const agencyId = boCSV_Row.organisationNumber;
      const agency = this.gtfsDBController.mapAgency[agencyId] ?? null;

      const agencyReportRow: AgencyReportRow = {
        organisation: boCSV_Row,
        agency: agency,
        stats: {
          routesNo: atlasRoutes.length,
          matchedOK_No: 0,
          matchedFuzzy_No: 0,
          notMatched_No: 0,
        },
        routeReportRows: [],
      };

      const agencyRoutes: Route[] = (() => {
        if (agencyId === null) {
          return [];
        }
  
        const routes = matchIndexes.agencyRoutes[agencyId] ?? [];
        
        // sort routes by route_short_name
        routes.sort((a, b) => {
          const keyA = a.route_short_name.padStart(5, '0');
          const keyB = b.route_short_name.padStart(5, '0');
          return keyA.localeCompare(keyB);
        });
        
        return routes;
      })();

      for (const atlasRoute of atlasRoutes) {
        if (DEBUG_ROUTE_IDs && !DEBUG_ROUTE_IDs.includes(atlasRoute.slnid)) {
          continue;
        }
        
        const routeReportRow = this.processRoute(reportData, atlasRoute, agencyRoutes, matchIndexes);

        const isOK = routeReportRow.matchedStatus === 'OK' 
          || routeReportRow.matchedStatus === 'OK_EXT'
          || routeReportRow.matchedStatus === 'OK_FUZZY_SAME_ROUTE' 
          || routeReportRow.matchedStatus === 'OK_FUZZY_OTHER_AGENCY'
          || routeReportRow.matchedStatus === 'OK_FUZZY_OTHER_ROUTE'
          || routeReportRow.matchedStatus === 'OK_FUZZY_GTFS_ALL';
        if (isOK) {
          reportData.stats.matchedOK_No += 1;
          agencyReportRow.stats.matchedOK_No += 1;
        }

        const isFuzzy = routeReportRow.matchedStatus === 'NO_MATCHES_FUZZY_SAME_ROUTE' || routeReportRow.matchedStatus === 'NO_MATCHES_FUZZY_OTHER_AGENCY';
        if (isFuzzy) {
          reportData.stats.matchedFuzzy_No += 1;
          agencyReportRow.stats.matchedFuzzy_No += 1;
        }
        
        if (routeReportRow.matchedStatus === 'NO_MATCHES') {
          reportData.stats.notMatched_No += 1;
          agencyReportRow.stats.notMatched_No += 1;
        }
    
        agencyReportRow.routeReportRows.push(routeReportRow);
      }

      reportData.agencyReportRows.push(agencyReportRow);
    }

    reportData.agencyFilterReportRows = Array.from(reportData.agencyReportRows);
  }

  private matchRouteByAgencyAndNumber(routeReportRow: AgencyRouteReportRow, matchIndexes: MatchIndexes, agencyRoutes: Route[]) {
    const swissLineNumber = routeReportRow.atlasRoute.swissLineNumber;
    const swissLineNumberParts = swissLineNumber.split('.');
    const swissLineNumberCat = swissLineNumberParts[0];

    if (swissLineNumberCat === 'c') {
      // AV Autoverlad is not in GTFS
      routeReportRow.matchedStatus = 'NO_MATCHES';
      return;
    }

    if (swissLineNumber.endsWith(':K')) {
      // meta routes, i.e. multiple routes
      routeReportRow.matchedStatus = 'NO_MATCHES';
      return;
    }

    // TRY to see if PDF has already a GTFS route
    const slnid = routeReportRow.atlasRoute.slnid;
    const atlasPDF_Route = this.mapAtlasOEV_Routes[slnid] ?? null;
    if (atlasPDF_Route && atlasPDF_Route.status === 'OK_TRIP') {
      const gtfsRouteId = atlasPDF_Route.gtfs_route_id ?? null;
      if (gtfsRouteId) {
        const gtfsRouteRoute = this.gtfsDBController.mapRoutes[gtfsRouteId] ?? null;
        if (gtfsRouteRoute) {
          routeReportRow.matchedStatus = 'OK_EXT';
          routeReportRow.matchedGTFS_Route = gtfsRouteRoute;

          const oevId = swissLineNumberParts.slice(1).join('.');
          const oevYear = '2025'; // TODO - add this in config?
          routeReportRow.oevLink = 'https://www.oev-info.ch/de/fahrplan-aktuell/fahrplanfelder/' + oevYear + '-' + oevId;
          return;
        }
      }
    }

    // TRY special case - 1 GTFS route - 1 AtlasRoute for same agency
    const atlasRoutesNo = this.atlasLinieController.mapAgencyRows[routeReportRow.atlasRoute.businessOrganisation].length;
    if ((atlasRoutesNo === 1) && (agencyRoutes.length === 1)) {
      routeReportRow.matchedStatus = 'OK';
      routeReportRow.matchedGTFS_Route = agencyRoutes[0];
      return;
    }

    // TRY 1-1 match for agency_id, route_short_name
    const routeNumber = routeReportRow.atlasRoute.number;
    const agencyRouteNumberRoutes = agencyRoutes.filter(el => el.route_short_name === routeNumber);
    if (agencyRouteNumberRoutes.length === 1) {
      routeReportRow.matchedStatus = 'OK';
      routeReportRow.matchedGTFS_Route = agencyRouteNumberRoutes[0];
      return;
    }

    // FUZZY match for agency_id, route_short_name
    if (agencyRouteNumberRoutes.length > 1) {
      this.fuzzyMatchRoute(routeReportRow, agencyRouteNumberRoutes);

      if (routeReportRow.matchedGTFS_Route !== null) {
        routeReportRow.matchedStatus = 'OK_FUZZY_SAME_ROUTE';
        routeReportRow.gtfsReportRoutes = this.computeGTFS_ReportRoutes(agencyRouteNumberRoutes);
        return;
      }
    }

    const otherAgencyRouteNumberRoutes = matchIndexes.routeNumberRoutes[routeNumber] ?? [];
    if (otherAgencyRouteNumberRoutes.length > 0) {
      this.fuzzyMatchRoute(routeReportRow, otherAgencyRouteNumberRoutes);

      if (routeReportRow.matchedGTFS_Route !== null) {
        routeReportRow.matchedStatus = 'OK_FUZZY_OTHER_AGENCY';
        routeReportRow.gtfsReportRoutes = this.computeGTFS_ReportRoutes(otherAgencyRouteNumberRoutes);
        return;
      }
    }

    // For IC4, RE10, etc - try to match the IC, RE routes
    const fuzzyRouteNumber = routeNumber.replace(/^([A-Z]{1,})[0-9]{1,}/, '$1');
    if (fuzzyRouteNumber !== routeNumber) {
      const fuzzyRouteNumberRoutes = matchIndexes.routeNumberRoutes[fuzzyRouteNumber] ?? [];
      this.fuzzyMatchRoute(routeReportRow, fuzzyRouteNumberRoutes);

      if (routeReportRow.matchedGTFS_Route !== null) {
        routeReportRow.matchedStatus = 'OK_FUZZY_OTHER_ROUTE';
        routeReportRow.gtfsReportRoutes = this.computeGTFS_ReportRoutes(fuzzyRouteNumberRoutes);
        return;
      }
    }
    
    this.fuzzyMatchRoute(routeReportRow, agencyRoutes);
    if (routeReportRow.matchedGTFS_Route !== null) {
      routeReportRow.matchedStatus = 'OK_FUZZY_OTHER_ROUTE';
      routeReportRow.gtfsReportRoutes = this.computeGTFS_ReportRoutes(agencyRoutes);
      return;
    }

    this.fuzzyMatchRoute(routeReportRow, matchIndexes.gtfsRoutes);
    if (routeReportRow.matchedGTFS_Route !== null) {
      routeReportRow.matchedStatus = 'OK_FUZZY_GTFS_ALL';
      routeReportRow.gtfsReportRoutes = this.computeGTFS_ReportRoutes([routeReportRow.matchedGTFS_Route]);
      return;
    }

    if (agencyRouteNumberRoutes.length === 0) {
      if (otherAgencyRouteNumberRoutes.length === 0) {
        routeReportRow.matchedStatus = 'NO_MATCHES';
      } else {
        routeReportRow.matchedStatus = 'NO_MATCHES_FUZZY_OTHER_AGENCY';  
        routeReportRow.gtfsReportRoutes = this.computeGTFS_ReportRoutes(otherAgencyRouteNumberRoutes);
      }
    } else {
      routeReportRow.matchedStatus = 'NO_MATCHES_FUZZY_SAME_ROUTE';
      routeReportRow.gtfsReportRoutes = this.computeGTFS_ReportRoutes(agencyRouteNumberRoutes);
    }

    // DebugHelpers.debugAtlasRoute(routeReportRow);
    // DebugHelpers.debugGTFS_RouteTrip();
  }

  private processRoute(reportData: ReportData, atlasRoute: AtlasRouteCSVRow, agencyRoutes: Route[], matchIndexes: MatchIndexes): AgencyRouteReportRow {
    const geocoderStopFeatures = this.mapAtlasRouteFeatures[atlasRoute.slnid] ?? [];

    const routeReportRow: AgencyRouteReportRow = {
      atlasRoute: atlasRoute,
      gtfsReportRoutes: [],
      geocoderStopFeatures: geocoderStopFeatures,
      matchedStatus: 'NONE',
      matchedStatusClassNames: reportData.lookups.matchedStatusClassNames.NO_MATCHES,
      matchedGTFS_Route: null,
      matchedGTFS_Trip: null,
      matchedGTFS_TripStopsText: null,
      matchNote: '',
      showInGUI: true,
    };

    this.matchRouteByAgencyAndNumber(routeReportRow, matchIndexes, agencyRoutes);

    routeReportRow.matchedStatusClassNames = reportData.lookups.matchedStatusClassNames[routeReportRow.matchedStatus];

    const route = routeReportRow.matchedGTFS_Route;
    if (route !== null) {
      const trip = this.mapRouteTrips[route.route_id];
      routeReportRow.matchedGTFS_Trip = trip;
      routeReportRow.matchedGTFS_TripStopsText = FormatHelpers.computeTripStopsText(trip);

      const selectedReportRouteIdx = routeReportRow.gtfsReportRoutes.findIndex(el => el.route.route_id === route.route_id);
      if (selectedReportRouteIdx > -1) {
        // promote the matched route to be shown up first in the table
        const selectedReportRoute = routeReportRow.gtfsReportRoutes.splice(selectedReportRouteIdx, 1)[0];
        routeReportRow.gtfsReportRoutes = [selectedReportRoute].concat(routeReportRow.gtfsReportRoutes);
      }
    }
    
    return routeReportRow;
  }

  private computeGTFS_ReportRoutes(routes: Route[]): GTFS_RouteReportRow[] {
    const gtfsReportRoutes: GTFS_RouteReportRow[] = [];

    routes.forEach(route => {
      const trip = this.mapRouteTrips[route.route_id] ?? null;
      if (trip === null) {
        console.error("CANT FIND trip for route " + route.route_id);
        return;
      }

      const gtfsReportRoute: GTFS_RouteReportRow = {
        route: route,
        routeText: FormatHelpers.computeTripStopsText(trip),
      };
      gtfsReportRoutes.push(gtfsReportRoute);
    });

    return gtfsReportRoutes;
  }

  private fuzzyMatchRoute(routeReportRow: AgencyRouteReportRow, targetMatchGTFS_Routes: Route[]) {
    if (targetMatchGTFS_Routes.length === 0) {
      return;
    }

    if (routeReportRow.geocoderStopFeatures.length === 0) {
      return;
    }

    const debugRoutes = DEBUG_ROUTE_IDs && DEBUG_ROUTE_IDs.includes(routeReportRow.atlasRoute.slnid);

    if (debugRoutes) {
      console.log('DEBUG fuzzyMatchRoute. geocoderStopFeatures ' + routeReportRow.geocoderStopFeatures.length);
      console.log(routeReportRow.geocoderStopFeatures.map(el => el.properties["atlas.stopName"]));
      console.log(routeReportRow.geocoderStopFeatures.map(el => (el.geometry.coordinates[1] + ',' + el.geometry.coordinates[0])));
    }

    const matchedGTFS_Routes: MatchedGTFS_Route[] = [];
    targetMatchGTFS_Routes.forEach(gtfsRoute => {
      const trip = this.mapRouteTrips[gtfsRoute.route_id] || null;
      if (trip === null) {
        return;
      }

      if (debugRoutes) {
        console.log('DEBUG fuzzyMatchRoute. GTFS ' + gtfsRoute.route_id);
        console.log(trip.stop_times.map(el => el.stop.stop_name));
      }

      const matchedGTFS_Route: MatchedGTFS_Route = {
        route: gtfsRoute,
        stops: [],
        mapAtlasFeatures: {},
      };
      trip.stop_times.forEach(stopTime => {
        routeReportRow.geocoderStopFeatures.forEach(geocoderStopFeature => {
          const pointA_Coords = geocoderStopFeature.geometry.coordinates;
          const pointB = stopTime.stop;
          const dAB = GeoHelpers.haversineDistance(pointA_Coords[0], pointA_Coords[1], pointB.stop_lon, pointB.stop_lat);

          if (dAB < 2000) {
            matchedGTFS_Route.stops.push(stopTime.stop);
            const stopRef = geocoderStopFeature.properties.stopId ?? null;
            const stopName = geocoderStopFeature.properties["atlas.stopName"];

            if (debugRoutes) {
              console.log('... found ' + stopName + ' next to gtfs.stop ' + stopTime.stop.stop_name + ' - ' + dAB + ' meters');
            }

            matchedGTFS_Route.mapAtlasFeatures[stopName] = geocoderStopFeature;
          }
        });
      });

      if (Object.keys(matchedGTFS_Route.mapAtlasFeatures).length > 1) {
        matchedGTFS_Routes.push(matchedGTFS_Route);
      }
    });

    if (matchedGTFS_Routes.length > 0) {
      matchedGTFS_Routes.sort((a, b) => (b.stops.length - a.stops.length));
      routeReportRow.matchedGTFS_Route = matchedGTFS_Routes[0].route;
    }
  }
}
