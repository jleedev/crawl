import { Tile } from "./tile.js";
import { path as geoPath } from "./path.js";

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

const painter = (context) => {
  const cx = context ?? document.createElement("canvas").getContext("2d");
  const tileSize = 512;
  Object.assign(cx.canvas, { width: tileSize, height: tileSize });
  return {
    get canvas() {
      return cx.canvas;
    },
    layer(layer, cb) {
      try {
        cx.save();
        const scale = tileSize / layer.extent;
        const path = geoPath();
        path.pointRadius(4.5 / scale);
        cx.scale(scale, scale);
        cx.lineWidth = layer.extent / cx.canvas.width;
        for (const feature of layer) {
          const obj = feature.toGeoJSON();
          path.context(new Path2D())(obj);
          try {
            cx.save();
            cb(cx, path.context(), obj);
          } finally {
            cx.restore();
          }
        }
      } finally {
        cx.restore();
      }
    },
  };
};

const paint = painter();
container.append(paint.canvas);

const render = (tile) => {
  const cx = paint.canvas.getContext("2d");
  cx.clearRect(0, 0, cx.canvas.width, cx.canvas.height);
  const layers = Object.values(tile.layers);
  for (const layer of layers) {
    paint.layer(layer, (cx, path, obj) => {
      if (
        !["Point", "MultiPoint", "Polygon", "MultiPolygon"].includes(obj.type)
      )
        return;
      const hue = Math.random() * 360;
      cx.fillStyle = `oklch(50% 100% ${hue} / 0.5)`;
      cx.fill(path);
    });
  }

  for (const layer of layers) {
    paint.layer(layer, (cx, path, obj) => {
      if (
        !["LineString", "MultiLineString", "Polygon", "MultiPolygon"].includes(
          obj.type,
        )
      )
        return;
      const hue = Math.random() * 360;
      cx.strokeStyle = `oklch(50% 100% ${hue} / 0.5)`;
      cx.lineWidth *= 2;
      cx.stroke(path);
    });
  }
};

const loadTile = async (z, x, y) => {
  const key = [z, x, y].join();
  if (tilecache.has(key)) {
    return tilecache.get(key);
  } else {
    const tiledata = await fetchTile(z, x, y);
    const tile = Tile.parseFrom(tiledata);
    tilecache.set(key, tile);
    return tile;
  }
};

const redraw = async () => {
  const tile = await loadTile(z, x, y);
  render(tile);
};

import { getChildren, getParent, zoomOut } from "./zxy.js";

const tilecache = new Map();
let [z, x, y] = [tilejson.minzoom, 0, 0];
redraw();

import { ZoomController } from "./zoom.js";

// Currently the canvas and the container have the same size
Object.assign(
  container.style,
  {
    position: "relative",
    width: "512px",
    height: "512px",
  }
);
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
