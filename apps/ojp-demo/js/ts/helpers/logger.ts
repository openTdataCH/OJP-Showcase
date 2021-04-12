import Dev_Helpers from "./dev_helpers";
import Date_Helpers from "./date_helpers";

export default class Logger {
    public static logMessage(section: string, message: string) {
        if (!Dev_Helpers.isDEV()) {
            return;
        }

        const now = new Date();
        const nowS = Date_Helpers.formatTimeWithMiliseconds(now);

        console.log('[LOG ' + nowS + '] - ' + section + ' - ' + message);
    }
}