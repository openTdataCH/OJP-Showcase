export class GeoHelpers {
    public static lngLat2toWebMercator(lon: number, lat: number): { x: number; y: number } {
        const R = 6378137;
    
        const lambda = (lon * Math.PI) / 180;
        const phi = (lat * Math.PI) / 180;
    
        const x = R * lambda;
        const y = R * Math.log(Math.tan(Math.PI / 4 + phi / 2));
    
        return { x, y };
    }

    public static haversineDistance(lon1: number, lat1: number, lon2: number, lat2: number): number {
        const R = 6371000; // Earth's radius in meters
    
        // Convert degrees to radians
        const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
    
        const φ1 = toRadians(lat1);
        const φ2 = toRadians(lat2);
        const Δφ = toRadians(lat2 - lat1);
        const Δλ = toRadians(lon2 - lon1);
    
        // Haversine formula
        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
        return R * c; // Distance in meters
    }
}

