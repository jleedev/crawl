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
console.log(tilejson);

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
document.body.append(paint.canvas);

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
      cx.lineWidth *= 4;
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

const tilecache = new Map();
let [z, x, y] = [tilejson.minzoom, 0, 0];
redraw();

addEventListener("keydown", {
  handleEvent(e) {
    switch (e.key) {
      case "y":
        if (z >= tilejson.maxzoom) break;
        z += 1;
        x = x * 2;
        y = y * 2;
        redraw();
        break;
      case "u":
        if (z >= tilejson.maxzoom) break;
        z += 1;
        x = x * 2 + 1;
        y = y * 2;
        redraw();
        break;
      case "b":
        if (z >= tilejson.maxzoom) break;
        z += 1;
        x = x * 2;
        y = y * 2 + 1;
        redraw();
        break;
      case "n":
        if (z >= tilejson.maxzoom) break;
        z += 1;
        x = x * 2 + 1;
        y = y * 2 + 1;
        redraw();
        break;
      case "<":
        if (z <= tilejson.minzoom) break;
        z -= 1;
        x >>= 1;
        y >>= 1;
        redraw();
        break;
      default:
        return;
    }
  },
});
