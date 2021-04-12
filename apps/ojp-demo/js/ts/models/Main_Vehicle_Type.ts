export default class Main_Vehicle_Type {
    static readonly Boat = new Main_Vehicle_Type("Boat")
    static readonly Bus = new Main_Vehicle_Type("Bus")
    static readonly CableCar = new Main_Vehicle_Type("CableCar")
    static readonly Chairlift = new Main_Vehicle_Type("Chairlift")
    static readonly CogWheelTrain = new Main_Vehicle_Type("CogWheelTrain")
    static readonly Elevator = new Main_Vehicle_Type("Elevator")
    static readonly Gondola = new Main_Vehicle_Type("Gondola")
    static readonly Metro = new Main_Vehicle_Type("Metro")
    static readonly Train = new Main_Vehicle_Type("Train")
    static readonly Tram = new Main_Vehicle_Type("Tram")
    
    public readonly key: string

    private constructor(key: string) {
        this.key = key
    }

    public static from_string(enum_s: string): Main_Vehicle_Type | null {
        enum_s = enum_s.toLowerCase();

        switch(enum_s) {
            case "aufzug":
                return Main_Vehicle_Type.Elevator;
            case "bus":
                return Main_Vehicle_Type.Bus;
            case "kabinenbahn":
                return Main_Vehicle_Type.CableCar;
            case "metro":
                return Main_Vehicle_Type.Metro;
            case "schiff":
                return Main_Vehicle_Type.Boat;
            case "seilbahn":
                return Main_Vehicle_Type.Gondola;
            case "sesselbahn":
                return Main_Vehicle_Type.Chairlift;
            case "tram":
                return Main_Vehicle_Type.Tram;
            case "zahnradbahn":
                return Main_Vehicle_Type.CogWheelTrain;
            case "zug":
                return Main_Vehicle_Type.Train;
        }

        return null;
    }
}