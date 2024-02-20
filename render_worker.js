import { Tile } from "./tile.js";
import { path as geoPath } from "./path.js";

onerror = close;

self.addEventListener("message", (event) => handler(event.data));

const handler = ({ tiledata, tileSize, port }) => {
  const tile = Tile.parseFrom(tiledata);
  const canvas = new OffscreenCanvas(tileSize, tileSize);
  const paint = painter(canvas.getContext("2d"));
  render(paint, tile);
  const imageBitmap = canvas.transferToImageBitmap();
  port.postMessage(imageBitmap, { transfer: [imageBitmap] });
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

const render = (paint, tile) => {
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
