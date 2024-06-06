import { html } from "htl";
import tilebelt from "@mapbox/tilebelt";

import { renderInWorker } from "./render.js";
import { Tile } from "./mvt/tile.js";
import { ZoomController } from "./zoom.js";
import hilbert from "./hilbert.js";
import { css, dataSize } from "./util.js";
import { TileSource } from "./tile_source.js";

// Currently the canvas and the container have the same size
document.adoptedStyleSheets.push(css`
  :root {
    height: 100%;
    display: grid;
    touch-action: none;
  }
  body {
    margin: 0;
    place-self: center;
    color: ButtonText;
    background: ButtonFace;
  }
  #container {
    background: white;
    position: relative;
  }
  canvas {
    display: block;
    max-width: 100vw;
    max-height: 100vh;
  }
`);

addEventListener("wheel", (e) => e.preventDefault(), { passive: false });

const source = await TileSource.fromTileJSON(
  "https://tile.ourmap.us/data/v3.json",
);

const canvas = /** @type HTMLCanvasElement */ (
  html`<canvas width="512" height="512"></canvas>`
);
container.append(canvas);

const debugMessage = ((ele = document.createElement("div")) => {
  const root = ele.attachShadow({ mode: "open" });
  root.append(document.createElement("slot"));
  root.adoptedStyleSheets.push(css`
    :host {
      background: rgba(255 255 255 / 0.7);
      color: black;
      font-family: monospace;
      margin: 4px;
      position: absolute;
      top: 0;
      transition: all ease-in-out 300ms;
      white-space: pre-wrap;
    }
    :host(:not(:empty)) {
      border: 1px solid;
    }
    :host(:hover) {
      background: rgba(255 255 255 / 1);
      box-shadow:
        1px 1px 1px black,
        2px 2px 1px black;
    }
  `);
  container.append(ele);
  return ele;
})();

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
  const options = Array.from(seenLayers, (d) => [d, !layersDisabled.has(d)]);
  const contents = html`<ol>
    ${options.map(
      ([id, state]) =>
        html`<li class=${state ? "enabled" : "disabled"}>${id}</li>`,
    )}
  </ol>`;
  const dialog = html`<dialog
    ${{
      onkeydown(e) {
        e.stopPropagation();
      },
      onclose() {
        this.remove();
      },
    }}
  >
    ${contents}
  </dialog>`;
  document.body.append(dialog);
  dialog.showModal();
};

const doLoadTile = async (quadKey) => {
  const [x, y, z] = tilebelt.quadkeyToTile(quadKey);
  const tiledata = await source.fetchTile(z, x, y);
  let tile;
  {
    // We can't keep this since we're moving the buffer to the worker
    const tileObj = Tile.parseFrom(tiledata);
    noticeNewLayers(Object.keys(tileObj.layers));
    tile = debug && tileToJson(tileObj);
  }
  const { imageBitmap, duration, byteLength } = await renderInWorker(
    tiledata,
    512,
  );
  return { imageBitmap, duration, byteLength, tile };
};

const getTile = async (quadKey) => {
  if (!tilecache.has(quadKey)) tilecache.set(quadKey, doLoadTile(quadKey));
  return tilecache.get(quadKey);
};

const redraw = async () => {
  const current = tilebelt.tileToQuadkey([x, y, z]);
  const tile = await getTile(current);
  if (current !== tilebelt.tileToQuadkey([x, y, z])) return;
  const cx = canvas.getContext("2d");
  cx.clearRect(0, 0, cx.canvas.width, cx.canvas.height);
  cx.drawImage(tile.imageBitmap, 0, 0);
  window.tile = tile.tile;
  if (debug) {
    debugMessage.textContent = [
      `quadkey ${current}`,
      `hilbert ${hilbert.zxyToTileId(z, x, y)}`,
      `${z}/${x}/${y}`,
      `${+tile.duration.toFixed(1)} ms`,
      dataSize(tile.byteLength),
    ].join("\n");
  }
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
  const [newZ, newX, newY] = parseHash();
  if (
    tilebelt.tileToQuadkey(newX, newY, newZ) === tilebelt.tileToQuadkey(x, y, z)
  )
    return;
  [z, x, y] = [newZ, newX, newY];
  redraw();
});

/**
 * @type {Map<string, Promise<{imageBitmap: ImageBitmap, duration: number, tile}>>}
 */
const tilecache = new Map();
let [z, x, y] = parseHash() ?? [source.minzoom, 0, 0];
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
  if (ev.ctrlKey) return;
  switch (ev.key) {
    case "y":
    case "u":
    case "n":
    case "b": {
      if (zoomController.isZooming()) break;
      if (z >= source.maxzoom) break;
      // console.log(z,x,y,'->');
      [x, y, z] = (([y, u, n, b]) => ({ y, u, n, b })[ev.key])(
        tilebelt.getChildren([x, y, z]),
      );
      // console.log('->',z,x,y);
      setHash();
      getTile(tilebelt.tileToQuadkey([x, y, z]));
      zoomController.animate(boxQuad(ev.key), boxFull()).then(redraw);
      break;
    }
    case "<":
      if (zoomController.isZooming()) break;
      if (z <= source.minzoom) break;
      const quad = [
        ["y", "u"],
        ["b", "n"],
      ][y & 1][x & 1];
      [x, y, z] = tilebelt.getParent([x, y, z]);
      setHash();
      getTile(tilebelt.tileToQuadkey([x, y, z]));
      zoomController.animate(boxFull(), boxQuad(quad)).then(redraw);
      break;
    case "l":
      editLayers();
    default:
      return;
  }
});

canvas.addEventListener("pointermove", function (ev) {
  const { width, height } = this.getBoundingClientRect();
  let xq =
    0 <= ev.offsetX
      ? ev.offsetX <= width / 2
        ? 0
        : ev.offsetX <= width
          ? 1
          : null
      : null;
  let yq =
    0 <= ev.offsetY
      ? ev.offsetY <= height / 2
        ? 0
        : ev.offsetY <= height
          ? 1
          : null
      : null;
  const pointq =
    xq === null || yq === null
      ? null
      : [
          ["y", "u"],
          ["b", "n"],
        ][yq][xq];
  this.dispatchEvent(new GestureEvent("quadmove", { pointq }));
});

class GestureEvent extends Event {
  constructor(type, { pointq, ...options } = {}) {
    super(type, options);
    this.pointq = pointq;
  }
}

canvas.addEventListener("quadmove", function (ev) {
  console.log(ev.pointq);
});

if (!sessionStorage.getItem("hello")) {
  sessionStorage.setItem("hello", true);
  const button = html`<button autofocus>ok</button>`;
  const dialog = html`<dialog
    ${{
      onfocus(e) {
        button.focus();
      },
      onkeydown(e) {
        e.stopPropagation();
      },
      onclose() {
        this.remove();
      },
    }}
  >
    navigate with
    <kbd>y</kbd> <kbd>u</kbd> <kbd>b</kbd> <kbd>n</kbd> <kbd>&lt;</kbd>
    <form method="dialog">${button}</form>
  </dialog>`;
  document.body.append(dialog);
  dialog.showModal();
}
