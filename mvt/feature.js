import { ProtoBuf, parsePackedVarint } from "./pb.js";
import { classifyRings, decodeGeometry } from "./geom.js";
import { chunks } from "../util.js";

export const GeomType = Object.freeze({
  __proto__: null,
  UNKNOWN: 0,
  POINT: 1,
  LINESTRING: 2,
  POLYGON: 3,
  [0]: "UNKNOWN",
  [1]: "POINT",
  [2]: "LINESTRING",
  [3]: "POLYGON",
});

function buildProperties(kvs) {
  return Object.create(null, Object.fromEntries(kvs.map(([key, value]) => [key, { value, writable: true, enumerable: true, configurable: true }])));
}

export class Feature extends ProtoBuf {
  id;
  type = GeomType[GeomType.UNKNOWN];
  _geometry = [];
  _tags = [];
  _layer;
  get properties() {
    const layer = this._layer.deref();
    const raw = chunks(this._tags, 2).map(([k, v]) => [layer.keys[k], layer.values[v]]);
    const value = buildProperties(raw);
    Reflect.defineProperty(this, "properties", {
      value,
      configurable: true,
      enumerable: true,
      writable: true,
    });
    delete this._tags;
    return value;
  }
  get geometry() {
    const raw = Iterator.from(this._geometry).flatMap((x) => x);
    const value = [...decodeGeometry(raw)];
    Reflect.defineProperty(this, "geometry", {
      value,
      configurable: true,
      enumerable: true,
      writable: true,
    });
    delete this._geometry;
    return value;
  }
  toGeoJSONGeometry() {
    const pt = ({ x, y }) => [x, y];
    let coordinates, type;
    switch (GeomType[this.type]) {
      case GeomType.POINT:
        type = "Point";
        const points = this.geometry.flat();
        coordinates = points.map(pt);
        break;
      case GeomType.LINESTRING:
        type = "LineString";
        coordinates = this.geometry.map((line) => line.map(pt));
        break;
      case GeomType.POLYGON:
        coordinates = classifyRings(this.geometry).map((polygon) =>
          polygon.map((ring) => ring.map(pt)),
        );
        type = "Polygon";
        break;
      default:
        throw new TypeError(this.type);
    }
    if (coordinates?.length == 1) {
      coordinates = coordinates.flat();
    } else {
      type = "Multi" + type;
    }
    return { type, coordinates };
  }
  toGeoJSONFeature() {
    const feature = {
      type: "Feature",
      geometry: this.toGeoJSONGeometry(),
      properties: this.properties,
    };
    if (this.id !== undefined) feature.id = this.id;
    return feature;
  }
  toGeoJSON() {
    return this.toGeoJSONFeature();
  }
  static Builder = class extends ProtoBuf.Builder {
    static Target = Feature;
    id;
    type = GeomType[GeomType.UNKNOWN];
    _geometry = [];
    _tags = [];
    [1](id) {
      this.id = id;
    }
    [2](tags) {
      this._tags.push(...parsePackedVarint(tags));
    }
    [3](type) {
      this.type = GeomType[type];
    }
    [4](geometry) {
      this._geometry.push(parsePackedVarint(geometry));
    }
  };
}
