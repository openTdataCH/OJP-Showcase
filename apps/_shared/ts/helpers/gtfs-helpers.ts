export class GTFS_Helpers {
  public static convertToSloid(s: string): string {
    const isAlreadySloid = s.includes(':sloid:');
    if (isAlreadySloid) {
      return s;
    }

    if (s.startsWith('85')) {
      // strip from 3rd character on
      const sloidLocation = s.substring(2)
        // strip any leading zeros
        .replace(/^0*/, '');
      
      const sloid = 'ch:1:sloid:' + sloidLocation;
      
      return sloid;
    }

    return s;
  }

  public static sloid2didok7(stopId: string): string {
    const defaultId = 'INVALID_ID';

    const stopIdF = stopId.toLowerCase();
    const stopIdParts = stopIdF.split(':');

    const isScheduledStopPoint = stopIdF.indexOf(':scheduledstoppoint:') !== -1;
    if (isScheduledStopPoint) {
      const isCH = stopIdParts[0] === 'ch' && stopIdParts[1] === '1';
      if (!isCH) {
        console.error('sloid2didok7.scheduledstoppoint: unknown prefix for:' + stopId);
        debugger;
        return defaultId;
      }

      const scheduledStopPointParts = stopIdF.split(':scheduledstoppoint:');
      const didokRef = scheduledStopPointParts[1].slice(0, 7);

      return didokRef;
    }

    const isSLOID = stopIdF.indexOf(':sloid:') !== -1;
    if (isSLOID) {
      const isCH = stopIdParts[0] === 'ch' && stopIdParts[1] === '1';
      if (!isCH) {
        console.error('sloid2didok7.sloid: unknown prefix for:' + stopId);
        debugger;
        return defaultId;
      }

      const prefix = '85';
      const stopIdRef = stopIdParts[3].padStart(5, '0');

      const didokRef = prefix + stopIdRef;
      return didokRef;
    }

    const didokRef = stopIdParts[0];
    if (didokRef.length === 7) {
      return didokRef;
    }
    
    console.error('sloid2didok7: unhandled case for:' + stopId);
    debugger;
    return defaultId;
  }
}
