import { distance, vecSub, angle, vecScale, closestPointOnSegment } from './utils.js';

export class PhysicsEngine {
    constructor() {
        this.car = {
            x: 0,
            y: 0,
            z: 0.2, // Vertical position
            angle: Math.PI / 2, // Start facing North
            speed: 0,
            width: 1.8,
            length: 4.2
        };

        this.steeringInput = 0;
        this.currentSteering = 0;
        this.throttle = 0;
        this.braking = false;

        // Realistic city driving parameters
        this.MAX_SPEED = 33;       // m/s ≈ 120 km/h
        this.ACCEL = 6.0;          // ~0-100 km/h in 5s (sporty car)
        this.BRAKE_FORCE = 12.0;   // Comfortable braking
        this.FRICTION = 1.5;       // Engine braking / rolling resistance
        this.TURN_SPEED = 2.8;     // Gentler steering
        this.STEER_SMOOTH = 5.0;   // Steering response speed
    }

    setParams(params) {
        if (params.steeringSmoothing) this.STEER_SMOOTH = params.steeringSmoothing;
        if (params.turnSpeed) this.TURN_SPEED = params.turnSpeed;
        if (params.friction) this.FRICTION = params.friction;
    }

    handleInput(keys) {
        this.throttle = 0;
        this.steeringInput = 0;
        this.braking = false;

        if (keys['KeyW'] || keys['ArrowUp']) this.throttle = 1;
        if (keys['KeyS'] || keys['ArrowDown']) this.throttle = -1;
        if (keys['Space']) this.braking = true;

        if (keys['KeyA'] || keys['ArrowLeft']) this.steeringInput = 1;
        if (keys['KeyD'] || keys['ArrowRight']) this.steeringInput = -1;
    }

    update(dt, mapManager) {
        const dtSec = dt / 1000;
        if (dtSec > 0.1) return; // Skip large dt (tab switch, etc.)

        // 0. Smooth Steering — lerp towards target
        const steerDelta = this.STEER_SMOOTH * dtSec;
        if (this.currentSteering < this.steeringInput) {
            this.currentSteering = Math.min(this.currentSteering + steerDelta, this.steeringInput);
        } else if (this.currentSteering > this.steeringInput) {
            this.currentSteering = Math.max(this.currentSteering - steerDelta, this.steeringInput);
        }

        // 1. Forces
        let force = 0;
        if (this.throttle > 0) {
            const speedFactor = 1 - (Math.abs(this.car.speed) / this.MAX_SPEED) * 0.6;
            force = this.ACCEL * speedFactor;
        } else if (this.throttle < 0) {
            force = -this.ACCEL * 0.4; // Reverse is slower
        }

        if (this.braking) {
            if (this.car.speed > 0.1) force = -this.BRAKE_FORCE;
            else if (this.car.speed < -0.1) force = this.BRAKE_FORCE;
            else this.car.speed = 0;
        } else if (this.throttle === 0) {
            if (Math.abs(this.car.speed) < 0.3) {
                this.car.speed = 0;
            } else if (this.car.speed > 0) {
                force = -this.FRICTION;
            } else {
                force = this.FRICTION;
            }
        }

        this.car.speed += force * dtSec;

        // Clamp
        if (this.car.speed > this.MAX_SPEED) this.car.speed = this.MAX_SPEED;
        if (this.car.speed < -this.MAX_SPEED * 0.3) this.car.speed = -this.MAX_SPEED * 0.3;

        // 2. Steering
        if (Math.abs(this.car.speed) > 0.1) {
            const dir = this.car.speed > 0 ? 1 : -1;
            const speedRatio = Math.abs(this.car.speed) / this.MAX_SPEED;
            const turnFactor = 1 - speedRatio * 0.5;
            this.car.angle += this.currentSteering * this.TURN_SPEED * turnFactor * dtSec * dir;
        }

        // 3. Position (Horizontal)
        this.car.x += Math.cos(this.car.angle) * this.car.speed * dtSec;
        this.car.y += Math.sin(this.car.angle) * this.car.speed * dtSec;

        // 4. Height Snap (Vertical)
        let targetZ = 0.2;
        let minDist = 10; // Search radius for roads

        mapManager.ways.forEach(way => {
            for (let i = 0; i < way.nodeIds.length - 1; i++) {
                const n1 = mapManager.nodes.get(way.nodeIds[i]);
                const n2 = mapManager.nodes.get(way.nodeIds[i + 1]);
                if (!n1 || !n2) continue;

                const p = closestPointOnSegment({ x: this.car.x, y: this.car.y }, n1, n2);
                const d = distance({ x: this.car.x, y: this.car.y }, p);

                if (d < 5 && d < minDist) {
                    minDist = d;
                    // Interpolate height between nodes (enables ramps)
                    const segLen = distance(n1, n2);
                    const t = segLen === 0 ? 0 : distance(n1, p) / segLen;
                    targetZ = n1.height + (n2.height - n1.height) * t;
                }
            }
        });

        // Smoothly adjust height
        const zDelta = 15 * dtSec;
        if (Math.abs(this.car.z - targetZ) < zDelta) this.car.z = targetZ;
        else this.car.z += this.car.z < targetZ ? zDelta : -zDelta;
    }

    teleport(x, y) {
        this.car.x = x;
        this.car.y = y;
        this.car.speed = 0;
        this.currentSteering = 0;
    }
}
