export const parseProto = function* (buf) {
  if (!(ArrayBuffer.isView(buf) && buf instanceof Uint8Array))
    throw new TypeError();
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let i = 0;
  const varint = () => {
    let val = 0n,
      shift = 0n,
      b;
    do {
      must(1);
      b = BigInt(buf[i++]);
      val |= (b & 0x7fn) << shift;
      shift += 7n;
    } while (b & 0x80n);
    return val;
  };
  const must = (n) => {
    if (i + n > buf.length) throw new RangeError();
  };
  const read = (n) => {
    must(n);
    const begin = i,
      end = i + n;
    i = end;
    return buf.subarray(begin, end);
  };
  const read4 = () => {
    must(4);
    const value = dv.getUint32(i);
    i += 4;
    return value;
  };
  const read8 = () => {
    must(8);
    const value = dv.getBigUint64(i);
    i += 8;
    return value;
  };
  while (i < buf.length) {
    const tag = varint();
    const field = tag >> 3n;
    let value;
    switch (tag & 0x7n) {
      case 0n: // VARINT
        value = varint();
        break;
      case 1n: // I64
        value = read8();
        break;
      case 2n: // LEN
        value = read(Number(varint()));
        break;
      case 5n: // I32
        value = read4();
        break;
      default:
        throw new ValueError(tag & 0x7n);
    }
    yield { field, value };
  }
};

export const parsePackedVarint = function* (buf) {
  if (!(ArrayBuffer.isView(buf) && buf instanceof Uint8Array)) {
    yield buf;
    return;
  }
  let i = 0;
  const varint = () => {
    let val = 0,
      shift = 0,
      b;
    do {
      if (i >= buf.length) throw new RangeError();
      b = buf[i++];
      val |= (b & 0x7f) << shift;
      shift += 7;
    } while (b & 0x80);
    return val;
  };
  while (i < buf.length) yield varint();
};

export class ProtoBuf {
  constructor() {
    if (new.target === ProtoBuf) throw new TypeError("abstract");
  }
  static Builder = class ProtoBuf_Builder {
    static get Target() {
      throw new TypeError("abstract");
    }
    build() {
      return Object.assign(new this.constructor.Target(), this);
    }
  };
  static parseFrom(buf) {
    const builder = new this.Builder();
    for (const { field, value } of parseProto(buf)) builder[field]?.(value);
    return builder.build();
  }
}
