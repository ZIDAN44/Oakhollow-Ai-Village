// Drawing one frame of the world, back to front: board, ground, places, light, weather, then labels and people.
import { sim } from '../core/state.js';
import { ctx, updateCamera, view } from './canvas.js';
import { drawBubbles } from './draw/bubbles.js';
import { drawBoard, drawRoads, drawVignette } from './draw/ground.js';
import { drawLight } from './draw/light.js';
import { drawNameTags, drawNpc } from './draw/people.js';
import { drawLabel, drawPlace } from './draw/places.js';
import { drawWeather } from './draw/weather.js';

export function render() {
  updateCamera();
  drawBoard(); // clips to the board until the restore below
  drawRoads();
  sim.places.forEach(drawPlace);
  drawLight();
  drawWeather();
  drawVignette();
  ctx.restore();

  view.labels = [];
  sim.places.forEach(drawLabel);
  const people = [...sim.npcs].sort((a, b) => a.y - b.y);
  people.forEach(drawNpc);
  drawNameTags(people);
  drawBubbles();
}
