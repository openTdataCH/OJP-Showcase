import  { Duration } from '../models/duration'

export default class Date_Helpers {
    public static formatDuration(durationS: string): Duration {
        // PT4H19M
        durationS = durationS.replace('PT', '');

        let hours = 0
        const hoursMatches = durationS.match(/([0-9]+?)H/);
        if (hoursMatches) {
            hours = parseInt(hoursMatches[1])
        }

        let minutes = 0
        const minutesMatches = durationS.match(/([0-9]+?)M/);
        if (minutesMatches) {
            minutes = parseInt(minutesMatches[1])
        }

        const duration = <Duration>{
            hours: hours,
            minutes: minutes
        }

        return duration
    }
}

