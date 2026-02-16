export const EARTH_RADIUS = 6378137;

// Simple Equirectangular approximation for local distances
export function getLocalMeters(lat, lon, originLat, originLon) {
    const R = 6378137;
    const latRad = lat * Math.PI / 180;
    const x = (lon - originLon) * (Math.PI / 180) * R * Math.cos(latRad);
    const y = (lat - originLat) * (Math.PI / 180) * R;
    return { x, y };
}

// Inverse: convert local meter offsets back to lat/lon
export function localMetersToLatLon(x, y, originLat, originLon) {
    const R = 6378137;
    const lat = originLat + (y / R) * (180 / Math.PI);
    const latRad = lat * Math.PI / 180;
    const lon = originLon + (x / (R * Math.cos(latRad))) * (180 / Math.PI);
    return { lat, lon };
}

export function distance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function angle(p1, p2) {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

export function vecAdd(v1, v2) { return { x: v1.x + v2.x, y: v1.y + v2.y }; }
export function vecSub(v1, v2) { return { x: v1.x - v2.x, y: v1.y - v2.y }; }
export function vecScale(v, s) { return { x: v.x * s, y: v.y * s }; }
export function vecLen(v) { return Math.sqrt(v.x * v.x + v.y * v.y); }
export function vecNormalize(v) {
    const l = vecLen(v);
    return l === 0 ? { x: 0, y: 0 } : { x: v.x / l, y: v.y / l };
}
export function vecDot(v1, v2) { return v1.x * v2.x + v1.y * v2.y; }

export function closestPointOnSegment(p, a, b) {
    const ap = vecSub(p, a);
    const ab = vecSub(b, a);
    const lenSq = ab.x * ab.x + ab.y * ab.y;
    if (lenSq === 0) return a;
    const t = Math.max(0, Math.min(1, vecDot(ap, ab) / lenSq));
    return vecAdd(a, vecScale(ab, t));
}
