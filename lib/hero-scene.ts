import { AmbientLight, DirectionalLight, OrthographicCamera, PMREMGenerator, Scene, WebGLRenderer, type WebGLRenderTarget } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createMascotModel } from './mascot-model';

export function mountHeroScene(host: HTMLElement, stage: HTMLElement, isCurrent: () => boolean) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'low-power' });
  if (!context) throw new Error('The mascot image remains available without WebGL.');
  const renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.debug.onShaderError = () => { throw new Error('The mascot image remains available if a shader fails.'); };
  renderer.setClearColor(0xffffff, 0);
  const scene = new Scene();
  const camera = new OrthographicCamera(-3, 3, 2.55, -2.55, .1, 40);
  camera.position.set(0, 0, 10);
  const model = createMascotModel(), sculpture = model.root;
  scene.add(sculpture, new AmbientLight('#edf4ff', 1.3));
  const key = new DirectionalLight('#ffffff', 2.5);
  key.position.set(-3, 5, 6);
  const rim = new DirectionalLight('#bad8ff', 2);
  rim.position.set(4, 1, -2);
  scene.add(key, rim);

  let environmentMap: WebGLRenderTarget | undefined;
  let closed = false, ready = false, frame = 0, previousTime = 0, visible = true;
  let turn = 0, pointerX = 0, pointerY = 0, progress = 0;
  let x = .025, y = -.14, z = 0;
  let targetX = x, targetY = y, targetZ = z;
  const compact = matchMedia('(max-width: 1024px)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  function targets() {
    const strength = compact.matches ? .45 : 1;
    targetX = .025 + pointerY * .12 + progress * .06 * strength;
    targetY = -.14 + turn * Math.PI / 2 + pointerX * .32 + progress * .4 * strength;
    targetZ = -progress * .035 * strength;
  }
  function draw(time: number) {
    frame = 0;
    if (closed || !ready || !visible || document.hidden) { previousTime = 0; return; }
    const delta = Math.min(50, previousTime ? time - previousTime : 16);
    previousTime = time;
    const blend = 1 - Math.exp(-delta / 140);
    x += (targetX - x) * blend; y += (targetY - y) * blend; z += (targetZ - z) * blend;
    sculpture.rotation.set(x, y, z);
    try { renderer.render(scene, camera); }
    catch { dispose(); return; }
    if (Math.abs(targetX - x) + Math.abs(targetY - y) + Math.abs(targetZ - z) > .0008) frame = requestAnimationFrame(draw);
    else previousTime = 0;
  }
  function invalidate() { if (!closed && ready && visible && !document.hidden && !frame) frame = requestAnimationFrame(draw); }
  function scrolled() {
    const box = stage.getBoundingClientRect();
    visible = box.bottom > 0 && box.top < innerHeight;
    progress = clamp(-box.top / Math.max(box.height, 1), 0, 1);
    targets();
    if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
    invalidate();
  }
  function resize() {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, compact.matches ? 1.25 : 1.5));
    renderer.setSize(width, height, false);
    const halfWidth = Math.max(2.05, 2.28 * width / height);
    const halfHeight = halfWidth * height / width;
    camera.left = -halfWidth; camera.right = halfWidth; camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    scrolled();
  }
  function pointer(event: PointerEvent) {
    if (!finePointer.matches || event.pointerType !== 'mouse') return;
    const box = stage.getBoundingClientRect();
    pointerX = clamp((event.clientX - box.left) / box.width - .5, -.5, .5);
    pointerY = clamp((event.clientY - box.top) / box.height - .5, -.5, .5);
    targets(); invalidate();
  }
  function resetPointer() { pointerX = 0; pointerY = 0; targets(); invalidate(); }
  function visibilityChanged() {
    if (document.hidden) { if (frame) cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
    else scrolled();
  }
  function contextLost(event: Event) { event.preventDefault(); dispose(); }
  const sizeObserver = new ResizeObserver(resize);
  const viewObserver = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) scrolled(); else if (frame) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
  });
  function dispose() {
    if (closed) return;
    closed = true;
    if (frame) cancelAnimationFrame(frame);
    sizeObserver.disconnect(); viewObserver.disconnect();
    window.removeEventListener('scroll', scrolled); window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', visibilityChanged);
    stage.removeEventListener('pointermove', pointer); stage.removeEventListener('pointerleave', resetPointer);
    canvas.removeEventListener('webglcontextlost', contextLost);
    compact.removeEventListener('change', resize);
    if (ready && host.lastElementChild === canvas) delete stage.dataset.renderer;
    model.dispose(); environmentMap?.dispose(); renderer.dispose(); canvas.remove();
  }
  try {
    canvas.addEventListener('webglcontextlost', contextLost);
    const environment = new RoomEnvironment();
    const pmrem = new PMREMGenerator(renderer);
    try { environmentMap = pmrem.fromScene(environment, .06, .1, 100, { size: 128 }); scene.environment = environmentMap.texture; }
    finally { environment.dispose(); pmrem.dispose(); }
    host.appendChild(canvas);
    resize(); x = targetX; y = targetY; z = targetZ; sculpture.rotation.set(x, y, z);
    // This small scene compiles once without an asynchronous polling loop that
    // could outlive a lost context or a superseded mount.
    renderer.compile(scene, camera);
    if (closed || !isCurrent()) { dispose(); return { setTurn: () => {}, dispose }; }
    renderer.render(scene, camera); ready = true; stage.dataset.renderer = 'webgl';
    sizeObserver.observe(stage); viewObserver.observe(stage);
    stage.addEventListener('pointermove', pointer, { passive: true }); stage.addEventListener('pointerleave', resetPointer);
    window.addEventListener('scroll', scrolled, { passive: true }); window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', visibilityChanged);
    compact.addEventListener('change', resize);
    return { setTurn(value: number) { turn = value; targets(); invalidate(); }, dispose };
  } catch (error) { dispose(); throw error; }
}
