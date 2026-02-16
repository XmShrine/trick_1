import { getLocalMeters, localMetersToLatLon, distance, vecAdd, vecSub, closestPointOnSegment } from './utils.js';

export class MapManager {
    constructor(originLat, originLon) {
        this.originLat = originLat;
        this.originLon = originLon;

        this.nodes = new Map();
        this.ways = [];
        this.buildings = [];
        this.water = [];
        this.environment = [];
        this.intersections = [];
        this.trafficLights = [];

        this.fetchRadius = 600;
        this.isFetching = false;
        this.processedWayIds = new Set();
        this.processedIntersectionIds = new Set(); // Track processed intersections

        // Dynamic loading state
        this.lastFetchX = 0;
        this.lastFetchY = 0;
        this.fetchThreshold = 250; // Fetch new data when player moves 250m from last fetch center
    }

    reset(newLat, newLon) {
        this.originLat = newLat;
        this.originLon = newLon;

        this.nodes.clear();
        this.ways = [];
        this.buildings = [];
        this.water = [];
        this.environment = [];
        this.intersections = [];
        this.trafficLights = [];
        this.processedWayIds.clear();
        this.processedIntersectionIds.clear();
        this.isFetching = false;
        this.lastFetchX = 0;
        this.lastFetchY = 0;
    }

    // Check if player has moved far enough to need new data
    // Includes predictive loading based on velocity
    shouldFetchMore(carX, carY, speed = 0, angle = 0) {
        if (this.isFetching) return false;

        // Current distance
        const dx = carX - this.lastFetchX;
        const dy = carY - this.lastFetchY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Predictive: Look ahead 10 seconds
        const lookAheadTime = 10;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        const predX = carX + vx * lookAheadTime;
        const predY = carY + vy * lookAheadTime;

        const distPred = Math.sqrt((predX - this.lastFetchX) ** 2 + (predY - this.lastFetchY) ** 2);

        // Fetch if current position OR predicted position is far from center
        return dist > this.fetchThreshold || distPred > this.fetchThreshold;
    }

    // Fetch area around a world position (in local meters)
    async fetchAroundPlayer(carX, carY) {
        // Convert local meters back to lat/lon
        const latLon = localMetersToLatLon(carX, carY, this.originLat, this.originLon);
        this.lastFetchX = carX;
        this.lastFetchY = carY;
        await this.fetchArea(latLon.lat, latLon.lon);
    }

    async fetchArea(lat, lon) {
        if (this.isFetching) return;
        console.log(`Fetching map data around ${lat.toFixed(5)}, ${lon.toFixed(5)}...`);
        this.isFetching = true;

        const r = this.fetchRadius;
        const query = `[out:json][timeout:15];(way["highway"]["highway"!~"footway|steps|path|pedestrian|cycleway"](around:${r},${lat},${lon});way["building"](around:${r},${lat},${lon});way["natural"="water"](around:${r},${lat},${lon});way["waterway"](around:${r},${lat},${lon});way["landuse"="grass"](around:${r},${lat},${lon});way["leisure"="park"](around:${r},${lat},${lon}););out body;>;out skel qt;`;

        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`Overpass API Error: ${response.status}`);
            const data = await response.json();
            this.processData(data);
            console.log(`Map: ${this.ways.length} roads, ${this.buildings.length} buildings, ${this.water.length} water, ${this.environment.length} env`);
        } catch (e) {
            clearTimeout(timeoutId);
            console.error("Map fetch failed:", e.name === 'AbortError' ? 'Request timed out' : e);
        } finally {
            this.isFetching = false;
        }
    }

    processData(data) {
        // First pass: save nodes
        data.elements.forEach(el => {
            if (el.type === 'node') {
                const m = getLocalMeters(el.lat, el.lon, this.originLat, this.originLon);
                if (!this.nodes.has(el.id)) {
                    this.nodes.set(el.id, { x: m.x, y: m.y, id: el.id, connectedWays: 0 });
                }
            }
        });

        // Second pass: classify ways (additive — never duplicates)
        data.elements.forEach(el => {
            if (el.type === 'way' && !this.processedWayIds.has(el.id)) {
                const validNodes = el.nodes.filter(nid => this.nodes.has(nid));
                if (validNodes.length < 2) return;

                const way = { id: el.id, nodeIds: el.nodes, tags: el.tags || {} };
                this.processedWayIds.add(el.id);

                if (way.tags.building) {
                    this.buildings.push(way);
                } else if (way.tags.natural === 'water' || way.tags.waterway) {
                    this.water.push(way);
                } else if (way.tags.landuse === 'grass' || way.tags.leisure === 'park') {
                    this.environment.push(way);
                } else if (way.tags.highway) {
                    this.ways.push(way);

                    // Height calculation for ramps and bridges
                    const layer = way.tags.layer ? parseInt(way.tags.layer) : 0;
                    const isBridge = way.tags.bridge === 'yes';
                    let targetH = 0.2;
                    if (layer > 0) targetH = layer * 6.0;
                    else if (isBridge) targetH = 6.0;
                    else if (layer < 0) targetH = -5.0;

                    el.nodes.forEach(nid => {
                        const n = this.nodes.get(nid);
                        if (n) {
                            n.connectedWays++;
                            if (!n.assignedHeights) n.assignedHeights = [];
                            n.assignedHeights.push(targetH);
                        }
                    });
                }
            }
        });

        // Set final node height (minimum of all assigned heights to create ramps at junctions)
        this.nodes.forEach(n => {
            if (n.assignedHeights && n.assignedHeights.length > 0) {
                n.height = Math.min(...n.assignedHeights);
            } else {
                n.height = 0.2;
            }
        });

        this.detectIntersections();
    }

    // Additive intersection detection — only processes new intersections
    detectIntersections() {
        this.nodes.forEach(node => {
            if (node.connectedWays >= 2 && !this.processedIntersectionIds.has(node.id)) {
                this.processedIntersectionIds.add(node.id);
                this.intersections.push(node);
                if (Math.random() > 0.3) {
                    node.trafficLight = {
                        state: Math.random() > 0.5 ? 'red' : 'green',
                        timer: Math.random() * 5000
                    };
                    this.trafficLights.push(node);
                }
            }
        });
    }

    updateTrafficLights(dt) {
        this.trafficLights.forEach(node => {
            node.trafficLight.timer -= dt;
            if (node.trafficLight.timer <= 0) {
                node.trafficLight.state = node.trafficLight.state === 'red' ? 'green' : 'red';
                node.trafficLight.timer = 2000 + Math.random() * 3000;
            }
        });
    }

    findNearestRoadPoint(p) {
        let minDist = Infinity;
        let bestPoint = p;
        let bestWay = null;
        let bestSegment = null;

        for (const way of this.ways) {
            for (let i = 0; i < way.nodeIds.length - 1; i++) {
                const n1 = this.nodes.get(way.nodeIds[i]);
                const n2 = this.nodes.get(way.nodeIds[i + 1]);
                if (!n1 || !n2) continue;

                const minX = Math.min(n1.x, n2.x) - 20;
                const maxX = Math.max(n1.x, n2.x) + 20;
                const minY = Math.min(n1.y, n2.y) - 20;
                const maxY = Math.max(n1.y, n2.y) + 20;
                if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) continue;

                const proj = closestPointOnSegment(p, n1, n2);
                const d = distance(p, proj);
                if (d < minDist) {
                    minDist = d;
                    bestPoint = proj;
                    bestWay = way;
                    bestSegment = { a: n1, b: n2, dir: vecSub(n2, n1) };
                }
            }
        }
        return { point: bestPoint, dist: minDist, way: bestWay, segment: bestSegment };
    }
}
