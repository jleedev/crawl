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
