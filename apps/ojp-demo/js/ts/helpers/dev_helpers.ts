export default class Dev_Helpers {
    public static isDEV(): boolean {
        const is_dev = location.hostname === 'localhost';
        return is_dev;
    }
}