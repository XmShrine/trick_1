import * as THREE from 'three';
import { MapManager } from './map_manager.js';
import { PhysicsEngine } from './physics.js';
import { Renderer } from './renderer.js';
import { getLocalMeters, localMetersToLatLon } from './utils.js';

// --- Configuration ---
const START_LAT = 39.1365;  // 天津站
const START_LON = 117.2103;

// --- DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const minimapCanvas = document.getElementById('minimap');
minimapCanvas.addEventListener('click', () => {
    showMapPicker();
});
const mapPickerModal = document.getElementById('mapPickerModal');
const leafletMapDiv = document.getElementById('leafletMap');
const startGameBtn = document.getElementById('startGameBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const openMapBtn = document.getElementById('openMapBtn');
const locationInput = document.getElementById('locationInput');
const loading = document.getElementById('loading');
const speedEl = document.getElementById('speed');

// --- Modules ---
const mapManager = new MapManager(START_LAT, START_LON);
const physics = new PhysicsEngine();
const renderer = new Renderer(canvas, window.innerWidth, window.innerHeight);
const minimapCtx = minimapCanvas.getContext('2d');

// --- State ---
let lastTime = 0;
const keys = {};
let leafletMap = null;
let selectedLatLon = null;

// --- Minimap Logic ---
function updateMinimap() {
    const size = 300; // Canvas resolution (high dpi)
    minimapCanvas.width = size;
    minimapCanvas.height = size;

    // Clear
    minimapCtx.fillStyle = '#000000'; // Black background
    minimapCtx.fillRect(0, 0, size, size);

    // Transform: Center on Car, Scale Zoom
    const zoom = 0.5; // pixels per meter
    minimapCtx.save();
    minimapCtx.translate(size / 2, size / 2);
    minimapCtx.scale(zoom, zoom);

    // Rotate map so "North" is Up? Or Car Heading Up?
    // "N" label in UI implies North is Up.
    // Car moves in (x, y) space.
    // Canvas Y is down. Map Y is North.
    // So Map North = Canvas -Y (Up). 
    // We want to draw roads relative to car.
    // Car is at (cx, cy).
    // Road node is at (nx, ny).
    // Delta: dx = nx - cx, dy = ny - cy.
    // Screen X = dx. Screen Y = -dy.

    const cx = physics.car.x;
    const cy = physics.car.y;

    minimapCtx.strokeStyle = '#555';
    minimapCtx.lineWidth = 15; // Thick visible roads on minimap
    minimapCtx.lineCap = 'round';

    // Draw Roads (Optimization: Filter by distance? Or just draw all inside 300m?)
    mapManager.ways.forEach(way => {
        minimapCtx.beginPath();
        let first = true;
        for (let nid of way.nodeIds) {
            const node = mapManager.nodes.get(nid);
            if (node) {
                // Check dist roughly
                if (Math.abs(node.x - cx) < 400 && Math.abs(node.y - cy) < 400) {
                    const sx = (node.x - cx);
                    const sy = -(node.y - cy); // Flip Y
                    if (first) { minimapCtx.moveTo(sx, sy); first = false; }
                    else { minimapCtx.lineTo(sx, sy); }
                }
            }
        }
        minimapCtx.stroke();

        // Draw Name on Minimap (Simplified)
        if (mapManager.ways.length < 500 || zoom > 0.8) { // Only if not too busy
            if (way.tags && way.tags.name && way.nodeIds.length > 2) {
                const midId = way.nodeIds[Math.floor(way.nodeIds.length / 2)];
                const node = mapManager.nodes.get(midId);
                if (node && Math.abs(node.x - cx) < 200 && Math.abs(node.y - cy) < 200) {
                    minimapCtx.save();
                    minimapCtx.fillStyle = '#fff';
                    minimapCtx.font = '10px Arial';
                    minimapCtx.fillText(way.tags.name, node.x - cx, -(node.y - cy));
                    minimapCtx.restore();
                }
            }
        }
    });

    // Draw Car
    minimapCtx.fillStyle = '#00ffcc';
    minimapCtx.beginPath();
    minimapCtx.arc(0, 0, 8, 0, Math.PI * 2);
    minimapCtx.fill();

    // Direction Indicator
    minimapCtx.strokeStyle = '#fff';
    minimapCtx.lineWidth = 2;
    minimapCtx.beginPath();
    minimapCtx.moveTo(0, 0);
    // Car angle 0 = East (+x).
    // on Minimap, East is +x.
    // Car angle PI/2 = North (+y).
    // on Minimap, North is -y.
    // So angle -> (cos a, -sin a).
    minimapCtx.lineTo(Math.cos(physics.car.angle) * 15, -Math.sin(physics.car.angle) * 15);
    minimapCtx.stroke();

    minimapCtx.restore();
}

// --- Map Picker Logic ---
function initLeaflet() {
    if (leafletMap) return;
    leafletMap = L.map('leafletMap').setView([START_LAT, START_LON], 11);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(leafletMap);

    let marker = null;

    leafletMap.on('click', function (e) {
        selectedLatLon = e.latlng;
        if (marker) leafletMap.removeLayer(marker);
        marker = L.marker(selectedLatLon).addTo(leafletMap);
        startGameBtn.disabled = false;
        startGameBtn.textContent = `从此处开始 (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`;
    });
}

function showMapPicker() {
    mapPickerModal.classList.remove('hidden');
    mapPickerModal.style.display = 'flex';
    // Must resize Leaflet after container is visible
    setTimeout(() => {
        initLeaflet();
        leafletMap.invalidateSize();
    }, 100);
}

function hideMapPicker() {
    mapPickerModal.classList.add('hidden');
    setTimeout(() => {
        mapPickerModal.style.display = 'none';
    }, 300);
}

startGameBtn.addEventListener('click', async () => {
    if (selectedLatLon) {
        hideMapPicker();
        await changeLocation(selectedLatLon.lat, selectedLatLon.lng);
    }
});

closeModalBtn.addEventListener('click', hideMapPicker);
openMapBtn.addEventListener('click', showMapPicker);

// --- Location Change ---
async function changeLocation(lat, lon) {
    loading.style.display = 'block';
    loading.textContent = "正在前往...";

    try {
        mapManager.reset(lat, lon);
        physics.teleport(0, 0);

        // Clear ThreeJS Scene Parts
        renderer.roadGroup.clear();
        renderer.trafficLightGroup.clear();
        renderer.buildingGroup.clear();
        renderer.waterGroup.clear();
        renderer.envGroup.clear();
        renderer.textGroup.clear();
        renderer.generatedWays.clear();
        renderer.generatedBuildings.clear();
        renderer.generatedWater.clear();
        renderer.generatedEnv.clear();
        renderer.generatedLights.clear();
        renderer.generatedText.clear();

        await mapManager.fetchArea(lat, lon);
    } catch (err) {
        console.error("Critical error changing location:", err);
        alert("前往失败，请重试");
    } finally {
        loading.style.display = 'none';
        // Force focus back to canvas
        canvas.focus();
    }
}

// --- Search Input ---
locationInput.addEventListener('change', async (e) => {
    // Existing search logic
    const query = e.target.value;
    if (!query) return;
    loading.style.display = 'block';
    try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await resp.json();
        if (data && data.length > 0) {
            await changeLocation(parseFloat(data[0].lat), parseFloat(data[0].lon));
        } else {
            alert("未找到该地点");
        }
    } catch (e) { console.error(e); }
    loading.style.display = 'none';
});


// --- Tuning Panel ---
const steerSmoothInput = document.getElementById('steerSmooth');
const turnSpeedInput = document.getElementById('turnSpeed');
const frictionInput = document.getElementById('friction');

function updatePhysicsParams() {
    if (steerSmoothInput && turnSpeedInput && frictionInput) {
        physics.setParams({
            steeringSmoothing: parseFloat(steerSmoothInput.value),
            turnSpeed: parseFloat(turnSpeedInput.value),
            friction: parseFloat(frictionInput.value)
        });
    }
}
if (steerSmoothInput) steerSmoothInput.addEventListener('input', updatePhysicsParams);
if (turnSpeedInput) turnSpeedInput.addEventListener('input', updatePhysicsParams);
if (frictionInput) frictionInput.addEventListener('input', updatePhysicsParams);

// Init with default values from UI
setTimeout(updatePhysicsParams, 1000);


// --- Game Loop ---
window.addEventListener('resize', () => renderer.resize(window.innerWidth, window.innerHeight));

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyC') renderer.toggleCamera();
    if (e.code === 'KeysM') showMapPicker(); // Secret shortcut
});
window.addEventListener('keyup', (e) => keys[e.code] = false);

// Raycast Teleport
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
window.addEventListener('dblclick', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, renderer.camera);
    const intersects = raycaster.intersectObject(renderer.floor);
    if (intersects.length > 0) {
        physics.teleport(intersects[0].point.x, -intersects[0].point.z);
    }
});

async function init() {
    loading.style.display = 'block';
    await mapManager.fetchArea(START_LAT, START_LON);
    loading.style.display = 'none';
    requestAnimationFrame(loop);
}

function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    physics.handleInput(keys);
    physics.update(dt, mapManager);

    // Dynamic Map Loading
    // Dynamic Map Loading
    if (mapManager.shouldFetchMore(physics.car.x, physics.car.y, physics.car.speed, physics.car.angle)) {
        // Predict future position (5s ahead) to fetch AHEAD of the car
        const lookAheadTime = 5;
        const vx = Math.cos(physics.car.angle) * physics.car.speed;
        const vy = Math.sin(physics.car.angle) * physics.car.speed;
        const predX = physics.car.x + vx * lookAheadTime;
        const predY = physics.car.y + vy * lookAheadTime;

        // Fire and forget, centered on FUTURE position
        mapManager.fetchAroundPlayer(predX, predY);
    }

    renderer.updateMap(mapManager);
    renderer.render(mapManager, physics, dt);

    updateMinimap();

    // Speed Lines Effect
    const speedRatio = Math.max(0, (Math.abs(physics.car.speed) - 10) / 40);
    const speedLines = document.getElementById('speed-lines');
    if (speedLines) speedLines.style.opacity = Math.min(speedRatio, 0.8);

    speedEl.innerHTML = `${Math.abs(Math.round(physics.car.speed * 3.6))} <span class="unit">km/h</span>`;

    requestAnimationFrame(loop);
}

// Export for UI
window.getCarPosition = () => {
    if (!physics || !mapManager) return null;
    return localMetersToLatLon(physics.car.x, physics.car.y, mapManager.originLat, mapManager.originLon);
};

window.resetMap = async (lat, lon) => {
    mapManager.reset(lat, lon);

    physics.car.x = 0;
    physics.car.y = 0;
    physics.car.speed = 0;
    physics.car.angle = -Math.PI / 2;

    renderer.roadGroup.clear();
    renderer.buildingGroup.clear();
    renderer.waterGroup.clear();
    renderer.envGroup.clear();
    renderer.textGroup.clear();
    renderer.trafficLightGroup.clear();
    renderer.particleGroup.clear();

    renderer.generatedWays.clear();
    renderer.generatedBuildings.clear();
    renderer.generatedWater.clear();
    renderer.generatedEnv.clear();
    renderer.generatedText.clear();
    renderer.generatedLights.clear();

    await mapManager.fetchArea(lat, lon);
};

init();
