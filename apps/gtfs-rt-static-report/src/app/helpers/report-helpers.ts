
export const FilenameDateRegexp = /([0-9]{4})-([0-9]{2})-([0-9]{2})-([0-9]{4})/;

export class ReportHelpers {
  // templateURL example: '2026-03-10-1200'
  public static computeSnapshotURLFromTemplate(templateURL: string, gtfs_rt_filename: string) {
    let url = templateURL;

    const timeMatches = gtfs_rt_filename.match(FilenameDateRegexp);
    if (timeMatches) {
      url = url.replaceAll('[YYYY]', timeMatches[1]);
      url = url.replaceAll('[MM]', timeMatches[2]);
      url = url.replaceAll('[DD]', timeMatches[3]);
      url = url.replaceAll('[HHMM]', timeMatches[4]);
    } else {
      throw new Error('unexpected file matches: ' + gtfs_rt_filename);
    }

    return url;
  }

  // s = GTFS_RT-2026-03-13-1100.json
  public static convertGTFS_RT_FilenameToDate(s: string): Date {
    const timeMatches = s.match(FilenameDateRegexp);
    if (timeMatches === null) {
      return new Date();
    }

    const reportYearF = timeMatches[1];
    const reportMonthF = timeMatches[2];
    const reportDayF = timeMatches[3];
    const reportHrF = timeMatches[4].substring(0, 2);
    const reportMinF = timeMatches[4].substring(2, 4);

    const date = new Date(reportYearF + '-' + reportMonthF + '-' + reportDayF + ' ' + reportHrF + ':' + reportMinF + ':00');
    
    return date;
  }

  public static computeGTFS_RT_URL(gtfs_rt_filename: string | null) {
    if (gtfs_rt_filename === null) {
      return '';
    }

    // https://tools.odpch.ch/gtfs-rt-snapshot/2026/03/11/GTFS_RT-2026-03-11-1200.json
    // gtfs_rt_filename - GTFS_RT-2026-03-11-1200.json
    if (!gtfs_rt_filename.startsWith('GTFS_RT-')) {
      gtfs_rt_filename = 'GTFS_RT-' + gtfs_rt_filename;
    }
    if (!gtfs_rt_filename.endsWith('.json')) {
      gtfs_rt_filename = gtfs_rt_filename + '.json';
    }

    const templateURL = 'https://tools.odpch.ch/gtfs-rt-snapshot/[YYYY]/[MM]/[DD]/' + gtfs_rt_filename;
    const url = ReportHelpers.computeSnapshotURLFromTemplate(templateURL, gtfs_rt_filename);

    return url;
  }

  public static parseGTFS_feedVersionAsGTFS_Day(feedVersion: string): string {
    if (feedVersion.length !== 8) {
      throw new Error('Unexpected feedVersion: ' + feedVersion);
    }

    const gtfsDay = feedVersion.substring(0, 4) + '-' + feedVersion.substring(4, 6) + '-' + feedVersion.substring(6, 8);
    
    return gtfsDay;
  }
 }
