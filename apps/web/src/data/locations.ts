import data from './locations.json';

export interface Location {
  city: string;
  state: string;
  stateAbbr: string;
  slug: string;
}

export const locations: Location[] = data.cities;

export function getLocation(slug: string): Location | undefined {
  return locations.find((l) => l.slug === slug);
}

/** Locations grouped by state, states sorted alphabetically. */
export function locationsByState(): { state: string; cities: Location[] }[] {
  const map = new Map<string, Location[]>();
  for (const loc of locations) {
    const arr = map.get(loc.state) || [];
    arr.push(loc);
    map.set(loc.state, arr);
  }
  return Array.from(map.entries())
    .map(([state, cities]) => ({ state, cities: cities.sort((a, b) => a.city.localeCompare(b.city)) }))
    .sort((a, b) => a.state.localeCompare(b.state));
}

/** A few other cities to cross-link from a location page (internal linking for SEO). */
export function nearbyLocations(current: Location, count = 6): Location[] {
  const sameState = locations.filter((l) => l.stateAbbr === current.stateAbbr && l.slug !== current.slug);
  const others = locations.filter((l) => l.stateAbbr !== current.stateAbbr);
  return [...sameState, ...others].slice(0, count);
}
