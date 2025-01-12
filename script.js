let camera, scene, renderer, controls;
let objects = [];
let bullets = [];
let raycaster;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let lastKeyTime = 0;
let doubleSpeed = false;

let outOfBounds = false;
let outOfBoundsTime = 0;
let countdownDisplay;

let health = 100;
let healthDisplay;
let flying = false;
let flyTimeout;
let landing = false;

init();
animate();

function init() {
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background

    let light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
    light.position.set(0.5, 1, 0.75);
    scene.add(light);

    controls = new THREE.PointerLockControls(camera, document.body);

    document.addEventListener('click', function () {
        controls.lock();
    }, false);

    scene.add(controls.getObject());

    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    document.addEventListener('mousedown', onMouseDown, false);

    raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 10);

    // Create the ground
    let floorGeometry = new THREE.PlaneGeometry(2000, 2000, 100, 100);
    floorGeometry.rotateX(-Math.PI / 2);

    let floorMaterial = new THREE.MeshBasicMaterial({ color: 0x808080, wireframe: true });
    let floor = new THREE.Mesh(floorGeometry, floorMaterial);
    scene.add(floor);

    // Create raised terrain (hills)
    for (let i = 0; i < 10; i++) {
        let hillGeometry = new THREE.BoxGeometry(50, 10, 50);
        let hillMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513, wireframe: true });
        let hill = new THREE.Mesh(hillGeometry, hillMaterial);
        hill.position.set(Math.random() * 1000 - 500, 5, Math.random() * 1000 - 500);
        scene.add(hill);
        objects.push(hill);
    }

    // Create an enemy
    let enemyGeometry = new THREE.BoxGeometry(20, 20, 20);
    let enemyMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    let enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
    enemy.position.set(0, 10, -100);
    scene.add(enemy);
    objects.push(enemy);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    window.addEventListener('resize', function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }, false);

    // Create countdown display
    countdownDisplay = document.createElement('div');
    countdownDisplay.style.position = 'absolute';
    countdownDisplay.style.top = '10px';
    countdownDisplay.style.left = '10px';
    countdownDisplay.style.fontSize = '24px';
    countdownDisplay.style.color = 'red';
    document.body.appendChild(countdownDisplay);

    // Create health display
    healthDisplay = document.createElement('div');
    healthDisplay.style.position = 'absolute';
    healthDisplay.style.top = '40px';
    healthDisplay.style.left = '10px';
    healthDisplay.style.fontSize = '24px';
    healthDisplay.style.color = 'green';
    updateHealthDisplay();
    document.body.appendChild(healthDisplay);

    // Draw gun icon
    drawGunIcon();

    // Draw crosshair
    drawCrosshair();
}

function onKeyDown(event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = true;
            // Detect double press for fast movement
            let currentTime = performance.now();
            if (currentTime - lastKeyTime < 300) {
                doubleSpeed = true;
            }
            lastKeyTime = currentTime;
            break;
        case 'ArrowLeft':
        case 'KeyD':
            moveLeft = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true;
            break;
        case 'ArrowRight':
        case 'KeyA':
            moveRight = true;
            break;
        case 'Space':
            if (canJump === true) velocity.y += 350;
            canJump = false;
            // Detect double press for flying
            currentTime = performance.now();
            if (currentTime - lastKeyTime < 300) {
                flying = true;
                clearTimeout(flyTimeout);
                flyTimeout = setTimeout(() => { flying = false; }, 5000); // Fly for 5 seconds
            }
            lastKeyTime = currentTime;
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = false;
            doubleSpeed = false; // Reset double speed when W is released
            break;
        case 'ArrowLeft':
        case 'KeyD':
            moveLeft = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false;
            break;
        case 'ArrowRight':
        case 'KeyA':
            moveRight = false;
            break;
        case 'Space':
            // Stop flying when space is released
            flying = false;
            break;
    }
}

function onMouseDown(event) {
    if (event.button === 0) { // Left click
        fireBullet();
        // Reduce health by 1
        health -= 1;
        updateHealthDisplay();
    }
}

function fireBullet() {
    let bulletGeometry = new THREE.SphereGeometry(2, 8, 8);
    let bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    let bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

    bullet.position.set(
        controls.getObject().position.x,
        controls.getObject().position.y,
        controls.getObject().position.z
    );

    let vector = new THREE.Vector3(0, 0, -1);
    vector.applyQuaternion(camera.quaternion);
    bullet.velocity = vector.multiplyScalar(50); // Further increased bullet speed
    
    scene.add(bullet);
    bullets.push(bullet);
}

function animate() {
    requestAnimationFrame(animate);

    let time = performance.now();
    let delta = (time - prevTime) / 1000;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    if (!flying) {
        velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass
    } else {
        velocity.y = 0;
        controls.getObject().position.y += 50 * delta; // Fly upwards
    }

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveLeft) - Number(moveRight);
    direction.normalize(); // this ensures consistent movements in all directions

    let speedMultiplier = doubleSpeed ? 2.0 : 1.0;

    if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta * speedMultiplier;
    if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta * speedMultiplier;

    controls.moveRight(- velocity.x * delta);
    controls.moveForward(- velocity.z * delta);

    controls.getObject().position.y += (velocity.y * delta); // new behavior

    if (controls.getObject().position.y < 10) {
        velocity.y = 0;
        controls.getObject().position.y = 10;
        canJump = true;
        if (!landing) {
            landing = true;
            shakeCamera();
        }
    }

    updateBullets(delta);

    checkOutOfBounds(time);

    prevTime = time;

    renderer.render(scene, camera);
}

function updateBullets(delta) {
    for (let i = 0; i < bullets.length; i++) {
        let bullet = bullets[i];
        bullet.position.add(bullet.velocity.clone().multiplyScalar(delta));

        // Apply gravity to bullets
        bullet.velocity.y -= 9.8 * delta;

        // Check for collisions with objects
        let bulletBox = new THREE.Box3().setFromObject(bullet);
        for (let j = 0; j < objects.length; j++) {
            let objectBox = new THREE.Box3().setFromObject(objects[j]);
            if (bulletBox.intersectsBox(objectBox)) {
                // Collision detected, reverse bullet velocity to simulate bounce
                let direction = bullet.velocity.clone().normalize();
                bullet.velocity.sub(direction.multiplyScalar(2 * bullet.velocity.dot(direction)));
            }
        }

        // Check for collisions with ground
        if (bullet.position.y <= 2) { // Assuming bullet radius is 2
            bullet.velocity.y = -bullet.velocity.y;
        }
    }
}

function checkOutOfBounds(currentTime) {
    // Define out of bounds condition (example: if y > 20)
    if (controls.getObject().position.y > 20) {
        if (!outOfBounds) {
            outOfBounds = true;
            outOfBoundsTime = currentTime;
        } else {
            let elapsed = Math.floor((currentTime - outOfBoundsTime) / 1000);
            let countdown = 3 - elapsed;
            countdownDisplay.innerText = `Returning in: ${countdown}`;
            if (countdown <= 0) {
                // Teleport to a random position within bounds
                controls.getObject().position.set(
                    Math.random() * 200 - 100,
                    10,
                    Math.random() * 200 - 100
                );
                outOfBounds = false;
                countdownDisplay.innerText = '';
            }
        }
    } else {
        outOfBounds = false;
        countdownDisplay.innerText = '';
    }
}

function updateHealthDisplay() {
    healthDisplay.innerText = `Health: ${health}`;
}

function shakeCamera() {
    const shakeDuration = 500; // in milliseconds
    const shakeIntensity = 0.1;
    const shakeSpeed = 50; // in milliseconds

    let startTime = performance.now();

    function shake() {
        let currentTime = performance.now();
        let elapsedTime = currentTime - startTime;

        if (elapsedTime < shakeDuration) {
            let shakeX = (Math.random() - 0.5) * shakeIntensity;
            let shakeY = (Math.random() - 0.5) * shakeIntensity;

            camera.position.x += shakeX;
            camera.position.y += shakeY;

            setTimeout(shake, shakeSpeed);
        } else {
            landing = false;
        }
    }

    shake();
}

function drawGunIcon() {
    let canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    let context = canvas.getContext('2d');

    // Draw the gun icon (a simple representation)
    context.fillStyle = 'black';
    context.fillRect(20, 70, 60, 10); // Barrel
    context.fillRect(35, 50, 30, 20); // Handle

    document.body.appendChild(canvas);
    canvas.style.position = 'absolute';
    canvas.style.bottom = '10px';
    canvas.style.right = '10px';
}

function drawCrosshair() {
    let crosshair = document.createElement('div');
    crosshair.style.position = 'absolute';
    crosshair.style.width = '2px';
    crosshair.style.height = '2px';
    crosshair.style.backgroundColor = 'black';
    crosshair.style.top = '50%';
    crosshair.style.left = '50%';
    crosshair.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(crosshair);
}