const header = document.querySelector("[data-floating]");
const progress = document.querySelector(".scroll-progress");
const cursorDot = document.querySelector(".cursor-dot");
const cursorRing = document.querySelector(".cursor-ring");
const revealItems = document.querySelectorAll(".reveal");
const parallaxItems = document.querySelectorAll("[data-parallax]");

document.body.classList.add("motion-ready");

const cursorState = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  ringX: window.innerWidth / 2,
  ringY: window.innerHeight / 2
};

const canUseCustomCursor = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

function animateCursor() {
  if (!cursorDot || !cursorRing || !canUseCustomCursor) return;

  cursorState.ringX += (cursorState.x - cursorState.ringX) * 0.18;
  cursorState.ringY += (cursorState.y - cursorState.ringY) * 0.18;

  cursorDot.style.left = `${cursorState.x}px`;
  cursorDot.style.top = `${cursorState.y}px`;
  cursorRing.style.left = `${cursorState.ringX}px`;
  cursorRing.style.top = `${cursorState.ringY}px`;

  requestAnimationFrame(animateCursor);
}

if (cursorDot && cursorRing && canUseCustomCursor) {
  window.addEventListener(
    "pointermove",
    (event) => {
      cursorState.x = event.clientX;
      cursorState.y = event.clientY;
      document.body.classList.add("cursor-visible");
    },
    { passive: true }
  );

  document.addEventListener("pointerleave", () => {
    document.body.classList.remove("cursor-visible");
  });

  document.addEventListener("pointerenter", () => {
    document.body.classList.add("cursor-visible");
  });

  document.querySelectorAll("a, button, .button, .tilt-card, .portfolio-card").forEach((item) => {
    item.addEventListener("pointerenter", () => document.body.classList.add("cursor-active"));
    item.addEventListener("pointerleave", () => document.body.classList.remove("cursor-active"));
  });

  animateCursor();
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index % 4, 3) * 90}ms`;
  revealObserver.observe(item);
});

function updateScrollEffects() {
  const scrollY = window.scrollY;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progressWidth = maxScroll > 0 ? (scrollY / maxScroll) * 100 : 0;

  header.classList.toggle("is-scrolled", scrollY > 24);
  progress.style.width = `${progressWidth}%`;

  parallaxItems.forEach((item) => {
    const rect = item.getBoundingClientRect();
    const speed = Number(item.dataset.speed || 0);
    const offset = (rect.top - window.innerHeight * 0.5) * speed;
    item.style.transform = `translate3d(0, ${offset}px, 0) scale(1.08)`;
  });
}

window.addEventListener("scroll", updateScrollEffects, { passive: true });
window.addEventListener("resize", updateScrollEffects);
updateScrollEffects();

document.querySelectorAll(".tilt-card").forEach((card) => {
  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `rotateX(${-y * 7}deg) rotateY(${x * 9}deg) translateY(-8px)`;
  });

  card.addEventListener("pointerleave", () => {
    card.style.transform = "";
  });
});

const canvas = document.querySelector("#estate-canvas");
let THREE;
let renderer;
let scene;
let camera;
let cityGroup;
let particles;
let pointerX = 0;
let pointerY = 0;
let cityBaseY = -1.05;

function makeMaterial(color, emissive, roughness = 0.42, metalness = 0.25) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: 0.18,
    roughness,
    metalness,
    transparent: true,
    opacity: 0.88
  });
}

function addTower(group, x, z, width, depth, height, color) {
  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    makeMaterial(color, color, 0.34, 0.48)
  );
  tower.position.set(x, height / 2, z);
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);

  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.08, 0.08, depth * 1.08),
    makeMaterial(0xfff2c4, 0xffc857, 0.26, 0.62)
  );
  cap.position.set(x, height + 0.08, z);
  group.add(cap);

  const windowRows = Math.max(2, Math.floor(height / 0.42));
  for (let i = 1; i < windowRows; i += 1) {
    const row = new THREE.Mesh(
      new THREE.BoxGeometry(width * 1.04, 0.028, 0.014),
      new THREE.MeshBasicMaterial({ color: 0xfff2a8, transparent: true, opacity: 0.58 })
    );
    row.position.set(x, i * 0.38 + 0.2, z + depth / 2 + 0.012);
    group.add(row);
  }
}

async function createEstateScene() {
  THREE = await import("three");

  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  camera.position.set(5.2, 4.2, 8.4);

  cityGroup = new THREE.Group();
  cityGroup.position.set(3.15, cityBaseY, -1.4);
  cityGroup.rotation.set(-0.08, -0.45, 0);
  scene.add(cityGroup);

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(8.8, 0.16, 5.6),
    makeMaterial(0xffffff, 0xffd27d, 0.25, 0.5)
  );
  base.position.set(0, -0.08, 0);
  base.receiveShadow = true;
  cityGroup.add(base);

  const grid = new THREE.GridHelper(9.2, 12, 0xffe6a9, 0x81ffe8);
  grid.position.y = 0.02;
  grid.material.transparent = true;
  grid.material.opacity = 0.28;
  cityGroup.add(grid);

  const towers = [
    [-2.9, -1.35, 0.72, 0.76, 2.6, 0xefffff],
    [-1.65, -0.95, 0.62, 0.72, 3.35, 0xa3fff1],
    [-0.62, -1.55, 0.86, 0.7, 2.15, 0xffffff],
    [0.42, -0.9, 0.64, 0.76, 4.2, 0xfff0b5],
    [1.5, -1.35, 0.74, 0.68, 2.9, 0xe9fffb],
    [2.6, -0.72, 0.78, 0.78, 3.65, 0xffdfcf],
    [-2.2, 0.58, 0.7, 0.82, 1.9, 0xfff8db],
    [-0.92, 0.72, 0.92, 0.72, 2.8, 0xdffdf6],
    [0.42, 0.54, 0.9, 0.86, 2.2, 0xffffff],
    [1.72, 0.68, 0.84, 0.74, 3.1, 0xfff1bd]
  ];

  towers.forEach((tower) => addTower(cityGroup, ...tower));

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.95, 0.018, 8, 100),
    new THREE.MeshBasicMaterial({ color: 0x52f3db, transparent: true, opacity: 0.62 })
  );
  ring.position.y = 0.08;
  ring.rotation.x = Math.PI / 2;
  cityGroup.add(ring);

  const markerGeometry = new THREE.SphereGeometry(0.08, 18, 18);
  const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff6b57 });
  for (let i = 0; i < 14; i += 1) {
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    const angle = (i / 14) * Math.PI * 2;
    marker.position.set(Math.cos(angle) * 3.9, 0.16, Math.sin(angle) * 2.35);
    cityGroup.add(marker);
  }

  const particleGeometry = new THREE.BufferGeometry();
  const positions = [];
  for (let i = 0; i < 160; i += 1) {
    positions.push((Math.random() - 0.5) * 12, Math.random() * 5.2, (Math.random() - 0.5) * 7);
  }
  particleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      color: 0xffe197,
      size: 0.035,
      transparent: true,
      opacity: 0.7
    })
  );
  particles.position.set(2.5, -0.6, -1.4);
  scene.add(particles);

  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(2.5, 6, 6);
  key.castShadow = true;
  scene.add(key);

  const teal = new THREE.PointLight(0x52f3db, 3.4, 12);
  teal.position.set(4, 2.4, 2.2);
  scene.add(teal);

  const coral = new THREE.PointLight(0xff6b57, 2.8, 10);
  coral.position.set(-2.6, 1.8, 3.8);
  scene.add(coral);

  window.addEventListener("pointermove", (event) => {
    pointerX = event.clientX / window.innerWidth - 0.5;
    pointerY = event.clientY / window.innerHeight - 0.5;
  });

  resizeScene();
  animateScene();
}

function resizeScene() {
  if (!renderer || !camera) return;

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  if (window.innerWidth < 720) {
    camera.position.set(3.8, 3.9, 9.5);
    cityBaseY = -1.06;
    cityGroup.position.set(0.95, cityBaseY, -1.2);
    cityGroup.scale.setScalar(0.72);
  } else {
    camera.position.set(5.2, 4.2, 8.4);
    cityBaseY = -1.02;
    cityGroup.position.set(3.15, cityBaseY, -1.4);
    cityGroup.scale.setScalar(1);
  }
}

function animateScene(time = 0) {
  const t = time * 0.001;

  if (cityGroup) {
    cityGroup.rotation.y = -0.45 + Math.sin(t * 0.55) * 0.08 + pointerX * 0.1;
    cityGroup.rotation.x = -0.08 + Math.sin(t * 0.42) * 0.025 - pointerY * 0.04;
    cityGroup.position.y += (cityBaseY + Math.sin(t * 0.9) * 0.04 - cityGroup.position.y) * 0.08;
  }

  if (particles) {
    particles.rotation.y = t * 0.04;
    particles.position.y = -0.6 + Math.sin(t * 0.8) * 0.12;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animateScene);
}

createEstateScene()
  .then(() => {
    window.addEventListener("resize", resizeScene);
  })
  .catch((error) => {
    canvas.style.display = "none";
    console.warn("3D scene could not be initialized.", error);
  });
