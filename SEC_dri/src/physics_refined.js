import { PhysicsEngine } from './physics.js';

export class PhysicsEngineRefined extends PhysicsEngine {
    handleInput(keys) {
        this.throttle = 0;
        this.steering = 0;
        this.braking = false;

        // Use Code for physical location of keys (WASD)
        if (keys['KeyW'] || keys['ArrowUp']) this.throttle = 1;
        if (keys['KeyS'] || keys['ArrowDown']) this.throttle = -1;
        if (keys['Space']) this.braking = true;

        if (keys['KeyA'] || keys['ArrowLeft']) this.steering = -1;
        if (keys['KeyD'] || keys['ArrowRight']) this.steering = 1;

        // Lane Changing (Visual Request) - Q/E
        if (keys['KeyQ']) this.targetLaneOffset -= 3.5;
        if (keys['KeyE']) this.targetLaneOffset += 3.5;
    }
}
