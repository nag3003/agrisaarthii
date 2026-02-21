export class LocationService {
    static async getCurrentLocation(): Promise<{ lat: number, lon: number } | null> {
        if (!navigator.geolocation) {
            console.warn("Geolocation is not supported by this browser.");
            return null;
        }

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                    });
                },
                (error) => {
                    console.error("Error getting web location:", error);
                    resolve(null);
                }
            );
        });
    }

    static async getReverseGeocode(lat: number, lon: number): Promise<{ city: string | null, district: string | null, state: string | null }> {
        // Web reverse geocoding often requires an external API key (Google Maps, OpenStreetMap)
        // expo-location's reverseGeocodeAsync might work on web if configured, but to stay safe and avoid key issues:
        // We will return null or a placeholder for now, or use a simple free fetch if critical.
        // For debugging blank page, returning null is safest.
        return { city: null, district: null, state: null };
    }
}
