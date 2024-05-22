export class DateHelpers {
    public static computeMonthDaysNo(date: Date) {
        // dont mutate original data
        const currentDate = new Date(date.getTime());

        // set the current day to 1
        currentDate.setDate(1);
        // Add 1 month
        currentDate.setMonth(currentDate.getMonth() + 1);
        // Substract 1 day to get last day of given date
        currentDate.setDate(currentDate.getDate() - 1);

        return currentDate.getDate();
    }

    public static isSameMonth(date: Date, anotherDate: Date = new Date()) {
        const dateAYear = date.getFullYear();
        const dateAMonth = date.getMonth();
        
        const dateBYear = anotherDate.getFullYear();
        const dateBMonth = anotherDate.getMonth();

        return dateAYear === dateBYear && dateAMonth === dateBMonth;
    }
}