import { ProtoBuf, parsePackedVarint } from "./pb.js";
import { classifyRings, decodeGeometry } from "./geom.js";

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

export class Feature extends ProtoBuf {
  id = 0;
  type = GeomType[GeomType.UNKNOWN];
  _geometry = [];
  _tags = [];
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
  toGeoJSON() {
    const pt = ({ x, y }) => [x, y];
    let coordinates, type;
    switch (this.type) {
      case GeomType[GeomType.POINT]:
        type = "Point";
        const points = this.geometry.flat();
        coordinates = points.map(pt);
        break;
      case GeomType[GeomType.LINESTRING]:
        type = "LineString";
        coordinates = this.geometry.map((line) => line.map(pt));
        break;
      case GeomType[GeomType.POLYGON]:
        coordinates = classifyRings(this.geometry).map((polygon) =>
          polygon.map((ring) => ring.map(pt)),
        );
        type = "Polygon";
        break;
      default:
        throw new TypeError();
    }
    if (coordinates?.length == 1) {
      coordinates = coordinates.flat();
    } else {
      type = "Multi" + type;
    }
    const geometry = { type, coordinates };
    const feature = {
      type: "Feature",
      geometry,
      properties: this.properties,
    };
    if (this.id) feature.id = this.id;
    return feature;
  }
  static Parser = class {
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
