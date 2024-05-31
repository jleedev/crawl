import { Tile } from "./mvt/tile.js";
import { path as geoPath } from "./path.js";
import { cyrb53a } from "./util.js";

onerror = close;

self.addEventListener("message", (event) => handler(event.data));

const handler = ({ tiledata, tileSize, port }) => {
  const tile = Tile.parseFrom(tiledata);
  const canvas = new OffscreenCanvas(tileSize, tileSize);
  const paint = painter(canvas.getContext("2d"));
  const start = performance.now();
  render(paint, tile);
  const end = performance.now();
  const imageBitmap = canvas.transferToImageBitmap();
  const duration = end - start;
  const { byteLength } = tiledata;
  port.postMessage({ imageBitmap, duration, byteLength }, { transfer: [imageBitmap] });
};

const painter = (context) => {
  const cx = context;
  return {
    get canvas() {
      return cx.canvas;
    },
    layer(layer, cb) {
      try {
        cx.save();
        const scale = cx.canvas.width / layer.extent;
        const path = geoPath();
        path.pointRadius(4.5 / scale);
        cx.scale(scale, scale);
        cx.lineWidth = layer.extent / cx.canvas.width;
        for (const feature of layer) {
          const obj = feature.toGeoJSONGeometry();
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

// Colors are random but fixed on each run
// And will also change if the worker happens to die :)
const [seed] = crypto.getRandomValues(new Uint32Array(1));

const render = (paint, tile) => {
  const cx = paint.canvas.getContext("2d");
  cx.clearRect(0, 0, cx.canvas.width, cx.canvas.height);
  const layers = Object.values(tile.layers);
  for (const layer of layers) {
    const hue = cyrb53a(layer.name, seed) % 360;
    const fillStyle = `oklch(50% 100% ${hue} / 0.25)`;
    paint.layer(layer, (cx, path, obj) => {
      if (
        !["Point", "MultiPoint", "Polygon", "MultiPolygon"].includes(
          obj.type,
        )
      )
        return;
      cx.fillStyle = fillStyle;
      cx.fill(path);
    });
  }

  for (const layer of layers) {
    const hue = cyrb53a(layer.name, seed) % 360;
    const strokeStyle = `oklch(50% 100% ${hue} / 0.5)`;
    paint.layer(layer, (cx, path, obj) => {
      if (
        !["LineString", "MultiLineString"].includes(
          obj.type,
        )
      )
        return;
      cx.strokeStyle = strokeStyle;
      cx.lineWidth *= 2;
      cx.stroke(path);
    });
  }
};
