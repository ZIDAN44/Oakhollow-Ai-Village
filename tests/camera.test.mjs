// The map camera: zooming keeps the point under the cursor still, and the world never leaves the screen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './fake-dom.mjs';
import { newWorld } from './harness.mjs';

installFakeDom();
const { camera, view, resize, zoomAt, panBy, resetCamera, updateCamera, MAX_ZOOM } = await import('../public/src/ui/canvas.js');

// Run the easing until the camera reaches its target.
const settle = () => { for (let i = 0; i < 200; i++) updateCamera(); };
const toWorld = (mx, my) => [(mx - view.ox) / view.scale, (my - view.oy) / view.scale];
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} vs ${b}`);

test('zooming keeps the world point under the cursor in place', () => {
  newWorld(5); resize(); resetCamera(); settle();
  const [wx, wy] = toWorld(300, 250);
  zoomAt(300, 250, 2.5); settle();
  const [wx2, wy2] = toWorld(300, 250);
  close(wx2, wx, 'x'); close(wy2, wy, 'y');
  assert.ok(view.scale > view.fit * 2.4, 'actually zoomed in');
});

test('the camera stays inside the world and within the zoom limits', () => {
  newWorld(5); resize(); resetCamera(); settle();
  panBy(5000, 5000); // fully zoomed out, the whole village stays centred
  close(camera.cx, 600, 'centred x'); close(camera.cy, 400, 'centred y');
  zoomAt(0, 0, 100); settle();
  assert.equal(camera.target.zoom, MAX_ZOOM);
  panBy(99999, 99999);
  assert.ok(view.ox <= 1e-6 && view.oy <= 1e-6, 'the top-left edge of the world does not come on screen');
  panBy(-99999, -99999);
  const [ex, ey] = [view.ox + 1200 * view.scale, view.oy + 800 * view.scale];
  assert.ok(ex >= view.w - 1e-6 && ey >= view.h - 1e-6, 'nor does the bottom-right edge');
});
