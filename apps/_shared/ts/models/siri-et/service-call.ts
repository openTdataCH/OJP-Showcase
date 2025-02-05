import { TreeNode } from '../../controllers/xml-parser/models/tree-node';

export class ServiceCall {
  public stopPointRef: string;
  public stopPointName: string | null;
  public arrDateTime: Date | null;
  public depDateTime: Date | null;

  constructor(stopPointRef: string, stopPointName: string | null, arrDateTime: Date | null, depDateTime: Date | null) {
    this.stopPointRef = stopPointRef;
    this.stopPointName = stopPointName;
    this.arrDateTime = arrDateTime;
    this.depDateTime = depDateTime;
  }

  public static initWithTreeNode(treeNode: TreeNode): ServiceCall | null {
    const stopPointRef = treeNode.findTextFromChildNamed('StopPointRef');
    if (stopPointRef === null) {
      console.error('ServiceCall.initWithTreeNode - ERROR, empty StopPointRef')
      console.log(treeNode);
      debugger;
      
      return null;
    }

    const stopPointName = treeNode.findTextFromChildNamed('StopPointName');

    let arrDateTime: Date | null = null;
    const arrDateTimeS = treeNode.findTextFromChildNamed('AimedArrivalTime');
    if (arrDateTimeS !== null) {
      arrDateTime = new Date(arrDateTimeS);
    }

    let depDateTime: Date | null = null;
    const depDateTimeS = treeNode.findTextFromChildNamed('AimedDepartureTime');
    if (depDateTimeS !== null) {
      depDateTime = new Date(depDateTimeS);
    }

    const serviceCall = new ServiceCall(stopPointRef, stopPointName, arrDateTime, depDateTime);

    return serviceCall;
  }
}
