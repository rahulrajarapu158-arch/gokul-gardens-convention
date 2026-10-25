/* ==========================================================================
   GOKUL GARDENS CONVENTION CENTER - SANGAREDDY (MALKAPUR NH-65)
   Interactive 360 Tour, Budget Estimator & UI Engine
   Official Venue Phone: +91 94408 94477
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    lucide.createIcons();
  }

  /* ------------------------------------------------------------------------
     1. THREE.JS 360 PANORAMA VIEWER ENGINE
     ------------------------------------------------------------------------ */
  const panoramaWrapper = document.getElementById('panoramaWrapper');
  const threeCanvasContainer = document.getElementById('threeCanvasContainer');
  const startTourBtn = document.getElementById('startTourBtn');
  const panoramaCover = document.getElementById('panoramaCover');

  // Scene Texture Configurations
  const panoramaScenes = {
    hall: 'assets/panoramas/hall_360.jpg',
    stage: 'assets/panoramas/stage_360.jpg',
    lawn: 'assets/panoramas/lawn_360.jpg'
  };

  let scene, camera, renderer, sphereMesh, textureLoader;
  let currentSceneKey = 'hall';
  let isTourInitialized = false;

  // Camera & Interaction State
  let isUserInteracting = false;
  let lon = 0, lat = 0;
  let targetLon = 0, targetLat = 0;
  let onPointerDownPointerX = 0, onPointerDownPointerY = 0;
  let onPointerDownLon = 0, onPointerDownLat = 0;
  let autoRotate = true;
  let gyroEnabled = false;

  function initThreeTour() {
    if (isTourInitialized) return;
    isTourInitialized = true;

    const width = threeCanvasContainer.clientWidth || 800;
    const height = threeCanvasContainer.clientHeight || 500;

    // 1. Scene & Camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, width / height, 1, 1100);
    camera.target = new THREE.Vector3(0, 0, 0);

    // 2. Geometry: Inverted Sphere for 360 panorama
    const geometry = new THREE.SphereGeometry(500, 64, 40);
    geometry.scale(-1, 1, 1);

    // 3. Texture & Material
    textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(panoramaScenes[currentSceneKey], () => {
      renderer.render(scene, camera);
    });

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.FrontSide
    });

    sphereMesh = new THREE.Mesh(geometry, material);
    scene.add(sphereMesh);

    // 4. WebGL Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.domElement.style.touchAction = 'none';
    threeCanvasContainer.innerHTML = '';
    threeCanvasContainer.appendChild(renderer.domElement);

    // 5. Event Listeners for Interaction
    setupViewerEvents();

    // 6. Animation Loop
    animate();
  }

  function setupViewerEvents() {
    const el = renderer.domElement;

    // Mouse / Touch Drag
    const onPointerDown = (event) => {
      isUserInteracting = true;
      const clientX = event.clientX || (event.touches && event.touches[0].clientX);
      const clientY = event.clientY || (event.touches && event.touches[0].clientY);
      onPointerDownPointerX = clientX;
      onPointerDownPointerY = clientY;
      onPointerDownLon = lon;
      onPointerDownLat = lat;
    };

    const onPointerMove = (event) => {
      if (!isUserInteracting) return;
      const clientX = event.clientX || (event.touches && event.touches[0].clientX);
      const clientY = event.clientY || (event.touches && event.touches[0].clientY);
      targetLon = (onPointerDownPointerX - clientX) * 0.15 + onPointerDownLon;
      targetLat = (clientY - onPointerDownPointerY) * 0.15 + onPointerDownLat;
    };

    const onPointerUp = () => {
      isUserInteracting = false;
    };

    el.addEventListener('mousedown', onPointerDown, false);
    window.addEventListener('mousemove', onPointerMove, false);
    window.addEventListener('mouseup', onPointerUp, false);

    el.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp, false);

    // Wheel Zoom
    el.addEventListener('wheel', (event) => {
      event.preventDefault();
      camera.fov = Math.max(35, Math.min(95, camera.fov + event.deltaY * 0.05));
      camera.updateProjectionMatrix();
    }, { passive: false });

    // Window Resize
    window.addEventListener('resize', onWindowResize, false);
  }

  function onWindowResize() {
    if (!renderer || !camera) return;
    const width = threeCanvasContainer.clientWidth;
    const height = threeCanvasContainer.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function switchScene(sceneKey) {
    if (!panoramaScenes[sceneKey] || !sphereMesh) return;
    currentSceneKey = sceneKey;

    // Load new texture smoothly
    textureLoader.load(panoramaScenes[sceneKey], (newTexture) => {
      sphereMesh.material.map.dispose();
      sphereMesh.material.map = newTexture;
      sphereMesh.material.needsUpdate = true;
    });

    // Update active HUD button
    document.querySelectorAll('.scene-btn').forEach(btn => {
      if (btn.getAttribute('data-scene') === sceneKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Adjust hotspots visibility based on scene
    const hotspotsOverlay = document.getElementById('hotspotsOverlay');
    if (hotspotsOverlay) {
      if (sceneKey === 'hall') {
        hotspotsOverlay.style.display = 'block';
      } else {
        hotspotsOverlay.style.display = 'none';
      }
    }
  }

  function animate() {
    requestAnimationFrame(animate);

    if (autoRotate && !isUserInteracting && !gyroEnabled) {
      targetLon += 0.07; // Slow smooth pan
    }

    // Smooth lerp damping
    lon += (targetLon - lon) * 0.1;
    lat += (targetLat - lat) * 0.1;

    // Clamp vertical tilt
    lat = Math.max(-85, Math.min(85, lat));

    const phi = THREE.MathUtils.degToRad(90 - lat);
    const theta = THREE.MathUtils.degToRad(lon);

    camera.target.x = 500 * Math.sin(phi) * Math.cos(theta);
    camera.target.y = 500 * Math.cos(phi);
    camera.target.z = 500 * Math.sin(phi) * Math.sin(theta);

    camera.lookAt(camera.target);
    renderer.render(scene, camera);
  }

  // Cover activate button
  if (startTourBtn && panoramaCover) {
    startTourBtn.addEventListener('click', () => {
      panoramaCover.classList.add('hidden');
      initThreeTour();
    });
  }

  // Scene Buttons
  document.querySelectorAll('.scene-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sceneKey = btn.getAttribute('data-scene');
      if (!isTourInitialized) {
        if (panoramaCover) panoramaCover.classList.add('hidden');
        initThreeTour();
      }
      switchScene(sceneKey);
    });
  });

  // HUD Auto-Rotate Toggle
  const toggleAutoRotateBtn = document.getElementById('toggleAutoRotateBtn');
  if (toggleAutoRotateBtn) {
    toggleAutoRotateBtn.addEventListener('click', () => {
      autoRotate = !autoRotate;
      toggleAutoRotateBtn.classList.toggle('active', autoRotate);
    });
  }

  // HUD Gyrophone Toggle
  const toggleGyroBtn = document.getElementById('toggleGyroBtn');
  if (toggleGyroBtn) {
    toggleGyroBtn.addEventListener('click', () => {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(permissionState => {
          if (permissionState === 'granted') {
            enableGyro();
          } else {
            alert('Sensor motion permission denied.');
          }
        }).catch(console.error);
      } else {
        enableGyro();
      }
    });
  }

  function enableGyro() {
    gyroEnabled = !gyroEnabled;
    toggleGyroBtn.classList.toggle('active', gyroEnabled);
    if (gyroEnabled) {
      autoRotate = false;
      window.addEventListener('deviceorientation', handleOrientation);
    } else {
      window.removeEventListener('deviceorientation', handleOrientation);
    }
  }

  function handleOrientation(event) {
    if (!gyroEnabled || !event.alpha || !event.beta) return;
    targetLon = event.alpha;
    targetLat = (event.beta - 90) * 0.8;
  }

  // HUD Fullscreen Toggle
  const toggleFullscreenBtn = document.getElementById('toggleFullscreenBtn');
  if (toggleFullscreenBtn && panoramaWrapper) {
    toggleFullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        if (panoramaWrapper.requestFullscreen) {
          panoramaWrapper.requestFullscreen();
        } else if (panoramaWrapper.webkitRequestFullscreen) {
          panoramaWrapper.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    });

    document.addEventListener('fullscreenchange', () => {
      setTimeout(onWindowResize, 150);
    });
  }

  /* ------------------------------------------------------------------------
     2. HOTSPOTS & DETAIL DRAWER
     ------------------------------------------------------------------------ */
  const hotspotDrawer = document.getElementById('hotspotDrawer');
  const drawerClose = document.getElementById('drawerClose');
  const drawerThumbImg = document.getElementById('drawerThumbImg');
  const drawerTitle = document.getElementById('drawerTitle');
  const drawerDesc = document.getElementById('drawerDesc');
  const drawerInquireBtn = document.getElementById('drawerInquireBtn');

  document.querySelectorAll('.hotspot-pin').forEach(pin => {
    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      const title = pin.getAttribute('data-title');
      const desc = pin.getAttribute('data-desc');
      const img = pin.getAttribute('data-img');

      if (drawerTitle) drawerTitle.textContent = title;
      if (drawerDesc) drawerDesc.textContent = desc;
      if (drawerThumbImg) drawerThumbImg.src = img;

      const waText = encodeURIComponent(`Hello Gokul Gardens, I am viewing the 360° Walkthrough and would like to inquire about the ${title}.`);
      if (drawerInquireBtn) {
        drawerInquireBtn.href = `https://wa.me/919440894477?text=${waText}`;
      }

      if (hotspotDrawer) hotspotDrawer.classList.add('active');
    });
  });

  if (drawerClose && hotspotDrawer) {
    drawerClose.addEventListener('click', () => {
      hotspotDrawer.classList.remove('active');
    });
  }

  /* ------------------------------------------------------------------------
     3. VENUE SPACES TABS
     ------------------------------------------------------------------------ */
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.space-tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-target');

      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      button.classList.add('active');
      button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });

  /* ------------------------------------------------------------------------
     4. MUHURTHAM BUDGET ESTIMATOR (SANGAREDDY HIGHWAY PRICING)
     ------------------------------------------------------------------------ */
  const guestRange = document.getElementById('guestRange');
  const guestDisplay = document.getElementById('guestDisplay');
  const packageTier = document.getElementById('packageTier');
  const baseRentDisplay = document.getElementById('baseRentDisplay');
  const totalCostDisplay = document.getElementById('totalCostDisplay');
  const calcWhatsAppBtn = document.getElementById('calcWhatsAppBtn');
  const eventPills = document.querySelectorAll('.event-pill-btn');

  let activeMultiplier = 1.0;
  let activeEventTypeName = 'Traditional Wedding (Hall + Dining)';

  function calculateEstimate() {
    if (!guestRange) return;
    const guests = parseInt(guestRange.value, 10);
    guestDisplay.textContent = `${guests.toLocaleString('en-IN')} Guests`;

    let baseHall = 135000;
    let tierName = 'Silver Kalyana Package';

    if (guests <= 500) {
      baseHall = 125000;
      tierName = 'Intimate Kalyana Tier (Up to 500)';
    } else if (guests <= 900) {
      baseHall = 150000;
      tierName = 'Grand Convention Tier (500–900)';
    } else if (guests <= 1400) {
      baseHall = 190000;
      tierName = 'Royal Highway Celebration (900–1,400)';
    } else {
      baseHall = 240000;
      tierName = 'Mega Empire Muhurtham (1,500+)';
    }

    const calculatedBase = Math.round(baseHall * activeMultiplier);
    const lowEstimate = calculatedBase;
    const highEstimate = Math.round(calculatedBase * 1.25);

    if (packageTier) packageTier.textContent = tierName;
    if (baseRentDisplay) baseRentDisplay.textContent = `₹${calculatedBase.toLocaleString('en-IN')}`;
    if (totalCostDisplay) {
      totalCostDisplay.textContent = `₹${lowEstimate.toLocaleString('en-IN')} - ₹${highEstimate.toLocaleString('en-IN')}`;
    }

    // Dynamic WhatsApp Link with Pre-filled Quote Details
    if (calcWhatsAppBtn) {
      const message = `Hello Gokul Gardens Convention Center, I would like to lock in this venue quote:
• Event Type: ${activeEventTypeName}
• Expected Guests: ${guests}
• Package Tier: ${tierName}
• Estimated Rental: ₹${lowEstimate.toLocaleString('en-IN')} - ₹${highEstimate.toLocaleString('en-IN')}
Please check Muhurtham date availability and schedule a venue tour for my family.`;

      calcWhatsAppBtn.href = `https://wa.me/919440894477?text=${encodeURIComponent(message)}`;
    }
  }

  if (guestRange) {
    guestRange.addEventListener('input', calculateEstimate);
  }

  eventPills.forEach(pill => {
    pill.addEventListener('click', () => {
      eventPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeMultiplier = parseFloat(pill.getAttribute('data-multiplier') || '1.0');
      activeEventTypeName = pill.innerText.trim();
      calculateEstimate();
    });
  });

  // Run initial calculation
  calculateEstimate();
});
