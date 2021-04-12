import PublicTransportMode from './public-transport-mode'

import XpathOJP from '../helpers/xpath-ojp'

export default class LegService {
    public journeyRef: string;
    public ptMode: PublicTransportMode;
    public agencyID: string;
    public serviceLineNumber: string | null

    constructor(journeyRef: string, ptMode: PublicTransportMode, agencyID: string) {
        this.journeyRef = journeyRef;
        this.ptMode = ptMode;
        this.agencyID = agencyID;
        this.serviceLineNumber = null;
    }

    public static initFromTripLeg(tripLegNode: Node): LegService | null {
        const serviceNode = XpathOJP.queryNode('ojp:Service', tripLegNode)
        if (serviceNode === null) {
            return null;
        }

        const journeyRef = XpathOJP.queryText('ojp:JourneyRef', serviceNode);
        const ptMode = PublicTransportMode.initFromServiceNode(serviceNode)
        
        const ojpAgencyId = XpathOJP.queryText('ojp:OperatorRef', serviceNode);
        const agencyID = ojpAgencyId?.replace('ojp:', '');

        if (!(journeyRef && ptMode && agencyID)) {
            return null
        }

        const legService = new LegService(journeyRef, ptMode, agencyID);
        
        legService.serviceLineNumber = XpathOJP.queryText('ojp:PublishedLineName/ojp:Text', serviceNode);

        return legService
    }
}