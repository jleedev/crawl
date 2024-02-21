export const chunks = function () {
  return Iterator.from(
    function* (it, n = 2) {
      if (!Number.isSafeInteger(n) || n <= 0) throw new TypeError(n);
      it = Iterator.from(it);
      while (true) {
        const a = it.take(n).toArray();
        if (a.length == n) yield a;
        else return a;
      }
    }.apply(this, arguments),
  );
};

export const windows = function () {
  return Iterator.from(
    function* (it, n = 2) {
      if (!Number.isSafeInteger(n) || n <= 0) throw new TypeError(n);
      it = Iterator.from(it);
      let a = it.take(n).toArray();
      if (a.length < n) return a;
      yield a;
      for (const x of it) {
        a = [...a.slice(1), x];
        yield a;
      }
    }.apply(this, arguments),
  );
};

export const zigzagDecode = (n) => (n >> 1) ^ -(n & 1);

export const cyrb53a = function (str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x85ebca77);
    h2 = Math.imul(h2 ^ ch, 0xc2b2ae3d);
  }
  h1 ^= Math.imul(h1 ^ (h2 >>> 15), 0x735a2d97);
  h2 ^= Math.imul(h2 ^ (h1 >>> 15), 0xcaf649a9);
  h1 ^= h2 >>> 16;
  h2 ^= h1 >>> 16;
  return 2097152 * (h2 >>> 0) + (h1 >>> 11);
};
