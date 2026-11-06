/**
 * Geodesic and Polygon helper utilities for RakForest GIS
 */

const EARTH_RADIUS_METERS = 6371008.8;

/**
 * Generates a geodesic circle polygon ([lng, lat][]) for a given center and radius in meters.
 * Used to render sensor_stations listening radius on MapLibre GL JS.
 */
export function createCirclePolygon(
  lng: number,
  lat: number,
  radiusMeters: number,
  steps = 72
): [number, number][] {
  const phi = (lat * Math.PI) / 180;
  const lambda = (lng * Math.PI) / 180;
  const delta = radiusMeters / EARTH_RADIUS_METERS;

  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const bearing = (i / steps) * Math.PI * 2;
    const sinPhi =
      Math.sin(phi) * Math.cos(delta) +
      Math.cos(phi) * Math.sin(delta) * Math.cos(bearing);
    const latRad = Math.asin(Math.max(-1, Math.min(1, sinPhi)));
    const lngRad =
      lambda +
      Math.atan2(
        Math.sin(bearing) * Math.sin(delta) * Math.cos(phi),
        Math.cos(delta) - Math.sin(phi) * Math.sin(latRad)
      );
    coords.push([(lngRad * 180) / Math.PI, (latRad * 180) / Math.PI]);
  }
  return coords;
}

/**
 * Calculates approximate polygon area in Thai Rai (1 Rai = 1,600 sq.m.)
 * from an array of [lng, lat] coordinates using spherical excess / shoelace projection.
 */
export function calculatePolygonAreaRai(coords: [number, number][]): number {
  if (!coords || coords.length < 3) return 0;
  const ring =
    coords[0][0] === coords[coords.length - 1][0] &&
    coords[0][1] === coords[coords.length - 1][1]
      ? coords
      : [...coords, coords[0]];

  let areaSqMeters = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[i + 1];
    const x1 = ((lng1 * Math.PI) / 180) * EARTH_RADIUS_METERS * Math.cos(((lat1 * Math.PI) / 180));
    const y1 = ((lat1 * Math.PI) / 180) * EARTH_RADIUS_METERS;
    const x2 = ((lng2 * Math.PI) / 180) * EARTH_RADIUS_METERS * Math.cos(((lat2 * Math.PI) / 180));
    const y2 = ((lat2 * Math.PI) / 180) * EARTH_RADIUS_METERS;
    areaSqMeters += x1 * y2 - x2 * y1;
  }

  const sqMeters = Math.abs(areaSqMeters) / 2;
  return Math.max(1, Math.round(sqMeters / 1600));
}

/**
 * Checks whether a point [lng, lat] lies inside a polygon [lng, lat][]
 */
export function isPointInPolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  if (!polygon || polygon.length < 3) return false;
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calculates distance in meters between two coordinates using Haversine formula
 */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
