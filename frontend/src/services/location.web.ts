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
                },
                { timeout: 10000, enableHighAccuracy: false }
            );
        });
    }

    static async getReverseGeocode(lat: number, lon: number): Promise<{ city: string | null, district: string | null, state: string | null }> {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`;
            const res = await fetch(url, {
                headers: { 'User-Agent': 'agrisaarthi-app' },
            });

            if (!res.ok) {
                console.error('[Location] Nominatim error:', res.status);
                return { city: null, district: null, state: null };
            }

            const data = await res.json();
            const address = data.address || {};

            const district = address.county || address.district || address.city || address.town || null;
            const state = address.state || null;
            const city = address.city || address.town || address.village || null;

            console.log(`[Location] Reverse geocode: ${district}, ${state}`);
            return { city, district, state };
        } catch (err) {
            console.error('[Location] Reverse geocode failed:', err);
            return { city: null, district: null, state: null };
        }
    }
}
