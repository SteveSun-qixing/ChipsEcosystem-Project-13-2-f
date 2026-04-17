const root = document.documentElement;
const body = document.body;
const cursorOrb = document.getElementById("cursor-orb");
const clickBlooms = document.getElementById("click-blooms");
const constellation = document.getElementById("constellation");
const floatingSeeds = document.getElementById("floating-seeds");
const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointerQuery = window.matchMedia("(pointer: fine)");

function readCssPixelValue(name) {
  const value = window.getComputedStyle(root).getPropertyValue(name).trim();
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getLayoutHeight() {
  return Math.max(readCssPixelValue("--page-layout-height"), 1);
}

function getViewportWidth() {
  return Math.max(window.innerWidth, 1);
}

function getNormalizedRatio(value, size) {
  return clamp(size > 0 ? value / size : 0);
}

const pointer = {
  currentX: getViewportWidth() * 0.5,
  currentY: getLayoutHeight() * 0.5,
  targetX: getViewportWidth() * 0.5,
  targetY: getLayoutHeight() * 0.5,
  offsetX: 0,
  offsetY: 0,
};

let pointerFrame = 0;
let measureFrame = 0;
let latestScrollY = window.scrollY;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function createStarfield() {
  if (!constellation) {
    return;
  }

  constellation.replaceChildren();

  const total = reduceMotionQuery.matches
    ? 12
    : window.innerWidth < 720
      ? 18
      : 28;

  for (let index = 0; index < total; index += 1) {
    const star = document.createElement("span");
    star.className = "star";
    star.style.setProperty("--x", randomBetween(4, 96).toFixed(2));
    star.style.setProperty("--y", randomBetween(4, 96).toFixed(2));
    star.style.setProperty("--size", `${randomBetween(1.2, 2.6).toFixed(2)}px`);
    star.style.setProperty("--opacity", randomBetween(0.24, 0.84).toFixed(2));
    star.style.setProperty("--duration", `${randomBetween(3.2, 6.8).toFixed(2)}s`);
    star.style.setProperty("--delay", `${randomBetween(-6, 0).toFixed(2)}s`);
    constellation.append(star);
  }
}

function createFloatingSeeds() {
  if (!floatingSeeds) {
    return;
  }

  floatingSeeds.replaceChildren();

  const total = reduceMotionQuery.matches
    ? 8
    : window.innerWidth < 720
      ? 10
      : 14;

  for (let index = 0; index < total; index += 1) {
    const seed = document.createElement("span");
    seed.className = "seed";
    seed.style.setProperty("--x", randomBetween(6, 94).toFixed(2));
    seed.style.setProperty("--y", randomBetween(10, 92).toFixed(2));
    seed.style.setProperty("--size", `${randomBetween(12, 26).toFixed(2)}px`);
    seed.style.setProperty("--drift-x", randomBetween(-90, 130).toFixed(2));
    seed.style.setProperty("--drift-y", randomBetween(-120, 160).toFixed(2));
    seed.style.setProperty("--duration", `${randomBetween(16, 28).toFixed(2)}s`);
    seed.style.setProperty("--delay", `${randomBetween(-24, 0).toFixed(2)}s`);
    floatingSeeds.append(seed);
  }
}

function updateReadingState() {
  measureFrame = 0;

  latestScrollY = window.scrollY;
  const viewportHeight = getLayoutHeight();
  const maxScroll = document.documentElement.scrollHeight - viewportHeight;
  const progress = maxScroll > 0 ? clamp(latestScrollY / maxScroll) : 0;
  const bloom = 0.22 + smoothstep(0.04, 0.72, progress) * 0.78;

  root.style.setProperty("--scroll", progress.toFixed(4));
  root.style.setProperty("--bloom", bloom.toFixed(4));
}

function requestMeasure() {
  if (measureFrame) {
    return;
  }

  measureFrame = window.requestAnimationFrame(updateReadingState);
}

function animatePointer() {
  pointerFrame = 0;

  const easing = reduceMotionQuery.matches ? 0.24 : 0.14;
  pointer.currentX += (pointer.targetX - pointer.currentX) * easing;
  pointer.currentY += (pointer.targetY - pointer.currentY) * easing;

  const viewportWidth = getViewportWidth();
  const layoutHeight = getLayoutHeight();
  const pointerRatioX = getNormalizedRatio(pointer.currentX, viewportWidth);
  const pointerRatioY = getNormalizedRatio(pointer.currentY, layoutHeight);

  pointer.offsetX = (pointerRatioX - 0.5) * 2;
  pointer.offsetY = (pointerRatioY - 0.5) * 2;

  root.style.setProperty("--mx", pointer.offsetX.toFixed(4));
  root.style.setProperty("--my", pointer.offsetY.toFixed(4));
  root.style.setProperty("--pointer-x", `${(pointerRatioX * 100).toFixed(2)}%`);
  root.style.setProperty("--pointer-y", `${(pointerRatioY * 100).toFixed(2)}%`);

  if (cursorOrb && finePointerQuery.matches) {
    cursorOrb.style.transform = `translate3d(${pointer.currentX.toFixed(1)}px, ${pointer.currentY.toFixed(1)}px, 0)`;
  }

  const deltaX = Math.abs(pointer.targetX - pointer.currentX);
  const deltaY = Math.abs(pointer.targetY - pointer.currentY);

  if (deltaX > 0.2 || deltaY > 0.2) {
    pointerFrame = window.requestAnimationFrame(animatePointer);
  }
}

function requestPointerFrame() {
  if (pointerFrame || reduceMotionQuery.matches) {
    return;
  }

  pointerFrame = window.requestAnimationFrame(animatePointer);
}

function handlePointerMove(event) {
  pointer.targetX = event.clientX;
  pointer.targetY = event.clientY;

  const interactiveTarget = event.target.closest(".essay-paragraph, .essay-quote, .showcase-stage");
  body.classList.toggle("is-focus", Boolean(interactiveTarget));

  requestPointerFrame();
}

function resetPointer() {
  pointer.targetX = getViewportWidth() * 0.5;
  pointer.targetY = getLayoutHeight() * 0.5;
  body.classList.remove("is-focus");
  requestPointerFrame();
}

function createClickBloom(event) {
  if (!clickBlooms) {
    return;
  }

  const bloom = document.createElement("span");
  bloom.className = "click-bloom";
  bloom.style.left = `${event.clientX}px`;
  bloom.style.top = `${event.clientY}px`;

  const ring = document.createElement("span");
  ring.className = "click-bloom-ring";
  bloom.append(ring);

  const sparks = reduceMotionQuery.matches ? 3 : 6;

  for (let index = 0; index < sparks; index += 1) {
    const spark = document.createElement("span");
    spark.className = "click-bloom-spark";
    spark.style.setProperty("--angle", `${index * (360 / sparks)}deg`);
    spark.style.setProperty("--distance", randomBetween(28, 64).toFixed(2));
    bloom.append(spark);
  }

  clickBlooms.append(bloom);
  window.setTimeout(() => bloom.remove(), 1300);
}

function handlePointerDown(event) {
  if (event.button !== 0) {
    return;
  }

  if (event.target.closest("a, button, input, textarea")) {
    return;
  }

  createClickBloom(event);
}

function handleResize() {
  pointer.targetX = getViewportWidth() * 0.5;
  pointer.targetY = getLayoutHeight() * 0.5;
  pointer.currentX = pointer.targetX;
  pointer.currentY = pointer.targetY;

  createStarfield();
  createFloatingSeeds();
  requestMeasure();

  if (cursorOrb && finePointerQuery.matches) {
    cursorOrb.style.transform = `translate3d(${pointer.currentX}px, ${pointer.currentY}px, 0)`;
  }
}

window.addEventListener("scroll", requestMeasure, { passive: true });
window.addEventListener("resize", handleResize);
window.addEventListener("pointermove", handlePointerMove, { passive: true });
window.addEventListener("pointerleave", resetPointer);
window.addEventListener("blur", resetPointer);
window.addEventListener("pointerdown", handlePointerDown);

reduceMotionQuery.addEventListener("change", handleResize);
finePointerQuery.addEventListener("change", handleResize);

createStarfield();
createFloatingSeeds();
handleResize();
requestMeasure();
