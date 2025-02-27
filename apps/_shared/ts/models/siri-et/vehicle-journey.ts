import { TreeNode } from '../../controllers/xml-parser/models/tree-node';

import { ServiceCall } from './service-call';

export class VehicleJourney {
  public vehicleJourneyRef: string;
  public vehicleDayRef: string;
  public operatorRef: string;
  public lineRef: string;
  public publishedLineName: string;
  public serviceCalls: ServiceCall[];

  public vehicleMode: string | null;
  
  constructor(vehicleJourneyRef: string, vehicleDayRef: string, operatorRef: string, lineRef: string, publishedLineName: string, serviceCalls: ServiceCall[], vehicleMode: string | null) {
    this.vehicleJourneyRef = vehicleJourneyRef;
    this.vehicleDayRef = vehicleDayRef;
    this.operatorRef = operatorRef;
    this.lineRef = lineRef;
    this.publishedLineName = publishedLineName;
    this.serviceCalls = serviceCalls;

    this.vehicleMode = vehicleMode;
  }

  public static initWithTreeNode(treeNode: TreeNode): VehicleJourney | null {
    const vehicleJourneyRef = treeNode.findTextFromChildNamed('FramedVehicleJourneyRef/DatedVehicleJourneyRef');
    const vehicleDayRef = treeNode.findTextFromChildNamed('FramedVehicleJourneyRef/DataFrameRef');
    const operatorRef = treeNode.findTextFromChildNamed('OperatorRef');
    const lineRef = treeNode.findTextFromChildNamed('LineRef');
    const directionRef = treeNode.findTextFromChildNamed('DirectionRef');
    const publishedLineName = treeNode.findTextFromChildNamed('PublishedLineName');

    if (vehicleJourneyRef === null) {
      console.error('VehicleJourney.initWithTreeNode - ERROR, empty FramedVehicleJourneyRef/DatedVehicleJourneyRef')
      console.log(treeNode);
      debugger;
      
      return null;
    }
    if (vehicleDayRef === null) {
      console.error('VehicleJourney.initWithTreeNode - ERROR, empty FramedVehicleJourneyRef/DataFrameRef')
      console.log(treeNode);
      debugger;
      
      return null;
    }
    if (operatorRef === null) {
      console.error('VehicleJourney.initWithTreeNode - ERROR, empty OperatorReff')
      console.log(treeNode);
      debugger;
      
      return null;
    }
    if (lineRef === null) {
      console.error('VehicleJourney.initWithTreeNode - ERROR, empty LineRef')
      console.log(treeNode);
      debugger;
      
      return null;
    }
    if (directionRef === null) {
      console.error('VehicleJourney.initWithTreeNode - ERROR, empty DirectionRef')
      console.log(treeNode);
      debugger;
      
      return null;
    }
    if (publishedLineName === null) {
      console.error('VehicleJourney.initWithTreeNode - ERROR, empty PublishedLineName')
      console.log(treeNode);
      debugger;
      
      return null;
    }

    const vehicleMode = treeNode.findTextFromChildNamed('VehicleMode');

    const recordedServiceCallNodes = treeNode.findChildrenNamed('RecordedCalls/RecordedCall');
    const estimatedServiceCallNodes = treeNode.findChildrenNamed('EstimatedCalls/EstimatedCall');

    const serviceCalls: ServiceCall[] = [];
    const serviceCallNodes = recordedServiceCallNodes.concat(estimatedServiceCallNodes);
    let prevServiceCall: ServiceCall | null = null; 
    serviceCallNodes.forEach(serviceCallNode => {
      const serviceCall = ServiceCall.initWithTreeNode(serviceCallNode);
      if (serviceCall === null) {
        return;
      }

      // catch situations when the StopPointRef is also in RecordedCall but also in EstimatedCall 
      if (prevServiceCall && (prevServiceCall.stopPointRef === serviceCall.stopPointRef)) {
        return;
      }
        
      serviceCalls.push(serviceCall);
      prevServiceCall = serviceCall;
    });

    if (serviceCalls.length < 2) {
      // TODO - should not be the case
      console.error('invalid service, less than 2 calls: ' + vehicleJourneyRef);
      return null;
    }

    const vehicleJourney = new VehicleJourney(vehicleJourneyRef, vehicleDayRef, operatorRef, lineRef, publishedLineName, serviceCalls, vehicleMode);

    return vehicleJourney;
  }
}
