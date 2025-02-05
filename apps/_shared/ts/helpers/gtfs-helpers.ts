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
}
