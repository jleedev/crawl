import { ProtoBuf } from "./pb.js";
import { Feature } from "./feature.js";
import { chunks, zigzagDecode } from "./util.js";

export class Layer extends ProtoBuf {
  keys = [];
  values = [];
  _features = [];
  version = 1;
  extent = 4096;
  get length() {
    return this._features.length;
  }
  *[Symbol.iterator]() {
    for (const i in this._features) yield this.feature(i);
  }
  feature(i) {
    if (i < 0 || i >= this.length) throw new Error(i);
    let feature = this._features[i];
    if (feature instanceof Feature) return feature;
    feature = Feature.parseFrom(feature);
    feature.properties = Object.fromEntries(
      chunks(feature._tags, 2).map(
        ([k, v]) => [this.keys[k], this.values[v]]));
    this._features[i] = feature;
    return feature;
  }
  static Parser = class {
    [15](version) {
      this.version = version;
    }
    [1](name) {
      this.name = new TextDecoder().decode(name);
    }
    [2](features) {
      this._features.push(features);
    }
    [3](keys) {
      this.keys.push(new TextDecoder().decode(keys));
    }
    [4](values) {
      this.values.push(Value.parseFrom(values));
    }
    [5](extent) {
      this.extent = extent;
    }
  }
}

export class Value extends ProtoBuf {
  static parseFrom(buf) {
    return super.parseFrom(buf).value;
  }
  static Parser = class {
    [1](string_value) {
      this.value = new TextDecoder().decode(string_value);
    }
    [2](float_value) {
      [this.value] = new Float32Array(Uint32Array.of(float_value).buffer);
    }
    [3](double_value) {
      [this.value] = new Float64Array(BigUint64Array.of(double_value).buffer);
    }
    [4](int_value) {
      [this.value] = new BigInt64Array(BigUint64Array.of(int_value).buffer);
    }
    [5](uint_value) {
      this.value = uint_value;
    }
    [6](sint_value) {
      this.value = zigzagDecode(sint_value);
    }
    [7](bool_value) {
      this.value = Boolean(bool_value);
    }
  }
}
