import { ProtoBuf, parsePackedVarint } from "./pb.js";
import { decodeGeometry } from "./geom.js";

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
    switch (this.type) {
      case GeomType[GeomType.POINT]:
        break;
      case GeomType[GeomType.LINESTRING]:
        break;
      case GeomType[GeomType.POLYGON]:
        break;
    }
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
  }
}
