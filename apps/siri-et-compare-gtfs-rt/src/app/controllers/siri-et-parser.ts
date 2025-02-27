import { BaseXMLParser } from '../../shared/controllers/xml-parser/base-xml-parser';
import { VehicleJourney } from '../../shared/models/siri-et/vehicle-journey';

interface XML_Parser_Response {
  status: 'ERROR' | 'COUNT_ITEMS_NO' | 'PARSE.ITEM' | 'PARSE.DONE',
  itemsNo: number,
  items: any[],
};

export type XML_Parser_Callback = (response: XML_Parser_Response) => void;

export class SIRI_ET_Parser extends BaseXMLParser {
  private itemsNo: number; 
  private vehicleJourneys: VehicleJourney[];
  public callback: XML_Parser_Callback | null;

  constructor() {
    super();

    this.itemsNo = 0;
    this.vehicleJourneys = [];
    this.callback = null;
  }

  public override parseXML(responseXMLText: string): void {
    this.vehicleJourneys = [];

    if (this.callback) {
      this.itemsNo = responseXMLText.split('</EstimatedVehicleJourney>').length - 1;
      this.callback({
        status: 'COUNT_ITEMS_NO',
        itemsNo: this.itemsNo,
        items: this.vehicleJourneys,
      });
    }

    super.parseXML(responseXMLText);
  }

  protected override onCloseTag(nodeName: string): void {
    if (nodeName === 'EstimatedVehicleJourney') {
      const vehicleJourney = VehicleJourney.initWithTreeNode(this.currentNode);
      if (vehicleJourney) {
        this.vehicleJourneys.push(vehicleJourney);
        if (this.callback) {
          this.callback({
            status: 'PARSE.ITEM',
            itemsNo: this.itemsNo,
            items: this.vehicleJourneys,
          });
        }
      }
    }
  }

  protected override onEnd(): void {
    if (this.callback) {
      this.callback({
        status: 'PARSE.DONE',
        itemsNo: this.itemsNo,
        items: this.vehicleJourneys,
      });
    }
  }
}