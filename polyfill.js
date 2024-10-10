// This is not remotely a good polyfill but it handles what I need

globalThis.Iterator ??= (() => {
  const IteratorPrototype = Reflect.getPrototypeOf(
    Reflect.getPrototypeOf([].values()),
  );
  if (IteratorPrototype.constructor !== Object)
    return IteratorPrototype.constructor;
  const Iterator = function Iterator() {
    if (Iterator === new.target)
      throw new TypeError("Abstract class Iterator not directly constructable");
  };
  Iterator.prototype = IteratorPrototype;
  return Iterator;
})();

Iterator.from ??= function from(x) {
  return x[Symbol.iterator]();
};

Iterator.prototype.map ??= function* map(callbackFn) {
  let index = 0;
  for (const element of this) {
    yield callbackFn(element, index);
    index++;
  }
};

Iterator.prototype.flatMap ??= function* flatMap(callbackFn) {
  let index = 0;
  for (const element of this) {
    for (const value of callbackFn(element, index)) {
      if (typeof value === "string") throw new TypeError();
      yield value;
    }
    index++;
  }
};

Iterator.prototype.reduce ??= function reduce(callbackFn, initialValue) {
  let accumulator = initialValue,
    currentIndex = 0;
  if (arguments.length < 2) {
    const { value, done } = this.next();
    if (done) throw new TypeError();
    accumulator = value;
    currentIndex++;
  }
  for (const currentValue of this) {
    accumulator = callbackFn(accumulator, currentValue, currentIndex);
    currentIndex++;
  }
  return accumulator;
};

Iterator.prototype.take ??= function* take(limit) {
  if (limit < 0) throw new TypeError();
  if (!Number.isInteger(limit) && limit !== Infinity) throw new TypeError();
  if (limit === 0) return;
  for (const value of this) {
    yield value;
    limit--;
    if (limit === 0) break;
  }
};

Iterator.prototype.toArray ??= function toArray() {
  return Array.from(this);
};

Blob.prototype.bytes ??= Request.prototype.bytes ??= Response.prototype.bytes ??= async function bytes(){
  return new Uint8Array(await this.arrayBuffer());
}

Promise.withResolvers ??= function withResolvers() {
  let resolve, reject, promise = new Promise((r, j) => {
      resolve = r;
      reject = j;
  });
  return { promise, resolve, reject };
};
