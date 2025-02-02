import * as Papa from 'papaparse';

import { BusinessOrganisationRowCSV } from "../models/business-organisations";

export class BusinessOrganisationsController {
  public mapOrganisationNumber: Record<string, BusinessOrganisationRowCSV>;
  public mapSboid: Record<string, BusinessOrganisationRowCSV>;

  constructor() {
    this.mapOrganisationNumber = {};
    this.mapSboid = {};
  }

  public async loadFromCSV(boCSV_s: string): Promise<void> {
    this.mapOrganisationNumber = {};
    this.mapSboid = {};

    const promise = new Promise<void>(resolve => {
      // manual parsing of headers, otherwise header: true leads to many warnings
      let headers: string[] | null = null;

      Papa.parse(boCSV_s, {
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
            const csvRow: Record<string, string> = {};
            const rowValues = row.data as string[];
            headers.forEach((header, idx) => {
              csvRow[header] = rowValues[idx].trim().replace(/^"/, '').replace(/"$/, '');
            });

            const boRowCSV = (csvRow as unknown) as BusinessOrganisationRowCSV;
            this.mapOrganisationNumber[boRowCSV.organisationNumber] = boRowCSV;
            this.mapSboid[boRowCSV.sboid] = boRowCSV;
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
