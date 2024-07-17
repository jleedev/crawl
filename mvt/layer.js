import { ProtoBuf } from "./pb.js";
import { Feature } from "./feature.js";
import { zigzagDecode } from "../util.js";

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
    if (i < 0 || i >= this.length) throw new RangeError(i);
    if (this._features[i] instanceof Feature) return this._features[i];
    const feature = Feature.parseFrom(this._features[i]);
    feature._layer = new WeakRef(this);
    this._features[i] = feature;
    return feature;
  }
  static Builder = class extends ProtoBuf.Builder {
    static Target = Layer;
    keys = [];
    values = [];
    _features = [];
    version = 1;
    extent = 4096;
    [15](version) {
      this.version = Number(version);
    }
    [1](name) {
      this.name = decodeString(name);
    }
    [2](features) {
      this._features.push(features);
    }
    [3](keys) {
      this.keys.push(decodeString(keys));
    }
    [4](values) {
      this.values.push(Value.parseFrom(values).value);
    }
    [5](extent) {
      this.extent = Number(extent);
    }
  };
}

const textDecoder = new TextDecoder();

const decodeString = (buf) => {
  if (!(ArrayBuffer.isView(buf) && buf instanceof Uint8Array))
    throw new TypeError();
  // Check for ascii strings to bypass the magnificently slow TextDecoder
  if (buf.every((b) => b < 128)) {
    return String.fromCharCode(...buf);
  } else {
    return textDecoder.decode(buf);
  }
};

export class Value extends ProtoBuf {
  static Builder = class extends ProtoBuf.Builder {
    static Target = Value;
    [1](string_value) {
      this.value = decodeString(string_value);
    }
    [2](float_value) {
      const { buffer } = Uint32Array.of(float_value);
      [this.value] = new Float32Array(buffer);
    }
    [3](double_value) {
      const { buffer } = BigUint64Array.of(double_value);
      [this.value] = new Float64Array(buffer);
    }
    [4](int_value) {
      const { buffer } = BigUint64Array.of(int_value).buffer;
      [this.value] = new BigInt64Array(buffer);
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
  };
}
