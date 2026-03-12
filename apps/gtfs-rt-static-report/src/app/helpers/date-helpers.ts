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

  public static isSameDay(date: Date, anotherDate: Date = new Date()) {
    const isSameMonth = DateHelpers.isSameMonth(date, anotherDate);
    if (isSameMonth) {
      const dateADay = date.getDate();
      const dateBDay = anotherDate.getDate();

      return dateADay === dateBDay;
    } else {
      return false;
    }
  }

  public static formatDate(date: Date = new Date()): string {
    const yyyy = date.getFullYear();

    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');

    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');

    const result = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;

    return result;
  }
}
