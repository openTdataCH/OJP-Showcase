import { BusinessOrganisationsController } from "../../shared/controllers/business-organisations";
import { AgencyReportRow, MapAgencySIRI_ET_Journeys, ReportData, ServiceCallStop, VehicleJourneyReportRow } from "../types/_all";

export class ReportController {
  private mapAgencySIRI_ET_Journeys: MapAgencySIRI_ET_Journeys;
  private boController: BusinessOrganisationsController;

  constructor(mapAgencySIRI_ET_Journeys: MapAgencySIRI_ET_Journeys, boController: BusinessOrganisationsController) {
    this.mapAgencySIRI_ET_Journeys = mapAgencySIRI_ET_Journeys;
    this.boController = boController;
  }

  public processData(reportData: ReportData) {
    reportData.siriET_totalIssuesNo = 0;
    reportData.agencyReportRows = [];

    for (const agencyId in this.mapAgencySIRI_ET_Journeys) {
      const vehicleJourneys = this.mapAgencySIRI_ET_Journeys[agencyId];

      const boRow = this.boController.mapOrganisationNumber[agencyId] ?? null;
      const agencyTitle: string = (() => {
        if (boRow === null) {
          return 'NO_AGENCY_DATA';
        }

        const title = boRow.descriptionDe + ' (' + boRow.abbreviationDe + ')';
        return title;
      })();
      
      const agencyReportRow: AgencyReportRow = {
        agencyTitle: agencyTitle,
        agencyURL: null,
        totalMessagesNo: vehicleJourneys.length,
        
        organisation: boRow,
        stopsWithIssues: [],
        vehicleJourneyReportRows: [],
      };

      if (boRow) {
        agencyReportRow.agencyURL = 'https://atlas.app.sbb.ch/business-organisation-directory/business-organisations/' + boRow.sboid;
      }

      const mapAgencyStopWithIssues: Record<string, ServiceCallStop> = {};
      
      vehicleJourneys.forEach(vehicleJourney => {
        const stops: ServiceCallStop[] = [];
        vehicleJourney.serviceCalls.forEach(serviceCall => {
          const hasIssues = (() => {
            if (serviceCall.stopPointRef.startsWith('85')) {
              return true;
            }
            if (serviceCall.stopPointRef.startsWith('ch:1:ScheduledStopPoint:85')) {
              return true;
            }

            return false;
          })();

          const serviceCallStop: ServiceCallStop = {
            hasSloidIssue: hasIssues,
            stopPointRef: serviceCall.stopPointRef,
            stopPointName: serviceCall.stopPointName ?? 'n/a stopPointName',
            
            // update this only for `hasIssues`
            didokRef: 'n/a',
            url: 'n/a',
          };
          
          if (hasIssues) {
            serviceCallStop.didokRef = serviceCall.stopPointRef.replace('ch:1:ScheduledStopPoint:', '');
            if (serviceCallStop.didokRef.length !== 7) {
              // strip last digits for ScheduledStopPoint
              serviceCallStop.didokRef = serviceCallStop.didokRef.slice(0, 7);
            }
            
            serviceCallStop.url = 'https://atlas.app.sbb.ch/service-point-directory/service-points/' + serviceCallStop.didokRef + '/service-point';

            reportData.siriET_totalIssuesNo += 1;

            if (!(serviceCallStop.didokRef in mapAgencyStopWithIssues)) {
              mapAgencyStopWithIssues[serviceCallStop.didokRef] = serviceCallStop;
            }
          }

          stops.push(serviceCallStop);
        });

        const stopsWithIssues = stops.filter(el => el.hasSloidIssue);

        if (stopsWithIssues.length > 0) {
          const reportRow: VehicleJourneyReportRow = {
            vehicleJourney: vehicleJourney,
            stopsWithIssues: stopsWithIssues,
            stops: stops,
          };
          
          agencyReportRow.vehicleJourneyReportRows.push(reportRow);
        }
      });

      if (agencyReportRow.vehicleJourneyReportRows.length > 0) {
        agencyReportRow.stopsWithIssues = Object.values(mapAgencyStopWithIssues);
        reportData.agencyReportRows.push(agencyReportRow);
      }
    }

    reportData.agencyReportRows = reportData.agencyReportRows.sort((a, b) => b.vehicleJourneyReportRows.length - a.vehicleJourneyReportRows.length);

    console.log(reportData.agencyReportRows);
  }
}