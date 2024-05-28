import { html } from "./htl.js";
import { renderInWorker } from "./render.js";
import { Tile } from "./tile.js";
import { ZoomController } from "./zoom.js";
import { getChildren, getParent, zoomOut } from "./zxy.js";

{
  const sheet = new CSSStyleSheet();
  // Currently the canvas and the container have the same size
  sheet.replaceSync(`
    :root {
      height: 100%; display: grid;
    }
    body {
      margin: 0; place-self: center; color: black; background: silver;
    }
    #container{
      background: white; position: relative; width: 512px; height: 512px;
    }
    canvas {
      position: absolute;
    }`);
  document.adoptedStyleSheets.push(sheet);
}

const doFetch = async (...request) => {
  const response = await fetch(...request);
  if (!response.ok) throw new Error(response.status);
  return response;
};

const json = async (...request) => (await doFetch(...request)).json();
const buffer = async (...request) => (await doFetch(...request)).arrayBuffer();

const tilejson = await json(
  "https://d1zqyi8v6vm8p9.cloudfront.net/planet.json",
);

const fetchTile = async (z, x, y) => {
  const url = tilejson.tiles[0]
    .replace("{z}", z)
    .replace("{x}", x)
    .replace("{y}", y);
  return new Uint8Array(await buffer(url));
};

const canvas = /** @type HTMLCanvasElement */ (html`<canvas width=512 height=512>`);
container.append(canvas);

const tileToJson = (tile) =>
  Object.fromEntries(
    Object.entries(tile.layers).map(([k, v]) => [
      k,
      Array.from(v, (f) => f.toGeoJSON()),
    ]),
  );

// Of course the tilejson should have vector_layers but this is a debugging
// tool anyway.
const seenLayers = new Set();
const layersEnabled = new Set();
const layersDisabled = new Set();

const noticeNewLayers = (ids) => {
  for (const id of ids) {
    if (seenLayers.add(id)) continue;
    seenLayers.add(id);
    if (layersDisabled.has(id)) continue;
    layersEnabled.add(id);
  }
};

const editLayers = () => {
  const options = Array.from(seenLayers, d => [d, !layersDisabled.has(d)]);
  const contents = html`<ol>${options.map(
    ([id, state]) => html`<li class=${state ? "enabled" : "disabled"}>${id}`
  )}`;
  const dialog = html`<dialog ${{
    onkeydown(e) { e.stopPropagation(); },
    onclose() { this.remove(); },
  }}>${contents}`;
  document.body.append(dialog);
  dialog.showModal();
};

const loadTile = async (z, x, y) => {
  const key = [z, x, y].join();
  if (tilecache.has(key)) {
    return tilecache.get(key);
  } else {
    tilecache.set(
      key,
      (async () => {
        const tiledata = await fetchTile(z, x, y);
        // We can't keep this since we're moving the buffer to the worker
        const tileObj = Tile.parseFrom(tiledata);
        noticeNewLayers(Object.keys(tileObj.layers));
        const tile = tileToJson(tileObj);
        const imageBitmap = await renderInWorker(tiledata, 512);
        return { imageBitmap, tile };
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
  cx.drawImage(tile.imageBitmap, 0, 0);
  window.tile = tile.tile;
};

const setHash = () => {
  const hash = `${z}/${x}/${y}`;
  const url = Object.assign(new URL(location), { hash });
  location.replace(url);
};

const parseHash = () => {
  const match = /^#(\d+)\/(\d+)\/(\d+)$/.exec(location.hash);
  return match?.slice(1).map(Number);
};

addEventListener("hashchange", (e) => {
  const newTile = parseHash();
  if (newTile.join() === [z, x, y].join()) return;
  [z, x, y] = newTile;
  redraw();
});

/**
 * @type {Map<string, Promise<{imageBitmap: ImageBitmap, tile}>>}
 */
const tilecache = new Map();
let [z, x, y] = parseHash() ?? [tilejson.minzoom, 0, 0];
setHash();
redraw();

const zoomController = new ZoomController({ container });

/**
 * @typedef {"y"|"u"|"b"|"n"} YUBN
 */

/**
 * @param {YUBN} key
 */
const boxQuad = (key) =>
  ({
    y: { inset: "0 50% 50% 0" },
    u: { inset: "0 0 50% 50%" },
    b: { inset: "50% 50% 0 0" },
    n: { inset: "50% 0 0 50%" },
  })[key];

const boxFull = () => ({ inset: 0 });

addEventListener("keydown", (ev) => {
  switch (ev.key) {
    case "y":
    case "u":
    case "n":
    case "b": {
      if (zoomController.isZooming()) break;
      if (z >= tilejson.maxzoom) break;
      [z, x, y] = getChildren([z, x, y])[ev.key];
      setHash();
      loadTile(z, x, y);
      zoomController.animate(boxQuad(ev.key), boxFull()).then(redraw);
      break;
    }
    case "<":
      if (zoomController.isZooming()) break;
      if (z <= tilejson.minzoom) break;
      const quad = zoomOut([z, x, y]);
      [z, x, y] = getParent([z, x, y]);
      setHash();
      loadTile(z, x, y);
      zoomController.animate(boxFull(), boxQuad(quad)).then(redraw);
      break;
    case "l":
      editLayers();
    default:
      return;
  }
});

canvas.addEventListener("pointermove", function(ev) {
  const { width, height } = this.getBoundingClientRect();
  let xq = 0 <= ev.offsetX ? ev.offsetX <= width / 2 ? 0 : ev.offsetX <= width ? 1 : null : null;
  let yq = 0 <= ev.offsetY ? ev.offsetY <= height / 2 ? 0 : ev.offsetY <= height ? 1 : null : null;
  const pointq = (xq === null || yq === null) ? null : [["y", "u"], ["b", "n"]][yq][xq];
  console.log(pointq);
});

if (!sessionStorage.getItem("hello")) {
  sessionStorage.setItem("hello", true);
  const button = html`<button autofocus>ok</button>`;
  const dialog = html`<dialog ${{
    onfocus(e) { button.focus(); },
    onkeydown(e) { e.stopPropagation(); },
    onclose() { this.remove(); },
  }}>
    navigate with
    <kbd>y</kbd> <kbd>u</kbd> <kbd>b</kbd> <kbd>n</kbd> <kbd>&lt;</kbd>
    <form method="dialog">${button}</form>`;
  document.body.append(dialog);
  dialog.showModal();
}
