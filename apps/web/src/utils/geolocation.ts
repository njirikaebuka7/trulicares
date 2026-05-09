export interface GeoResult {
  address: string;
  zip: string;
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60000,
    });
  });
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeoResult> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
    { headers: { 'Accept-Language': 'en-US,en' } }
  );
  if (!res.ok) throw new Error('Reverse geocoding failed');
  const data = await res.json();

  const zip = (data.address?.postcode || '').replace(/\s/g, '').substring(0, 5);
  const city =
    data.address?.city ||
    data.address?.town ||
    data.address?.suburb ||
    data.address?.village ||
    '';
  const stateCode =
    data.address?.state_code ||
    (data.address?.state ? data.address.state.substring(0, 2).toUpperCase() : '');

  const parts = [city, stateCode, zip].filter(Boolean);
  const address = parts.join(city && stateCode ? ', ' : ' ').replace(/,\s*$/, '').trim();

  return { address: address || data.display_name || 'Current Location', zip };
}

export async function detectLocationWithZip(): Promise<GeoResult> {
  const position = await getCurrentPosition();
  return reverseGeocode(position.coords.latitude, position.coords.longitude);
}

export function extractZip(locationString: string): string {
  const match = locationString.match(/\b\d{5}\b/);
  return match ? match[0] : '';
}
