import XpathOJP from '../../helpers/xpath-ojp'

export class Location {
    public name: string

    constructor(name: string) {
        this.name = name
    }

    public static initFromLocationNodeS(xpathExpression: string, contextNode: Node): Location | null {
        const node = XpathOJP.queryNode(xpathExpression, contextNode)
        if (node === null) {
            return null
        }

        return Location.initFromLocationNode(node)
    }

    public static initFromLocationNode(locationNode: Node): Location | null {
        const locationName = XpathOJP.queryText('ojp:LocationName/ojp:Text', locationNode);
        if (locationName === null) {
            return null
        }

        const longitudeS = XpathOJP.queryText('ojp:GeoPosition/siri:Longitude', locationNode);
        const latitudeS = XpathOJP.queryText('ojp:GeoPosition/siri:Latitude', locationNode);
        if (longitudeS && latitudeS) {
            const geoLocation = new GeoLocation(parseFloat(longitudeS), parseFloat(latitudeS), locationName)
            return geoLocation
        }

        const stopPointRef = XpathOJP.queryText('siri:StopPointRef', locationNode);
        if (stopPointRef) {
            const stopLocation = new StopLocation(stopPointRef, locationName)
            return stopLocation
        }

        return null
    }
}

class GeoLocation extends Location {
    private longitude: number
    private latitude: number

    constructor(longitude: number, latitude: number, name: string) {
        super(name)

        this.longitude = longitude
        this.latitude = latitude
    }
}

class StopLocation extends Location {
    private stopPointRef: string

    constructor(stopPointRef: string, name: string) {
        super(name)
        this.stopPointRef = stopPointRef
    }
} 