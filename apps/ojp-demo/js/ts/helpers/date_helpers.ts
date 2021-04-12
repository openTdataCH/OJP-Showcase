export default class Date_Helpers {
    static formatDateYMDHIS(d: Date) {
        const date_parts = [
            d.getFullYear(),
            '-',
            ('00' + (d.getMonth() + 1)).slice(-2),
            '-',
            ('00' + d.getDate()).slice(-2),
            ' ',
            ('00' + d.getHours()).slice(-2),
            ':',
            ('00' + d.getMinutes()).slice(-2),
            ':',
            ('00' + d.getSeconds()).slice(-2)
        ];

        return date_parts.join('');
    }

    static formatTimeWithMiliseconds(d: Date) {
        const date_parts = [
            ('00' + d.getHours()).slice(-2),
            ':',
            ('00' + d.getMinutes()).slice(-2),
            ':',
            ('00' + d.getSeconds()).slice(-2),
            '.',
            (d.getMilliseconds() + '000').slice(0, 3),
        ];

        return date_parts.join('');
    }

    static setHHMMToDate(d: Date, hhmm: string) {
        const time_parts = hhmm.split(':');
        const time_hours = parseInt(time_parts[0]);
        const time_minutes = parseInt(time_parts[1]);
        
        const new_date = new Date(d.getTime());
        new_date.setHours(time_hours, time_minutes, 0, 0);
        
        return new_date;
    }
}