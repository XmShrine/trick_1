import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class Renderer {
    constructor(canvas, width, height) {
        this.canvas = canvas;
        this.width = width;
        this.height = height;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);
        this.scene.fog = new THREE.FogExp2(0x111111, 0.003);

        // Camera
        this.fov = 60;
        this.camera = new THREE.PerspectiveCamera(this.fov, width / height, 0.1, 5000);
        this.camera.position.set(0, 50, 50);

        // WebGL
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Lights
        const ambientLight = new THREE.AmbientLight(0x404040, 3);
        this.scene.add(ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xffffff, 2);
        this.sunLight.position.set(50, 200, 50);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 1000;
        this.sunLight.shadow.bias = -0.0005;
        const d = 150;
        this.sunLight.shadow.camera.left = -d;
        this.sunLight.shadow.camera.right = d;
        this.sunLight.shadow.camera.top = d;
        this.sunLight.shadow.camera.bottom = -d;
        this.scene.add(this.sunLight);

        // Groups
        this.roadGroup = new THREE.Group();
        this.scene.add(this.roadGroup);

        this.trafficLightGroup = new THREE.Group();
        this.scene.add(this.trafficLightGroup);

        this.buildingGroup = new THREE.Group();
        this.scene.add(this.buildingGroup);

        this.waterGroup = new THREE.Group();
        this.scene.add(this.waterGroup);

        this.envGroup = new THREE.Group();
        this.scene.add(this.envGroup);

        this.textGroup = new THREE.Group();
        this.scene.add(this.textGroup);

        this.carMesh = this.createCarMesh();
        this.scene.add(this.carMesh);

        // Particles
        this.particles = [];
        this.particleGroup = new THREE.Group();
        this.scene.add(this.particleGroup);

        // Floor (Bedrock)
        const floorGeo = new THREE.PlaneGeometry(20000, 20000);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x050505, // Darker
            roughness: 1.0,
            metalness: 0.0
        });
        this.floor = new THREE.Mesh(floorGeo, floorMat);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.position.y = -2.0; // Move well below everything to avoid z-fighting
        this.floor.receiveShadow = true;
        this.scene.add(this.floor);

        // Camera Logic
        this.cameraMode = 'chase';
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.enabled = false;

        // Tracking sets
        this.generatedWays = new Set();
        this.generatedLights = new Set();
        this.generatedBuildings = new Set();
        this.generatedWater = new Set();
        this.generatedEnv = new Set();
        this.generatedText = new Set();
    }

    createCarMesh() {
        const group = new THREE.Group();
        // Smaller Car (More realistic scale, ~1.8m width)
        const bodyGeo = new THREE.BoxGeometry(1.8, 0.9, 4.2);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x00ffcc,
            metalness: 0.9,
            roughness: 0.1,
            emissive: 0x004433,
            emissiveIntensity: 0.2
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.7;
        body.castShadow = true;
        group.add(body);

        const roofGeo = new THREE.BoxGeometry(1.5, 0.55, 2.2);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 1.0, roughness: 0.2 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 1.45;
        roof.position.z = -0.5;
        roof.castShadow = true;
        group.add(roof);

        const headLight = new THREE.SpotLight(0xffffff, 20, 80, 0.6, 0.5, 1);
        headLight.position.set(0, 0.9, 2.2);
        headLight.target.position.set(0, 0, 20);
        group.add(headLight);
        group.add(headLight.target);

        const glowGeo = new THREE.PlaneGeometry(0.4, 0.15);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xccffff, side: THREE.DoubleSide });
        const lGlow = new THREE.Mesh(glowGeo, glowMat);
        lGlow.position.set(-0.6, 0.8, 2.11);
        group.add(lGlow);
        const rGlow = new THREE.Mesh(glowGeo, glowMat);
        rGlow.position.set(0.6, 0.8, 2.11);
        group.add(rGlow);

        return group;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    createTextSprite(message) {
        const fontface = "system-ui, 'Microsoft YaHei', 'PingFang SC', sans-serif";
        const fontsize = 40;

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = `bold ${fontsize}px ${fontface}`;

        const metrics = context.measureText(message);
        const textWidth = metrics.width;

        canvas.width = textWidth + 20;
        canvas.height = fontsize * 1.4 + 10;

        context.font = `bold ${fontsize}px ${fontface}`;
        context.fillStyle = 'rgba(0, 0, 0, 0.6)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = 'rgba(255, 255, 255, 1.0)';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(message, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;

        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.renderOrder = 999;

        const scale = 0.05;
        sprite.scale.set(canvas.width * scale, canvas.height * scale, 1);
        return sprite;
    }

    // Build road with Miter Joints + Optional Thickness (Side Skirts)
    buildRoadMesh(points, halfWidth, thickness = 0) {
        if (points.length < 2) return null;

        const up = new THREE.Vector3(0, 1, 0);
        const leftVerts = [];
        const rightVerts = [];

        for (let i = 0; i < points.length; i++) {
            let normal;

            if (i === 0) {
                const dir = new THREE.Vector3().subVectors(points[1], points[0]).normalize();
                normal = new THREE.Vector3().crossVectors(dir, up).normalize();
            } else if (i === points.length - 1) {
                const dir = new THREE.Vector3().subVectors(points[i], points[i - 1]).normalize();
                normal = new THREE.Vector3().crossVectors(dir, up).normalize();
            } else {
                const dir1 = new THREE.Vector3().subVectors(points[i], points[i - 1]).normalize();
                const dir2 = new THREE.Vector3().subVectors(points[i + 1], points[i]).normalize();
                const n1 = new THREE.Vector3().crossVectors(dir1, up).normalize();
                const n2 = new THREE.Vector3().crossVectors(dir2, up).normalize();
                normal = new THREE.Vector3().addVectors(n1, n2).normalize();

                const dot = n1.dot(normal);
                if (dot > 0.1) {
                    const miterScale = Math.min(1 / dot, 2.5);
                    normal.multiplyScalar(miterScale);
                }
            }

            leftVerts.push(new THREE.Vector3().copy(points[i]).addScaledVector(normal, halfWidth));
            rightVerts.push(new THREE.Vector3().copy(points[i]).addScaledVector(normal, -halfWidth));
        }

        const vertices = [];

        // Top Surface
        for (let i = 0; i < points.length - 1; i++) {
            const l1 = leftVerts[i], r1 = rightVerts[i];
            const l2 = leftVerts[i + 1], r2 = rightVerts[i + 1];

            vertices.push(l1.x, l1.y, l1.z, r1.x, r1.y, r1.z, l2.x, l2.y, l2.z);
            vertices.push(r1.x, r1.y, r1.z, r2.x, r2.y, r2.z, l2.x, l2.y, l2.z);
        }

        // Side Skirts (Thickness)
        if (thickness > 0) {
            for (let i = 0; i < points.length - 1; i++) {
                const l1 = leftVerts[i];
                const l2 = leftVerts[i + 1];
                const r1 = rightVerts[i];
                const r2 = rightVerts[i + 1];

                const l1b = new THREE.Vector3(l1.x, l1.y - thickness, l1.z);
                const l2b = new THREE.Vector3(l2.x, l2.y - thickness, l2.z);
                const r1b = new THREE.Vector3(r1.x, r1.y - thickness, r1.z);
                const r2b = new THREE.Vector3(r2.x, r2.y - thickness, r2.z);

                // Left Wall
                vertices.push(l1.x, l1.y, l1.z, l2.x, l2.y, l2.z, l1b.x, l1b.y, l1b.z);
                vertices.push(l2.x, l2.y, l2.z, l2b.x, l2b.y, l2b.z, l1b.x, l1b.y, l1b.z);

                // Right Wall
                vertices.push(r2.x, r2.y, r2.z, r1.x, r1.y, r1.z, r2b.x, r2b.y, r2b.z);
                vertices.push(r1.x, r1.y, r1.z, r1b.x, r1b.y, r1b.z, r2b.x, r2b.y, r2b.z);
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.computeVertexNormals();
        return geometry;
    }

    spawnParticle(pos, speed) {
        if (speed < 2) return;
        const count = speed > 20 ? 2 : 1; // More particles at high speed

        for (let i = 0; i < count; i++) {
            const size = 0.3 + Math.random() * 0.4;
            const geo = new THREE.PlaneGeometry(size, size);
            const mat = new THREE.MeshBasicMaterial({
                color: 0x888888,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            });
            const p = new THREE.Mesh(geo, mat);

            // Random offset around rear of car
            const offset = new THREE.Vector3((Math.random() - 0.5) * 1.5, 0.2, (Math.random() - 0.5) * 1.5 + 2.0);
            p.position.copy(pos).add(offset);
            p.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

            this.particleGroup.add(p);
            this.particles.push({ mesh: p, life: 1.0, vel: new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.5 + Math.random(), (Math.random() - 0.5) * 0.5) });
        }
    }

    updateParticles(dt) {
        const dtSec = dt / 1000;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dtSec * 1.5; // Fade out speed
            p.mesh.position.addScaledVector(p.vel, dtSec);
            p.mesh.rotation.x += dtSec;
            p.mesh.material.opacity = p.life * 0.6;

            if (p.life <= 0) {
                this.particleGroup.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    updateMap(mapManager) {
        const roadWidth = 8;
        const halfWidth = roadWidth / 2;

        // 1. Roads (Top priority layer)
        mapManager.ways.forEach(way => {
            if (this.generatedWays.has(way.id)) return;
            this.generatedWays.add(way.id);
            if (way.nodeIds.length < 2) return;

            const layer = way.tags.layer ? parseInt(way.tags.layer) : 0;
            const isBridge = way.tags && way.tags.bridge === 'yes';

            // Auto-detect overpass heights
            let roadHeight = 0.2;
            if (layer > 0) roadHeight = layer * 6.0;
            else if (isBridge) roadHeight = 6.0; // Force bridges to be high enough to clear water/roads
            else if (layer < 0) roadHeight = -5.0; // Tunnels (hide them or put below)

            const thickness = (layer > 0 || isBridge) ? 1.5 : 0;

            const points = [];
            for (let nid of way.nodeIds) {
                const node = mapManager.nodes.get(nid);
                if (node) points.push(new THREE.Vector3(node.x, node.height, -node.y));
            }
            if (points.length < 2) return;

            const geometry = this.buildRoadMesh(points, halfWidth, thickness);
            if (!geometry) return;

            const material = new THREE.MeshStandardMaterial({
                color: isBridge ? 0x666666 : 0x333333,
                roughness: 0.9,
                metalness: 0.1,
                side: THREE.DoubleSide
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.receiveShadow = true;
            mesh.castShadow = isBridge;
            this.roadGroup.add(mesh);

            // Center line marking
            const lineGeo = new THREE.BufferGeometry().setFromPoints(
                points.map(p => new THREE.Vector3(p.x, roadHeight + 0.03, p.z))
            );
            const lineMat = new THREE.LineDashedMaterial({
                color: 0xffffff,
                dashSize: 2,
                gapSize: 2,
                linewidth: 1
            });
            const line = new THREE.Line(lineGeo, lineMat);
            line.computeLineDistances();
            this.roadGroup.add(line);
        });

        // 2. Road Name Sprites
        mapManager.ways.forEach(way => {
            if (this.generatedText.has(way.id)) return;
            if (!way.tags || !way.tags.name) return;

            const points = [];
            for (let nid of way.nodeIds) {
                const node = mapManager.nodes.get(nid);
                if (node) points.push(new THREE.Vector3(node.x, 0.2, -node.y));
            }
            if (points.length < 2) return;

            this.generatedText.add(way.id);
            const midIdx = Math.floor(points.length / 2);
            const midPt = points[midIdx];

            const sprite = this.createTextSprite(way.tags.name);
            sprite.position.copy(midPt);
            sprite.position.y = 8.0;
            this.textGroup.add(sprite);
        });

        // 3. Buildings
        mapManager.buildings.forEach(way => {
            if (this.generatedBuildings.has(way.id)) return;
            this.generatedBuildings.add(way.id);
            if (way.nodeIds.length < 3) return;

            const shape = new THREE.Shape();
            const firstNode = mapManager.nodes.get(way.nodeIds[0]);
            if (!firstNode) return;

            shape.moveTo(firstNode.x, firstNode.y);
            for (let i = 1; i < way.nodeIds.length; i++) {
                const n = mapManager.nodes.get(way.nodeIds[i]);
                if (n) shape.lineTo(n.x, n.y);
            }

            const levels = way.tags['building:levels'] ? parseInt(way.tags['building:levels']) : (Math.random() < 0.2 ? 8 : 3);
            const height = levels * 4;

            const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
            const material = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.8, metalness: 0.2 });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.y = 0;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.buildingGroup.add(mesh);
        });

        // 4. Water (Above grass, below roads)
        mapManager.water.forEach(way => {
            if (this.generatedWater.has(way.id)) return;
            this.generatedWater.add(way.id);
            if (way.nodeIds.length < 3) return;

            const shape = new THREE.Shape();
            const firstNode = mapManager.nodes.get(way.nodeIds[0]);
            if (!firstNode) return;

            shape.moveTo(firstNode.x, firstNode.y);
            for (let i = 1; i < way.nodeIds.length; i++) {
                const n = mapManager.nodes.get(way.nodeIds[i]);
                if (n) shape.lineTo(n.x, n.y);
            }

            const geometry = new THREE.ShapeGeometry(shape);
            const material = new THREE.MeshStandardMaterial({
                color: 0x0055cc,
                roughness: 0.1,
                metalness: 0.8,
                emissive: 0x001144,
                transparent: true,
                opacity: 0.9
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.y = -1.0;
            this.waterGroup.add(mesh);
        });

        // 5. Environment (Grass - Bottom layer)
        mapManager.environment.forEach(way => {
            if (this.generatedEnv.has(way.id)) return;
            this.generatedEnv.add(way.id);
            if (way.nodeIds.length < 3) return;

            const shape = new THREE.Shape();
            const firstNode = mapManager.nodes.get(way.nodeIds[0]);
            if (!firstNode) return;

            shape.moveTo(firstNode.x, firstNode.y);
            for (let i = 1; i < way.nodeIds.length; i++) {
                const n = mapManager.nodes.get(way.nodeIds[i]);
                if (n) shape.lineTo(n.x, n.y);
            }

            const geometry = new THREE.ShapeGeometry(shape);
            const material = new THREE.MeshStandardMaterial({ color: 0x225522, roughness: 1.0, metalness: 0.0 });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.y = -0.5; // Lowest
            this.envGroup.add(mesh);
        });

        // 6. Traffic Lights
        mapManager.trafficLights.forEach(node => {
            if (this.generatedLights.has(node.id)) {
                const mesh = this.trafficLightGroup.getObjectByName(`light_${node.id}`);
                if (mesh) {
                    const color = node.trafficLight.state === 'red' ? 0xff0000 : 0x00ff00;
                    mesh.material.color.setHex(color);
                    mesh.material.emissive.setHex(color);
                }
                return;
            }
            this.generatedLights.add(node.id);

            const poleHeight = 6;
            const group = new THREE.Group();
            group.position.set(node.x, 0, -node.y);

            const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, poleHeight);
            const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
            const pole = new THREE.Mesh(poleGeo, poleMat);
            pole.position.y = poleHeight / 2;
            group.add(pole);

            const lightGeo = new THREE.BoxGeometry(0.8, 1.5, 0.8);
            const lightMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
            const lightBox = new THREE.Mesh(lightGeo, lightMat);
            lightBox.position.y = poleHeight;
            group.add(lightBox);

            const bulbGeo = new THREE.SphereGeometry(0.4);
            const bulbMat = new THREE.MeshStandardMaterial({
                color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 3
            });
            const bulb = new THREE.Mesh(bulbGeo, bulbMat);
            bulb.position.y = poleHeight;
            bulb.position.z = 0.45;
            bulb.name = `light_${node.id}`;
            group.add(bulb);

            this.trafficLightGroup.add(group);
        });
    }

    render(mapManager, physics, dt) {
        const car = physics.car;
        const speed = Math.abs(car.speed);

        // Particles
        this.spawnParticle(new THREE.Vector3(car.x, 0.2, -car.y), speed);
        this.updateParticles(dt);

        this.carMesh.position.set(car.x, car.z, -car.y);
        const lookTarget = new THREE.Vector3(
            car.x + Math.cos(car.angle) * 10,
            car.z,
            -car.y - Math.sin(car.angle) * 10
        );
        this.carMesh.lookAt(lookTarget);

        if (this.cameraMode === 'chase') {
            this.controls.enabled = false;
            const dist = 25;
            const height = 12;
            const smooth = 0.08;

            const idealX = car.x - Math.cos(car.angle) * dist;
            const idealY = car.z + height;
            const idealZ = -car.y + Math.sin(car.angle) * dist;

            const targetPos = new THREE.Vector3(idealX, idealY, idealZ);
            this.camera.position.lerp(targetPos, smooth);

            // Dynamic FOV (Speed Effect)
            const targetFOV = 60 + speed * 1.5; // Wider FOV at high speed
            this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, 0.05);
            this.camera.updateProjectionMatrix();

            // Camera Shake (High Speed > 20 m/s)
            if (speed > 20) {
                const shakeIntensity = (speed - 20) * 0.005;
                this.camera.position.x += (Math.random() - 0.5) * shakeIntensity;
                this.camera.position.y += (Math.random() - 0.5) * shakeIntensity;
                this.camera.position.z += (Math.random() - 0.5) * shakeIntensity;
            }

            const lookPos = new THREE.Vector3(car.x, car.z + 1, -car.y);
            this.camera.lookAt(lookPos);
        } else {
            this.controls.enabled = true;
            this.controls.update();
        }

        this.sunLight.position.x = car.x + 50;
        this.sunLight.position.z = -car.y + 50;
        this.sunLight.target.position.set(car.x, 0, -car.y);

        this.renderer.render(this.scene, this.camera);
    }

    toggleCamera() {
        this.cameraMode = this.cameraMode === 'chase' ? 'free' : 'chase';
    }
}
