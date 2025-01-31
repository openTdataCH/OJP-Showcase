import Papa from 'papaparse';
import { Feature, FeatureCollection, Point } from 'geojson';

export interface AtlasRouteCSVRow {
  businessOrganisation: string
  comment: string
  description: string
  lineType: string
  number: string
  slnid: string
  status: string
  swissLineNumber: string
}

export interface AtlasStopGeoJSONFeature extends Feature<Point> {
  properties: {
    stopId: string,
    stopName: string,
    'atlas.stopName': string,
    'atlas.slnids': string, // slnids plural, they are | separated
    'atlas.description': string, // the route description from first route (slnid)
  }
} 

export interface AtlasStopsFeatureCollection extends FeatureCollection {
   features: AtlasStopGeoJSONFeature[],
}

export class AtlasLineDataController {
  public mapAgencyRows: Record<string, AtlasRouteCSVRow[]>;

  constructor() {
    this.mapAgencyRows = {};
  }

  public async loadFromCSV(responseCSV_s: string): Promise<void> {
    this.mapAgencyRows = {};

    const promise = new Promise<void>(resolve => {
      // manual parsing of headers, otherwise header: true leads to many warnings
      let headers: string[] | null = null;
      let prevRowValues: string[] = [];

      Papa.parse(responseCSV_s, {
        header: false, // see above
        delimiter: ';',
        dynamicTyping: false,
        skipEmptyLines: true,
        fastMode: true,
        step: (row) => {
          if (headers === null) {
            headers = [];
            (row.data as string[]).forEach(rowHeader => {
              rowHeader = rowHeader.replace(/^"/, '');
              rowHeader = rowHeader.replace(/"$/, '');
              headers?.push(rowHeader);
            });
          } else {
            const rowCSV: Record<string, string> = {};
            let rowValues = row.data as string[];

            // Detect multi-line rows
            if (prevRowValues.length > 0) {
              // first rowValues entry is appended to last prevRowValues entry
              const lastPrevRowValue = prevRowValues.pop();
              if (rowValues.length > 0) {
                rowValues[0] = (rowValues[0] + ' ' + lastPrevRowValue).replaceAll('"', '');
              }

              rowValues = prevRowValues.concat(rowValues);
            }
            
            if (rowValues.length < headers.length) {
              prevRowValues = rowValues;
              return;
            }

            if (rowValues.length > headers.length) {
              console.error('ERORR occured while concatenating multi-line rows')
              prevRowValues = [];
              return;
            }

            headers.forEach((header, idx) => {
              rowCSV[header] = rowValues[idx].trim().replace(/^"/, '').replace(/"$/, '');
            });

            const atlasLineRowCSV = (rowCSV as unknown) as AtlasRouteCSVRow;

            const agencyId = atlasLineRowCSV.businessOrganisation;
            if (!(agencyId in this.mapAgencyRows)) {
              this.mapAgencyRows[agencyId] = [];
            }

            this.mapAgencyRows[agencyId].push(atlasLineRowCSV);

            prevRowValues = [];
          }
        },
        complete: (results) => {
          resolve();
        },
        error: (error: any) => {
          console.error("Parsing Error:", error)
          debugger;
        },
      });
    });

    return promise;
  }
}
