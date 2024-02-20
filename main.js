const doFetch = async (...request) => {
  const response = await fetch(...request);
  if (!response.ok) throw new Error(response.status);
  return response;
};

const json = async (...request) => (await doFetch(...request)).json();
const arrayBuffer = async (...request) =>
  (await doFetch(...request)).arrayBuffer();

const tilejson = await json(
  "https://d1zqyi8v6vm8p9.cloudfront.net/planet.json",
);

const fetchTile = async (z, x, y) => {
  const url = tilejson.tiles[0]
    .replace("{z}", z)
    .replace("{x}", x)
    .replace("{y}", y);
  return new Uint8Array(await arrayBuffer(url));
};

import { renderInWorker } from "./render.js";

const canvas = Object.assign(document.createElement("canvas"), {
  width: 512,
  height: 512,
});
container.append(canvas);

const loadTile = async (z, x, y) => {
  const key = [z, x, y].join();
  if (tilecache.has(key)) {
    return tilecache.get(key);
  } else {
    tilecache.set(
      key,
      (async () => {
        const tiledata = await fetchTile(z, x, y);
        const imageBitmap = await renderInWorker(tiledata, 512);
        return imageBitmap;
      })(),
    );
    return tilecache.get(key);
  }
};

const redraw = async () => {
  const current = [z, x, y].join();
  const tile = await loadTile(z, x, y);
  if (current !== [z, x, y].join()) return;
  const cx = canvas.getContext("2d");
  cx.clearRect(0, 0, cx.canvas.width, cx.canvas.height);
  cx.drawImage(tile, 0, 0);
};

import { getChildren, getParent, zoomOut } from "./zxy.js";

const tilecache = new Map();
let [z, x, y] = [tilejson.minzoom, 0, 0];
redraw();

import { ZoomController } from "./zoom.js";

// Currently the canvas and the container have the same size
Object.assign(container.style, {
  position: "relative",
  width: "512px",
  height: "512px",
});
const zoomController = new ZoomController({ container });

const boxQuad = (key) =>
  ({
    y: { inset: "0 50% 50% 0" },
    u: { inset: "0 0 50% 50%" },
    b: { inset: "50% 50% 0 0" },
    n: { inset: "50% 0 0 50%" },
  })[key];

const boxFull = () => ({ inset: 0 });

addEventListener("keydown", {
  handleEvent(e) {
    switch (e.key) {
      case "y":
      case "u":
      case "n":
      case "b": {
        if (zoomController.isZooming()) break;
        if (z >= tilejson.maxzoom) break;
        [z, x, y] = getChildren([z, x, y])[e.key];
        loadTile(z, x, y);
        zoomController.animate(boxQuad(e.key), boxFull()).then(redraw);
        break;
      }
      case "<":
        if (zoomController.isZooming()) break;
        if (z <= tilejson.minzoom) break;
        const quad = zoomOut([z, x, y]);
        [z, x, y] = getParent([z, x, y]);
        loadTile(z, x, y);
        zoomController.animate(boxFull(), boxQuad(quad)).then(redraw);
        break;
      default:
        return;
    }
  },
});
