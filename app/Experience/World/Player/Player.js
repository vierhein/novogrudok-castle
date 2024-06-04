import * as THREE from "three";
import Experience from "../../Experience.js";

import { EventEmitter } from "events";
import { Capsule } from "three/examples/jsm/math/Capsule";
import nipplejs from 'nipplejs';

export default class Player extends EventEmitter {
    constructor() {
        super();
        this.experience = new Experience();
        this.time = this.experience.time;
        this.camera = this.experience.camera;
        this.octree = this.experience.world.octree;

        this.initPlayer();
        this.initControls();
        this.addEventListeners();
        this.initMobileControls();
    }

    initPlayer() {
        this.player = {};
        this.player.body = this.camera.perspectiveCamera;

        this.player.onFloor = false;
        this.player.gravity = 60;

        this.player.spawn = {
            position: new THREE.Vector3(),
            rotation: new THREE.Euler(),
            velocity: new THREE.Vector3(),
        };

        this.player.raycaster = new THREE.Raycaster();
        this.player.raycaster.far = 5;

        this.player.height = 1.7;
        this.player.position = new THREE.Vector3();
        this.player.rotation = new THREE.Euler();
        this.player.rotation.order = "YXZ";

        this.player.velocity = new THREE.Vector3();
        this.player.direction = new THREE.Vector3();

        this.player.speedMultiplier = 1.5;

        this.player.collider = new Capsule(
            new THREE.Vector3(),
            new THREE.Vector3(),
            0.35
        );
    }

    initControls() {
        this.actions = {};
    }

    initMobileControls() {
        // Create joystick manager instances
        this.joystickManagerLeft = nipplejs.create({
            zone: document.getElementById('left_joystick_zone'),
            mode: 'static',
            position: { left: '20%', bottom: '20%' },
            color: 'red',
            size: 100
        });

        this.joystickManagerRight = nipplejs.create({
            zone: document.getElementById('right_joystick_zone'),
            mode: 'static',
            position: { right: '20%', bottom: '20%' },
            color: 'blue',
            size: 100
        });

        this.joystickManagerLeft.on('move', this.onMoveJoystick.bind(this));
        this.joystickManagerLeft.on('end', this.onEndJoystick.bind(this));
        this.joystickManagerRight.on('move', this.onLookJoystick.bind(this));
        this.joystickManagerRight.on('end', this.onEndJoystick.bind(this));
    }

    onMoveJoystick(evt, data) {
        const forward = data.vector.y;
        const right = data.vector.x;

        this.actions.forward = forward > 0.1;
        this.actions.backward = forward < -0.1;
        this.actions.left = right < -0.1;
        this.actions.right = right > 0.1;
    }

    onLookJoystick(evt, data) {
        const deltaX = data.vector.x * 0.1;
        const deltaY = data.vector.y * 0.1;

        this.player.body.rotation.order = this.player.rotation.order;

        this.player.body.rotation.x -= deltaY;
        this.player.body.rotation.y -= deltaX;

        this.player.body.rotation.x = THREE.MathUtils.clamp(
            this.player.body.rotation.x,
            -Math.PI / 2,
            Math.PI / 2
        );
    }

    onEndJoystick() {
        this.actions.forward = false;
        this.actions.backward = false;
        this.actions.left = false;
        this.actions.right = false;
    }

    onDesktopPointerMove = (e) => {
        if (document.pointerLockElement !== document.body) return;
        this.player.body.rotation.order = this.player.rotation.order;

        this.player.body.rotation.x -= e.movementY / 500;
        this.player.body.rotation.y -= e.movementX / 500;

        this.player.body.rotation.x = THREE.MathUtils.clamp(
            this.player.body.rotation.x,
            -Math.PI / 2,
            Math.PI / 2
        );
    };

    onKeyDown = (e) => {
        if (document.pointerLockElement !== document.body) return;

        if (e.code === "KeyW") {
            this.actions.forward = true;
        }
        if (e.code === "KeyS") {
            this.actions.backward = true;
        }
        if (e.code === "KeyA") {
            this.actions.left = true;
        }
        if (e.code === "KeyD") {
            this.actions.right = true;
        }

        if (e.code === "ShiftLeft") {
            this.actions.run = true;
        }

        if (e.code === "Space") {
            this.actions.jump = true;
        }
    };

    onKeyUp = (e) => {
        if (document.pointerLockElement !== document.body) return;

        if (e.code === "KeyW") {
            this.actions.forward = false;
        }
        if (e.code === "KeyS") {
            this.actions.backward = false;
        }
        if (e.code === "KeyA") {
            this.actions.left = false;
        }
        if (e.code === "KeyD") {
            this.actions.right = false;
        }

        if (e.code === "ShiftLeft") {
            this.actions.run = false;
        }

        if (e.code === "Space") {
            this.actions.jump = false;
        }
    };

    onPointerDown = (e) => {
        if (e.pointerType === "mouse") {
            document.body.requestPointerLock();
            return;
        }
    };

    playerCollisions() {
        const result = this.octree.capsuleIntersect(this.player.collider);
        this.player.onFloor = false;

        if (result) {
            this.player.onFloor = result.normal.y > 0;

            this.player.collider.translate(
                result.normal.multiplyScalar(result.depth)
            );
        }
    }

    getForwardVector() {
        this.camera.perspectiveCamera.getWorldDirection(this.player.direction);
        this.player.direction.y = 0;
        this.player.direction.normalize();

        return this.player.direction;
    }

    getSideVector() {
        this.camera.perspectiveCamera.getWorldDirection(this.player.direction);
        this.player.direction.y = 0;
        this.player.direction.normalize();
        this.player.direction.cross(this.camera.perspectiveCamera.up);

        return this.player.direction;
    }

    addEventListeners() {
        document.addEventListener("keydown", this.onKeyDown);
        document.addEventListener("keyup", this.onKeyUp);
        document.addEventListener("pointermove", this.onDesktopPointerMove);
        document.addEventListener("pointerdown", this.onPointerDown);
    }

    resize() {}

    spawnPlayerOutOfBounds() {
        const spawnPos = new THREE.Vector3(12.64, 1.7 + 10, 64.0198);
        this.player.velocity = this.player.spawn.velocity;
        this.player.body.position.copy(spawnPos);

        this.player.collider.start.copy(spawnPos);
        this.player.collider.end.copy(spawnPos);

        this.player.collider.end.y += this.player.height;
    }

    updateMovement() {
        const speed =
            (this.player.onFloor ? 1.75 : 0.2) *
            this.player.gravity *
            this.player.speedMultiplier;

        //The amount of distance we travel between each frame
        let speedDelta = this.time.delta * speed;

        if (this.actions.run) {
            speedDelta *= 1.6;
        }
        if (this.actions.forward) {
            this.player.velocity.add(
                this.getForwardVector().multiplyScalar(speedDelta)
            );
        }
        if (this.actions.backward) {
            this.player.velocity.add(
                this.getForwardVector().multiplyScalar(-speedDelta * 0.5)
            );
        }
        if (this.actions.left) {
            this.player.velocity.add(
                this.getSideVector().multiplyScalar(-speedDelta * 0.75)
            );
        }
        if (this.actions.right) {
            this.player.velocity.add(
                this.getSideVector().multiplyScalar(speedDelta * 0.75)
            );
        }

        if (this.player.onFloor) {
            if (this.actions.jump) {
                this.player.velocity.y = 30;
            }
        }

        let damping = Math.exp(-15 * this.time.delta) - 1;

        if (!this.player.onFloor) {
            this.player.velocity.y -= this.player.gravity * this.time.delta;
            damping *= 0.1;
        }

        this.player.velocity.addScaledVector(this.player.velocity, damping);

        const deltaPosition = this.player.velocity
            .clone()
            .multiplyScalar(this.time.delta);

        this.player.collider.translate(deltaPosition);
        this.playerCollisions();

        this.player.body.position.copy(this.player.collider.end);
        this.player.body.updateMatrixWorld();

        if (this.player.body.position.y < -20) {
            this.spawnPlayerOutOfBounds();
        }
    }

    setInteractionObjects(interactionObjects) {
        this.player.interactionObjects = interactionObjects;
    }

    getgetCameraLookAtDirectionalVector() {
        const direction = new THREE.Vector3(0, 0, -1);
        return direction.applyQuaternion(
            this.camera.perspectiveCamera.quaternion
        );
    }

    updateRaycaster() {
        this.player.raycaster.ray.origin.copy(
            this.camera.perspectiveCamera.position
        );

        this.player.raycaster.ray.direction.copy(
            this.getgetCameraLookAtDirectionalVector()
        );

        const intersects = this.player.raycaster.intersectObjects(
            this.player.interactionObjects.children
        );

        if (intersects.length === 0) {
            this.currentIntersectObject = "";
        } else {
            this.currentIntersectObject = intersects[0].object.name;
        }

        if (this.currentIntersectObject !== this.previousIntersectObject) {
            this.previousIntersectObject = this.currentIntersectObject;
            this.emit("updateMessage", this.previousIntersectObject);
        }
    }

    update() {
        this.updateMovement();
        this.updateRaycaster();
    }
}
