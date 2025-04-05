import { VehicleJourney } from "../../shared/models/siri-et/vehicle-journey";
import { BusinessOrganisationsController } from "../../shared/controllers/business-organisations";
import { MapAgencySIRI_ET_Journeys } from "../../shared/helpers/siri-et-helpers";

import { ReportData, StopReportOrganisationRow, StopReportRow } from "../types/_all";

type StopWithIssues = {
  didokRef: string,
  name: string,
  mapSloids: Record<string, boolean>,
  // AgencyId > Line > VehicleJourney[]
  mapAgencyLinesMessages: Record<string, Record<string, VehicleJourney[]>>,
};

export class ReportController {
  private mapAgencySIRI_ET_Journeys: MapAgencySIRI_ET_Journeys;
  private boController: BusinessOrganisationsController;

  constructor(mapAgencySIRI_ET_Journeys: MapAgencySIRI_ET_Journeys, boController: BusinessOrganisationsController) {
    this.mapAgencySIRI_ET_Journeys = mapAgencySIRI_ET_Journeys;
    this.boController = boController;
  }

  public processData(reportData: ReportData) {
    reportData.siriET_totalIssuesNo = 0;
    reportData.stopReportRows = [];

    const mapStopsSloidIssues: Record<string, StopWithIssues> = {};

    for (const agencyId in this.mapAgencySIRI_ET_Journeys) {
      const vehicleJourneys = this.mapAgencySIRI_ET_Journeys[agencyId];

      vehicleJourneys.forEach(vehicleJourney => {
        const serviceLine = vehicleJourney.publishedLineName;

        vehicleJourney.serviceCalls.forEach(serviceCall => {
          const stopPointRef = serviceCall.stopPointRef;

          const hasIssues = (() => {
            if (stopPointRef.startsWith('85')) {
              return true;
            }
            if (stopPointRef.startsWith('ch:1:ScheduledStopPoint:85')) {
              return true;
            }
  
            return false;
          })();

          if (!hasIssues) {
            return;
          }

          reportData.siriET_totalIssuesNo += 1;

          const didokRef = (() => {
            let ref = stopPointRef.replace('ch:1:ScheduledStopPoint:', '');
            if (ref.length !== 7) {
              ref = ref.slice(0, 7);
            }

            return ref;
          })();

          if (!(didokRef in mapStopsSloidIssues)) {
            const stopName = serviceCall.stopPointName ?? 'n/a stopPointName';
            const stopsSloidIssues: StopWithIssues = {
              didokRef: didokRef,
              name: stopName,
              mapSloids: {},
              mapAgencyLinesMessages: {},
            };

            mapStopsSloidIssues[didokRef] = stopsSloidIssues;
          }

          mapStopsSloidIssues[didokRef].mapSloids[stopPointRef] = true;

          if (!(agencyId in mapStopsSloidIssues[didokRef].mapAgencyLinesMessages)) {
            mapStopsSloidIssues[didokRef].mapAgencyLinesMessages[agencyId] = {};
          }

          if (!(serviceLine in mapStopsSloidIssues[didokRef].mapAgencyLinesMessages[agencyId])) {
            mapStopsSloidIssues[didokRef].mapAgencyLinesMessages[agencyId][serviceLine] = [];
          }
          mapStopsSloidIssues[didokRef].mapAgencyLinesMessages[agencyId][serviceLine].push(vehicleJourney);
        });
      });
    }

    for (const didokRef in mapStopsSloidIssues) {
      const url = 'https://atlas.app.sbb.ch/service-point-directory/service-points/' + didokRef + '/service-point';
      const stopsSloidIssues = mapStopsSloidIssues[didokRef];

      const stopReportRow: StopReportRow = {
        didokRef: didokRef,
        stopPointName: stopsSloidIssues.name,
        url: url,
        sloidIssues: Object.keys(stopsSloidIssues.mapSloids),

        organisations: [],
        totalAffectedMessagesNo: 0,

        debugMap1: stopsSloidIssues,
      };

      for (const agencyId in stopsSloidIssues.mapAgencyLinesMessages) {
        const publishedLineNumbers = Object.keys(stopsSloidIssues.mapAgencyLinesMessages[agencyId]);

        const boData = this.boController.mapOrganisationNumber[agencyId] ?? null;
        const agencyTitle: string = (() => {
          if (boData === null) {
            return 'NO_AGENCY_DATA';
          }

          const title = boData.descriptionDe + ' (' + boData.abbreviationDe + ')';
          return title;
        })();

        const agencyURL: string = (() => {
          let baseURL = 'https://atlas.app.sbb.ch/business-organisation-directory/business-organisations';

          if (boData === null) {
            return baseURL;
          }

          const url = baseURL + '/' + boData.sboid;
          return url;
        })();

        const sboid = boData.sboid ?? 'n/a SBOID for AgencyId: ' + agencyId;

        const stopReportOrganisationRow: StopReportOrganisationRow = {
          sboid: sboid,
          url: agencyURL,
          agencyTitle: agencyTitle,
          publishedLineNumbers: publishedLineNumbers,
        };

        for (const lineNumber in stopsSloidIssues.mapAgencyLinesMessages[agencyId]) {
          const itemsNo = stopsSloidIssues.mapAgencyLinesMessages[agencyId][lineNumber].length;
          stopReportRow.totalAffectedMessagesNo += itemsNo;
        }

        stopReportRow.organisations.push(stopReportOrganisationRow);
      }

      reportData.stopReportRows.push(stopReportRow);
    }

    reportData.stopReportRows = reportData.stopReportRows.sort((a, b) => {
      const scoreA = a.organisations.length * 10 + a.totalAffectedMessagesNo / 1000;
      const scoreB = b.organisations.length * 10 + b.totalAffectedMessagesNo / 1000;

      return scoreB - scoreA;
    });

    console.log(reportData.stopReportRows);
  }
}