export default class DateHelpers {
    // 20211222 => 22.Dec.2021
    public static DateFromGTFSDay(dateS: string): Date {
        // dateS = '20211222';
        const dateYear = parseInt(dateS.substring(0, 4));
        const dateMonth = parseInt(dateS.substring(4, 6)) - 1;
        const dateDay = parseInt(dateS.substring(6, 8));
        
        const dateObj = new Date(dateYear, dateMonth, dateDay);

        return dateObj;
    }

    // From https://stackoverflow.com/a/15289883
    public static DaysDifference(date1: Date, date2: Date): number {
        const ms_per_day = 1000 * 60 * 60 * 24;

        const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
        const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());

        const days_no = Math.floor((utc2 - utc1) / ms_per_day);
        
        return days_no;
    }
}
